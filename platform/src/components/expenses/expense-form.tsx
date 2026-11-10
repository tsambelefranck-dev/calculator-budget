'use client';

import { useActionState, useState } from 'react';
import { CategoryIcon } from '@/components/category-icon';
import { Alert } from '@/components/ui/alert';
import { Field, FieldError, Input, Select, Textarea } from '@/components/ui/field';
import { MoneyInput } from '@/components/ui/money-input';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState, type ActionState } from '@/lib/action-state';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type CurrencyCode } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ExpenseDefaults {
  categoryId?: string;
  amount?: number;
  spentOn?: string;
  label?: string;
  paymentMethod?: string;
  note?: string | null;
}

export function ExpenseForm({
  action,
  categories,
  currency,
  today,
  defaults,
  submitLabel = 'Enregistrer la dépense',
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: CategoryOption[];
  currency: CurrencyCode;
  today: string;
  defaults?: ExpenseDefaults;
  submitLabel?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const [formKey, setFormKey] = useState(0);
  const [categoryId, setCategoryId] = useState(defaults?.categoryId ?? '');
  const [showMore, setShowMore] = useState(Boolean(defaults?.note));
  useActionFeedback(state, {
    onSuccess: () => {
      if (!defaults) {
        setFormKey((k) => k + 1);
        setCategoryId('');
      }
      onSuccess?.();
    },
  });
  const values = state.ok === false ? state.values : undefined;
  const selected = values?.categoryId ?? categoryId;

  return (
    <form key={formKey} action={formAction} className="space-y-5" noValidate>
      {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
      <Field label="Montant" htmlFor="expense-amount" errors={state.errors?.amount}>
        <MoneyInput
          id="expense-amount"
          name="amount"
          currency={currency}
          defaultMinor={defaults?.amount}
          defaultText={values?.amount}
          required
          autoFocus
          className="h-14 text-2xl"
          aria-invalid={Boolean(state.errors?.amount)}
        />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Catégorie</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {categories.map((c) => (
            <label
              key={c.id}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center text-xs font-medium text-ink-2 transition-colors',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40 hover:bg-surface-2',
                selected === c.id && 'border-primary bg-primary-soft text-primary-ink',
              )}
            >
              <input
                type="radio"
                name="categoryId"
                value={c.id}
                checked={selected === c.id}
                onChange={() => setCategoryId(c.id)}
                className="sr-only"
              />
              <CategoryIcon icon={c.icon} color={c.color} size="sm" />
              <span className="line-clamp-1">{c.name}</span>
            </label>
          ))}
        </div>
        <FieldError errors={state.errors?.categoryId ? ['Choisis une catégorie'] : undefined} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Libellé" htmlFor="expense-label" errors={state.errors?.label} optional>
          <Input id="expense-label" name="label" placeholder="Ex. marché, taxi, facture d’eau" defaultValue={values?.label ?? defaults?.label} maxLength={120} />
        </Field>
        <Field label="Date" htmlFor="expense-date" errors={state.errors?.spentOn}>
          <Input id="expense-date" name="spentOn" type="date" required defaultValue={values?.spentOn ?? defaults?.spentOn ?? today} />
        </Field>
      </div>
      <Field label="Moyen de paiement" htmlFor="expense-method">
        <Select id="expense-method" name="paymentMethod" defaultValue={values?.paymentMethod ?? defaults?.paymentMethod ?? 'especes'}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </Select>
      </Field>
      {showMore ? (
        <Field label="Note" htmlFor="expense-note" errors={state.errors?.note} optional>
          <Textarea id="expense-note" name="note" maxLength={500} defaultValue={values?.note ?? defaults?.note ?? ''} />
        </Field>
      ) : (
        <button type="button" onClick={() => setShowMore(true)} className="text-sm font-medium text-primary-ink hover:underline">
          + Ajouter une note
        </button>
      )}
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
