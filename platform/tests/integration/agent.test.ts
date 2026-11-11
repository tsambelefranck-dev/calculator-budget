import type Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { runAgentTurn, sanitizeForEcho, type AgentEvent } from '@/server/ai/agent';
import type { LlmProvider, TurnParams, TurnResult } from '@/server/ai/provider';
import { executeTool, getToolSchemas, type ToolContext } from '@/server/ai/tools';
import { getQuota } from '@/server/ai/usage';
import { db } from '@/server/db';
import { aiMessages, aiUsage } from '@/server/db/schema';
import { listCategories } from '@/server/services/categories';
import { createExpense } from '@/server/services/expenses';
import { createIncome } from '@/server/services/incomes';
import { createTestUser } from './helpers';

/** Fournisseur scripté : rejoue des réponses prédéfinies (tests uniquement, jamais exposé dans l'application). */
class ScriptedProvider implements LlmProvider {
  readonly name = 'scripted';
  readonly model = 'claude-opus-5-5';
  calls: TurnParams[] = [];
  constructor(private readonly script: ((params: TurnParams) => TurnResult)[]) {}
  async runTurn(params: TurnParams): Promise<TurnResult> {
    this.calls.push(structuredClone({ ...params, onText: undefined, signal: undefined }));
    const step = this.script[this.calls.length - 1];
    if (!step) throw new Error('script épuisé');
    const result = step(params);
    for (const block of result.content) if (block.type === 'text') params.onText?.(block.text);
    return result;
  }
}

const usage = { input: 1000, output: 200, cacheRead: 3000, cacheWrite: 0 };
const toolUse = (name: string, input: unknown): TurnResult => ({
  content: [{ type: 'tool_use', id: `toolu_${name}`, name, input, caller: { type: 'direct' } } as unknown as Anthropic.Beta.BetaContentBlock],
  stopReason: 'tool_use',
  usage,
  model: 'claude-opus-5-5',
});
const text = (t: string): TurnResult => ({ content: [{ type: 'text', text: t, citations: null } as Anthropic.Beta.BetaContentBlock], stopReason: 'end_turn', usage, model: 'claude-opus-5-5' });

async function setup(consent: boolean) {
  const { user, profile } = await createTestUser();
  const category = (await listCategories()).find((c) => c.code === 'alimentation')!;
  await createIncome(user.id, 'XAF', { sourceId: null, type: 'salaire', amount: 300000, receivedOn: '2026-11-02', label: 'Salaire', note: null });
  await createExpense(user.id, 'XAF', { categoryId: category.id, amount: 85000, spentOn: '2026-11-03', label: 'Restaurant', paymentMethod: 'especes', note: null });
  const ctx: ToolContext = { userId: user.id, profile, currency: 'XAF', today: '2026-11-10', currentMonth: '2026-11', consent };
  return { user, ctx };
}

