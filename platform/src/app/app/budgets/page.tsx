import type { Metadata } from 'next';
import { BudgetRow, CopyBudgetsButton } from '@/components/budgets/budget-row';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Meter } from '@/components/ui/meter';
import { MonthSwitcher, resolveMonth } from '@/components/ui/month-switcher';
import { PageHeader } from '@/components/ui/page-header';
import { formatMonthLabel } from '@/lib/finance/dates';
import { formatMoney } from '@/lib/finance/money';
import { requireAppContext } from '@/server/auth/current';
import { getCategorySpends } from '@/server/services/analytics';
import { getBudgetOverview } from '@/server/services/budgets';

export const metadata: Metadata = { title: 'Budgets' };

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const ctx = await requireAppContext();
  const month = resolveMonth((await searchParams).month, ctx.currentMonth);
  const [overview, spends] = await Promise.all([getBudgetOverview(ctx.user.id, month), getCategorySpends(ctx.user.id, month, ctx.today)]);
  const averages = new Map(spends.spends.map((s) => [s.categoryId, s.average3]));
  const money = (v: number) => formatMoney(v, ctx.currency);
  const budgeted = overview.lines.filter((l) => l.budget);
  const others = overview.lines.filter((l) => !l.budget);
  const exceeded = budgeted.filter((l) => l.spent > (l.budget?.amount ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Un plafond par catégorie. Tu reçois une alerte à 80 % et en cas de dépassement."
        actions={
          <>
            <CopyBudgetsButton month={month} />
            <ButtonLink href="/app/planner" variant="secondary">Créer depuis le planificateur</ButtonLink>
          </>
        }
      />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:pt-6">
          <div className="flex-1 space-y-2">
            <p className="text-sm text-ink-2">Total des catégories budgétées · {formatMonthLabel(month).toLowerCase()}</p>
            <p className="text-2xl font-semibold tabular">{money(overview.totalSpentBudgeted)} <span className="text-base font-normal text-muted">/ {money(overview.totalBudget)}</span></p>
            {overview.totalBudget > 0 ? <Meter value={overview.totalSpentBudgeted} max={overview.totalBudget} label="Budget total" /> : null}
          </div>
          <MonthSwitcher month={month} currentMonth={ctx.currentMonth} basePath="/app/budgets" />
        </CardContent>
      </Card>
      {exceeded.length > 0 ? (
        <Alert tone="critical" title={`${exceeded.length} budget(s) dépassé(s)`}>
          {exceeded.map((l) => `${l.category.nameFr} (+${money(l.spent - (l.budget?.amount ?? 0))})`).join(' · ')}
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Catégories budgétées</CardTitle>
            <CardDescription>{budgeted.length ? `${budgeted.length - exceeded.length}/${budgeted.length} dans les clous` : 'Aucun budget pour ce mois.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {budgeted.length ? (
              <ul className="divide-y">
                {budgeted.map((l) => (
                  <BudgetRow key={l.category.id} categoryId={l.category.id} name={l.category.nameFr} icon={l.category.icon} color={l.category.color} month={month} budget={l.budget!.amount} spent={l.spent} average={averages.get(l.category.id) ?? null} currency={ctx.currency} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">Définis un budget dans la liste de droite, copie ceux du mois précédent, ou laisse le planificateur les calculer à partir de ton salaire.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sans budget</CardTitle>
            <CardDescription>La moyenne des 3 derniers mois t’aide à fixer un plafond réaliste.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {others.filter((l) => l.category.isActive).map((l) => (
                <BudgetRow key={l.category.id} categoryId={l.category.id} name={l.category.nameFr} icon={l.category.icon} color={l.category.color} month={month} budget={null} spent={l.spent} average={averages.get(l.category.id) ?? null} currency={ctx.currency} />
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
