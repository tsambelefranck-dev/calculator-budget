import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { and, asc, desc, eq } from 'drizzle-orm';
import { formatDateLabel } from '@/lib/finance/dates';
import { CURRENCY_META } from '@/lib/finance/money';
import { db } from '@/server/db';
import { aiConversations, aiMessages, type ToolCallRecord } from '@/server/db/schema';
import { NotFoundError } from '@/server/services/errors';
import { AGENT_SYSTEM_PROMPT } from './prompts';
import { ToolInputParseError, type LlmProvider, type TurnUsage } from './provider';
import { executeTool, getToolSchemas, toolLabel, type ToolContext } from './tools';
import { recordUsage } from './usage';

export type AgentEvent =
  | { type: 'start'; conversationId: string }
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string; label: string }
  | { type: 'done'; messageId: string; status: 'ok' | 'refusal' | 'truncated' | 'error' }
  | { type: 'error'; message: string };

const MAX_ITERATIONS = 6;
const MAX_HISTORY_MESSAGES = 16;
const MAX_TOKENS = 16_000;

type BetaBlock = Anthropic.Beta.BetaContentBlock;

/**
 * Après une reprise serveur en cours de réponse (bloc `fallback`), les blocs de raisonnement et
 * d'appel d'outil du modèle qui a refusé ne doivent pas être renvoyés : on ne garde, avant la
 * dernière bascule, que le texte.
 */
export function sanitizeForEcho(content: BetaBlock[]): { echo: BetaBlock[]; executable: Anthropic.Beta.BetaToolUseBlock[] } {
  const lastFallback = content.map((b) => b.type).lastIndexOf('fallback');
  const echo = content.filter((b, index) => index > lastFallback || b.type === 'text' || b.type === 'fallback');
  const executable = content.filter((b, index): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && index > lastFallback);
  return { echo, executable };
}

function contextBlock(ctx: ToolContext): string {
  const meta = CURRENCY_META[ctx.currency];
  return [
    '<contexte_session>',
    `Date du jour : ${formatDateLabel(ctx.today)} (${ctx.today}). Mois en cours : ${ctx.currentMonth}.`,
    `Devise de l'utilisateur : ${ctx.currency} (${meta.symbol}). Les montants des outils sont en ${meta.symbol}.`,
    `Pays : ${ctx.profile.country}. Profil de risque déclaré : ${ctx.profile.riskTolerance}. Revenus : ${ctx.profile.incomeType}.`,
    `Accès aux données financières : ${ctx.consent ? 'autorisé' : 'NON autorisé'}.`,
    '</contexte_session>',
  ].join('\n');
}

async function loadHistory(conversationId: string): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const rows = await db
    .select({ role: aiMessages.role, apiContent: aiMessages.apiContent, status: aiMessages.status })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(desc(aiMessages.createdAt))
    .limit(MAX_HISTORY_MESSAGES);
  const ordered = rows.reverse().filter((r) => r.status !== 'error');
  // L'historique rejoué ne contient que du texte (pas de blocs de raisonnement des tours précédents).
  while (ordered.length && ordered[0]!.role !== 'user') ordered.shift();
  return ordered.map((r) =>
    r.role === 'user'
      ? { role: 'user' as const, content: r.apiContent as Anthropic.Beta.BetaContentBlockParam[] | string }
      : { role: 'assistant' as const, content: String(r.apiContent) },
  );
}

export async function getOrCreateConversation(userId: string, conversationId: string | null, firstMessage: string): Promise<string> {
  if (conversationId) {
    const rows = await db.select({ id: aiConversations.id }).from(aiConversations).where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId))).limit(1);
    if (!rows[0]) throw new NotFoundError('Conversation introuvable.');
    return rows[0].id;
  }
  const title = firstMessage.replace(/\s+/g, ' ').trim().slice(0, 70) || 'Nouvelle conversation';
  const [row] = await db.insert(aiConversations).values({ userId, title }).returning({ id: aiConversations.id });
  return row!.id;
}

export async function listConversations(userId: string) {
  return db.select().from(aiConversations).where(eq(aiConversations.userId, userId)).orderBy(desc(aiConversations.updatedAt)).limit(30);
}

export async function getConversationMessages(userId: string, conversationId: string) {
  const conv = await db.select().from(aiConversations).where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId))).limit(1);
  if (!conv[0]) throw new NotFoundError('Conversation introuvable.');
  const messages = await db
    .select({ id: aiMessages.id, role: aiMessages.role, content: aiMessages.content, toolCalls: aiMessages.toolCalls, status: aiMessages.status, createdAt: aiMessages.createdAt })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt));
  return { conversation: conv[0], messages };
}

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const rows = await db.delete(aiConversations).where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId))).returning({ id: aiConversations.id });
  if (!rows.length) throw new NotFoundError('Conversation introuvable.');
}

