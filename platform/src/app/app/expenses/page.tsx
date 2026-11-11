import { Receipt, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RankedBars } from '@/components/charts/ranked-bars';
import { CategoryIcon } from '@/components/category-icon';
import { AddExpenseButton, EditExpenseButton } from '@/components/expenses/expense-buttons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select } from '@/components/ui/field';
import { MonthSwitcher, resolveMonth } from '@/components/ui/month-switcher';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { formatDateLabel, formatMonthLabel } from '@/lib/finance/dates';
import { formatMoney, formatPercent } from '@/lib/finance/money';
import { requireAppContext } from '@/server/auth/current';
import { deleteExpenseAction } from '@/server/actions/finance';
import { getCategorySpends } from '@/server/services/analytics';
import { listCategories } from '@/server/services/categories';
import { listExpenses } from '@/server/services/expenses';

export const metadata: Metadata = { title: 'Dépenses' };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string; category?: string; q?: string }> }) {
  const ctx = await requireAppContext();
  const params = await searchParams;
  const month = resolveMonth(params.month, ctx.currentMonth);
  const categoryFilter = params.category && /^[0-9a-f-]{36}$/.test(params.category) ? params.category : undefined;
  const search = params.q?.trim().slice(0, 60) || undefined;
  const [categories, expenses, spends] = await Promise.all([
    listCategories(),
    listExpenses(ctx.user.id, month, { categoryId: categoryFilter, search }),
    getCategorySpends(ctx.user.id, month, ctx.today),
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const options = categories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.nameFr, icon: c.icon, color: c.color }));
  const money = (v: number) => formatMoney(v, ctx.currency);
  const total = spends.spends.reduce((s, c) => s + c.current, 0);
  const previous = spends.spends.reduce((s, c) => s + c.previous, 0);
  const nonEssential = spends.spends.filter((c) => !c.isEssential).reduce((s, c) => s + c.current, 0);
  const listed = expenses.reduce((s, e) => s + e.amount, 0);

  const groups = new Map<string, typeof expenses>();
  for (const e of expenses) groups.set(e.spentOn, [...(groups.get(e.spentOn) ?? []), e]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        description="Chaque dépense enregistrée rend tes analyses plus justes. Les petites dépenses comptent aussi !"
        actions={<AddExpenseButton categories={options} currency={ctx.currency} today={ctx.today} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label={`Total ${formatMonthLabel(month).toLowerCase()}`}
          value={money(total)}
          delta={
            previous > 0
              ? {
                  label: `${formatPercent((total - previous) / previous, 'fr-FR', 0, true)} ${spends.partial ? 'vs même période du mois dernier' : 'vs mois précédent'}`,
                  direction: total > previous ? 'up' : total < previous ? 'down' : 'flat',
                  tone: total > previous ? 'bad' : total < previous ? 'good' : 'neutral',
                }
              : null
          }
        />
        <StatTile label="Dépenses non essentielles" value={money(nonEssential)} hint="Loisirs, shopping, abonnements, autres" />
        <StatTile label="Nombre d’opérations" value={String(expenses.length)} hint={categoryFilter || search ? 'Selon les filtres actifs' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Opérations</CardTitle>
              <MonthSwitcher month={month} currentMonth={ctx.currentMonth} basePath="/app/expenses" />
            </div>
            <form className="flex flex-col gap-2 sm:flex-row" role="search">
              <input type="hidden" name="month" value={month} />
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <Input name="q" defaultValue={search} placeholder="Rechercher un libellé" className="pl-9" aria-label="Rechercher" />
              </div>
              <Select name="category" defaultValue={categoryFilter ?? ''} aria-label="Filtrer par catégorie" className="sm:w-48">
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameFr}</option>
                ))}
              </Select>
              <Button type="submit" variant="outline">Filtrer</Button>
            </form>
            {categoryFilter || search ? (
              <p className="text-sm text-ink-2">
                {money(listed)} pour ces filtres · <Link href={`/app/expenses?month=${month}`} className="font-medium text-primary-ink underline">Effacer les filtres</Link>
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <EmptyState icon={Receipt} title="Aucune dépense" description="Utilise le bouton « + » pour enregistrer une dépense en quelques secondes." />
            ) : (
              <div className="space-y-5">
                {[...groups.entries()].map(([date, items]) => (
                  <section key={date} aria-label={formatDateLabel(date)}>
                    <div className="mb-1 flex justify-between text-xs font-medium text-muted">
                      <span>{formatDateLabel(date)}</span>
                      <span className="tabular">{money(items.reduce((s, e) => s + e.amount, 0))}</span>
                    </div>
                    <ul className="divide-y rounded-xl border">
                      {items.map((e) => {
                        const c = byId.get(e.categoryId);
                        return (
                          <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                            <CategoryIcon icon={c?.icon ?? ''} color={c?.color} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{e.label}</p>
                              <p className="truncate text-xs text-muted">{c?.nameFr} · {PAYMENT_METHOD_LABELS[e.paymentMethod]}</p>
                            </div>
                            <p className="text-sm font-semibold tabular">−{money(e.amount)}</p>
                            <EditExpenseButton
                              id={e.id}
                              categories={options}
                              currency={ctx.currency}
                              today={ctx.today}
                              defaults={{ categoryId: e.categoryId, amount: e.amount, spentOn: e.spentOn, label: e.label, paymentMethod: e.paymentMethod, note: e.note }}
                            />
                            <ConfirmButton action={deleteExpenseAction} hiddenFields={{ id: e.id }} label="Supprimer la dépense" description={`Supprimer « ${e.label} » (${money(e.amount)}) ?`} />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Répartition</CardTitle>
            <CardDescription>Par catégorie, du plus gros poste au plus petit.</CardDescription>
          </CardHeader>
          <CardContent>
            {total > 0 ? (
              <RankedBars items={spends.spends.map((c) => ({ label: c.name, value: c.current }))} currency={ctx.currency} total={total} max={8} />
            ) : (
              <p className="text-sm text-ink-2">Rien à afficher pour ce mois.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
