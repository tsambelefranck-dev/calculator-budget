import { CircleAlert, Info, MessageSquare, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Chat, type ChatMessage } from '@/components/assistant/chat';
import { ConsentToggle } from '@/components/assistant/consent-toggle';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { PageHeader } from '@/components/ui/page-header';
import { detectInsights } from '@/lib/finance/insights';
import { cn } from '@/lib/utils';
import { requireAppContext } from '@/server/auth/current';
import { deleteConversationAction } from '@/server/actions/assistant';
import { getConversationMessages, listConversations } from '@/server/ai/agent';
import { getAiConfig, isAiConfigured } from '@/server/ai/config';
import { TOOL_DEFS } from '@/server/ai/tools';
import { getQuota } from '@/server/ai/usage';
import { getCategorySpends, getMonthTotals } from '@/server/services/analytics';

export const metadata: Metadata = { title: 'Assistant IA' };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const ctx = await requireAppContext();
  const { c } = await searchParams;
  const configured = isAiConfigured();
  const [conversations, quota] = await Promise.all([listConversations(ctx.user.id), getQuota(ctx.user.id, ctx.user.plan)]);
  let initial: ChatMessage[] = [];
  let activeId: string | null = null;
  if (c && /^[0-9a-f-]{36}$/.test(c)) {
    try {
      const { conversation, messages } = await getConversationMessages(ctx.user.id, c);
      activeId = conversation.id;
      initial = messages.map((m) => ({ id: m.id, role: m.role, content: m.content, tools: [...new Set(m.toolCalls.map((t) => t.name))], status: m.status }));
    } catch {
      activeId = null;
    }
  }
  const toolLabels = Object.fromEntries(TOOL_DEFS.map((t) => [t.name, t.label]));

  let fallbackInsights: ReturnType<typeof detectInsights> = [];
  if (!configured) {
    const [totals, spends] = await Promise.all([getMonthTotals(ctx.user.id, ctx.currentMonth), getCategorySpends(ctx.user.id, ctx.currentMonth, ctx.today)]);
    fallbackInsights = detectInsights({ currency: ctx.currency, income: totals.income, expenses: totals.expenses, debtPayments: totals.debtPayments, categories: spends.spends, partialMonth: spends.partial });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coach financier IA"
        description="Pose tes questions en langage naturel. Le coach consulte tes données (avec ton accord) et s’appuie sur les calculs vérifiés de NexaFi."
        actions={activeId ? <ButtonLink href="/app/assistant" variant="outline">Nouvelle conversation</ButtonLink> : null}
      />
      {!configured ? (
        <Alert tone="warning" title="Assistant IA non configuré sur ce serveur">
          Aucune clé de fournisseur d’IA n’est définie (variable ANTHROPIC_API_KEY). Ci-dessous, l’analyse automatique de tes dépenses, calculée sans IA.
        </Alert>
      ) : (
        <ConsentToggle consent={ctx.user.aiDataConsent} />
      )}
      {configured && quota.remaining <= 0 ? (
        <Alert tone="gold" title="Quota mensuel atteint">
          Tu as utilisé tes {quota.limit} messages du mois. {ctx.user.plan === 'free' ? <Link href="/app/upgrade">Passe à Premium</Link> : 'Le quota se renouvelle le 1er du mois.'}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {configured ? (
          <Chat key={activeId ?? 'new'} conversationId={activeId} initialMessages={initial} enabled={quota.remaining > 0} remaining={quota.remaining} toolLabels={toolLabels} />
        ) : (
          <Card>
            <CardHeader><CardTitle>Analyse automatique (sans IA)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {fallbackInsights.length ? (
                fallbackInsights.map((i) => (
                  <div key={i.id} className="flex gap-3 rounded-xl border p-3">
                    {i.severity === 'alerte' ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical-ink" aria-hidden /> : i.severity === 'attention' ? <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-ink" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0 text-info-ink" aria-hidden />}
                    <div><p className="text-sm font-medium">{i.title}</p><p className="text-sm text-ink-2">{i.message}</p></div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-2">Rien d’anormal détecté ce mois-ci.</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <ButtonLink href="/app/planner" variant="secondary" size="sm">Planifier un revenu</ButtonLink>
                <ButtonLink href="/app/simulator" variant="outline" size="sm">Simulateur</ButtonLink>
                <ButtonLink href="/app/learn" variant="outline" size="sm">Leçons</ButtonLink>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="h-fit">
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="size-4" aria-hidden /> Conversations</CardTitle></CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <p className="text-sm text-ink-2">Aucune conversation.</p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conv) => (
                  <li key={conv.id} className={cn('flex items-center gap-1 rounded-lg', conv.id === activeId && 'bg-primary-soft')}>
                    <Link href={`/app/assistant?c=${conv.id}`} className="min-w-0 flex-1 truncate px-2 py-2 text-sm hover:underline">{conv.title}</Link>
                    <ConfirmButton action={deleteConversationAction} hiddenFields={{ id: conv.id }} label="Supprimer la conversation" />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">Modèle : {getAiConfig().model}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