/**
 * Un tour de conversation : boucle d'outils manuelle en streaming.
 * Les calculs sont faits par les outils déterministes ; le modèle rédige.
 */
export async function runAgentTurn(params: {
  ctx: ToolContext;
  provider: LlmProvider;
  conversationId: string | null;
  message: string;
  emit: (event: AgentEvent) => void;
  signal?: AbortSignal;
}): Promise<{ conversationId: string; messageId: string }> {
  const { ctx, provider, emit } = params;
  const conversationId = await getOrCreateConversation(ctx.userId, params.conversationId, params.message);
  emit({ type: 'start', conversationId });

  const history = await loadHistory(conversationId);
  const userContent: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: 'text', text: contextBlock(ctx) },
    { type: 'text', text: params.message },
  ];
  await db.insert(aiMessages).values({ conversationId, userId: ctx.userId, role: 'user', content: params.message, apiContent: userContent });

  const messages: Anthropic.Beta.BetaMessageParam[] = [...history, { role: 'user', content: userContent }];
  const tools = getToolSchemas();
  const toolCalls: ToolCallRecord[] = [];
  let displayed = '';
  let status: 'ok' | 'refusal' | 'truncated' | 'error' = 'ok';
  const totalUsage: TurnUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let parseRetries = 0;

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
      let turn;
      try {
        turn = await provider.runTurn({
          system: AGENT_SYSTEM_PROMPT,
          tools,
          messages,
          maxTokens: MAX_TOKENS,
          signal: params.signal,
          onText: (delta) => {
            displayed += delta;
            emit({ type: 'text', delta });
          },
        });
      } catch (error) {
        if (error instanceof ToolInputParseError && parseRetries < 2) {
          parseRetries += 1;
          iteration -= 1;
          continue;
        }
        throw error;
      }
      parseRetries = 0;
      totalUsage.input += turn.usage.input;
      totalUsage.output += turn.usage.output;
      totalUsage.cacheRead += turn.usage.cacheRead;
      totalUsage.cacheWrite += turn.usage.cacheWrite;
      await recordUsage(ctx.userId, 'chat', turn.model, turn.usage);

      if (turn.stopReason === 'refusal') {
        status = 'refusal';
        const notice = displayed ? '\n\n' : '';
        const text = `${notice}Je ne peux pas t’aider sur cette demande. Je reste disponible pour toute question sur ton budget, ton épargne, tes dettes ou l’éducation financière.`;
        displayed += text;
        emit({ type: 'text', delta: text });
        break;
      }

      const { echo, executable } = sanitizeForEcho(turn.content);
      if (executable.length === 0) {
        if (turn.stopReason === 'max_tokens') status = 'truncated';
        break;
      }
      if (turn.stopReason === 'max_tokens') {
        status = 'truncated';
        break;
      }

      messages.push({ role: 'assistant', content: echo as Anthropic.Beta.BetaContentBlockParam[] });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const call of executable) {
        emit({ type: 'tool', name: call.name, label: toolLabel(call.name) });
        const outcome = await executeTool(call.name, call.input, ctx);
        toolCalls.push({ name: call.name, input: call.input, ok: outcome.ok });
        results.push({ type: 'tool_result', tool_use_id: call.id, content: outcome.content, ...(outcome.ok ? {} : { is_error: true }) });
      }
      // Tous les résultats dans un seul message utilisateur (appels parallèles).
      messages.push({ role: 'user', content: results });
      if (iteration === MAX_ITERATIONS - 1) status = 'truncated';
    }
  } catch (error) {
    status = 'error';
    console.error('[ai] échec du tour', error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? 'Le service d’IA est momentanément saturé. Réessaie dans une minute.'
        : error instanceof Anthropic.AuthenticationError
          ? 'Le service d’IA est mal configuré (clé API invalide). Contacte l’administrateur.'
          : 'Une erreur est survenue pendant la réponse. Réessaie.';
    emit({ type: 'error', message });
  }

  const finalText = displayed.trim() || (status === 'truncated' ? 'Ma réponse a été interrompue. Peux-tu reformuler ta question plus précisément ?' : '');
  const [saved] = await db
    .insert(aiMessages)
    .values({
      conversationId,
      userId: ctx.userId,
      role: 'assistant',
      content: finalText || 'Réponse indisponible.',
      apiContent: finalText || 'Réponse indisponible.',
      toolCalls,
      status,
      model: provider.model,
    })
    .returning({ id: aiMessages.id });
  await db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, conversationId));
  emit({ type: 'done', messageId: saved!.id, status });
  return { conversationId, messageId: saved!.id };
}
