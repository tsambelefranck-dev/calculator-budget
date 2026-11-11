'use client';

import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { CurrencyCode } from '@/lib/constants';
import { createExpenseAction, updateExpenseAction } from '@/server/actions/finance';
import { ExpenseForm, type CategoryOption, type ExpenseDefaults } from './expense-form';

export function AddExpenseButton({ categories, currency, today }: { categories: CategoryOption[]; currency: CurrencyCode; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Ajouter une dépense
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nouvelle dépense">
        <ExpenseForm action={createExpenseAction} categories={categories} currency={currency} today={today} onSuccess={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

export function EditExpenseButton({
  id,
  categories,
  currency,
  today,
  defaults,
}: {
  id: string;
  categories: CategoryOption[];
  currency: CurrencyCode;
  today: string;
  defaults: ExpenseDefaults;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Modifier la dépense">
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Modifier la dépense">
        <ExpenseForm
          action={updateExpenseAction.bind(null, id)}
          categories={categories}
          currency={currency}
          today={today}
          defaults={defaults}
          submitLabel="Enregistrer les modifications"
          onSuccess={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