describe('agent IA', () => {
  it('expose des outils au schéma JSON valide et stable', () => {
    const tools = getToolSchemas();
    expect(tools.length).toBeGreaterThanOrEqual(10);
    for (const t of tools) {
      expect(t.input_schema.type).toBe('object');
      expect(t.eager_input_streaming).toBe(true);
      expect(JSON.stringify(t.input_schema)).not.toContain('$schema');
    }
    expect(JSON.stringify(getToolSchemas())).toBe(JSON.stringify(tools));
  });

  it('exécute les outils sur les données de l’utilisateur avec des chiffres calculés', async () => {
    const { ctx } = await setup(true);
    const overview = await executeTool('get_financial_overview', { month: '2026-11' }, ctx);
    expect(overview.ok).toBe(true);
    const data = JSON.parse(overview.content);
    expect(data.revenus.replace(/\s/g, ' ')).toBe('300 000 FCFA');
    expect(data.depenses.replace(/\s/g, ' ')).toBe('85 000 FCFA');
    const plan = JSON.parse((await executeTool('propose_salary_allocation', { amount: 300000 }, ctx)).content);
    expect(plan.repartition.length).toBeGreaterThan(3);
  });

  it('refuse l’accès aux données sans consentement mais garde les calculateurs', async () => {
    const { ctx } = await setup(false);
    const denied = await executeTool('get_spending_breakdown', {}, ctx);
    expect(denied.ok).toBe(false);
    expect(denied.content).toContain('ACCES_NON_AUTORISE');
    const calc = await executeTool('simulate_savings_goal', { target_amount: 1_000_000, months: 12 }, ctx);
    expect(calc.ok).toBe(true);
    expect(JSON.parse(calc.content).versement_mensuel_necessaire.replace(/\s/g, ' ')).toBe('83 334 FCFA');
  });

  it('valide les entrées des outils', async () => {
    const { ctx } = await setup(true);
    const bad = await executeTool('propose_salary_allocation', { amount: 'beaucoup' }, ctx);
    expect(bad.ok).toBe(false);
    expect(bad.content).toContain('INVALID_JSON');
    expect((await executeTool('outil_inconnu', {}, ctx)).ok).toBe(false);
  });

  it('mène une boucle outil → réponse, persiste la conversation et le coût', async () => {
    const { user, ctx } = await setup(true);
    const provider = new ScriptedProvider([
      () => toolUse('get_spending_breakdown', { month: '2026-11' }),
      (params) => {
        const last = params.messages[params.messages.length - 1]!;
        const result = (last.content as Anthropic.Beta.BetaToolResultBlockParam[])[0]!;
        expect(result.type).toBe('tool_result');
        expect(String(result.content)).toContain('Restaurant');
        return text('Tu as dépensé **85 000 FCFA** en alimentation.');
      },
    ]);
    const events: AgentEvent[] = [];
    const { conversationId } = await runAgentTurn({ ctx, provider, conversationId: null, message: 'Analyse mes dépenses', emit: (e) => events.push(e) });
    expect(events.some((e) => e.type === 'tool' && e.name === 'get_spending_breakdown')).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: 'done', status: 'ok' });
    // Le prompt système et les outils sont identiques entre les appels (préfixe cachable).
    expect(provider.calls[0]!.system).toBe(provider.calls[1]!.system);
    // Le contexte de session est dans le message utilisateur, pas dans le prompt système.
    expect(JSON.stringify(provider.calls[0]!.messages[0])).toContain('<contexte_session>');

    const stored = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId));
    expect(stored.map((m) => m.role).sort()).toEqual(['assistant', 'user']);
    expect(stored.find((m) => m.role === 'assistant')!.toolCalls[0]!.name).toBe('get_spending_breakdown');
    const costs = await db.select().from(aiUsage).where(eq(aiUsage.userId, user.id));
    expect(costs).toHaveLength(2);
    expect(costs[0]!.costMicroUsd).toBe(1000 * 4 + 200 * 20 + Math.round(3000 * 0.2));
    expect((await getQuota(user.id, 'free')).used).toBe(1);

    // Tour suivant : l'historique rejoué ne contient que du texte.
    const provider2 = new ScriptedProvider([() => text('Oui.')]);
    await runAgentTurn({ ctx, provider: provider2, conversationId, message: 'Merci', emit: () => undefined });
    const history = provider2.calls[0]!.messages;
    expect(history).toHaveLength(3);
    expect(history[1]).toEqual({ role: 'assistant', content: 'Tu as dépensé **85 000 FCFA** en alimentation.' });
  });

  it('gère un refus sans exécuter d’outil', async () => {
    const { ctx } = await setup(true);
    const provider = new ScriptedProvider([() => ({ content: [], stopReason: 'refusal', usage, model: 'claude-opus-5-5' })]);
    const events: AgentEvent[] = [];
    await runAgentTurn({ ctx, provider, conversationId: null, message: 'Question hors cadre', emit: (e) => events.push(e) });
    expect(events.at(-1)).toMatchObject({ type: 'done', status: 'refusal' });
  });

  it('n’exécute que les appels d’outils postérieurs à une bascule de modèle', () => {
    const blocks = [
      { type: 'thinking', thinking: '', signature: 'x' },
      { type: 'tool_use', id: 'a', name: 'get_goals', input: {} },
      { type: 'fallback', from: { model: 'm1' }, to: { model: 'm2' } },
      { type: 'tool_use', id: 'b', name: 'get_debts', input: {} },
    ] as unknown as Anthropic.Beta.BetaContentBlock[];
    const { echo, executable } = sanitizeForEcho(blocks);
    expect(executable.map((b) => b.id)).toEqual(['b']);
    expect(echo.map((b) => b.type)).toEqual(['fallback', 'tool_use']);
  });
});
