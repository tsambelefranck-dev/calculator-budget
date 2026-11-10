'use client';

import { ArrowLeft, ArrowRight, CircleCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Meter } from '@/components/ui/meter';
import { MoneyInput } from '@/components/ui/money-input';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  AGE_RANGES,
  COUNTRIES,
  CURRENCIES,
  EMPLOYMENT_LABELS,
  EMPLOYMENT_STATUSES,
  GOAL_TYPES,
  GOAL_TYPE_LABELS,
  HORIZON_LABELS,
  INCOME_TYPES,
  INCOME_TYPE_LABELS,
  INVESTMENT_HORIZONS,
  RISK_LABELS,
  type CurrencyCode,
} from '@/lib/constants';
import { CURRENCY_META, formatMoney } from '@/lib/finance/money';
import { cn } from '@/lib/utils';
import { saveOnboardingAction, type OnboardingState } from '@/server/actions/onboarding';

export interface OnboardingDefaults {
  ageRange?: string;
  country?: string;
  currency?: CurrencyCode;
  employmentStatus?: string;
  incomeType?: string;
  dependents?: number;
  monthlyIncome?: number;
  fixedCharges?: number;
  variableExpenses?: number;
  debtTotal?: number;
  debtMonthlyPayment?: number;
  currentSavings?: number;
  goals?: string[];
  investmentHorizon?: string;
  lossReaction?: number;
  experience?: number;
  riskShare?: number;
}

const STEPS = [
  { title: 'Ta situation', fields: ['ageRange', 'country', 'currency', 'employmentStatus', 'incomeType', 'dependents'] },
  { title: 'Revenus et charges', fields: ['monthlyIncome', 'fixedCharges', 'variableExpenses'] },
  { title: 'Dettes et épargne', fields: ['debtTotal', 'debtMonthlyPayment', 'currentSavings'] },
  { title: 'Tes objectifs', fields: ['goals', 'investmentHorizon'] },
  { title: 'Ton rapport au risque', fields: ['lossReaction', 'experience', 'riskShare'] },
] as const;

const RISK_QUESTIONS = [
  {
    name: 'lossReaction',
    question: 'Ton placement perd 20 % de sa valeur en quelques mois. Que fais-tu ?',
    options: ['Je retire tout pour arrêter les pertes', 'J’attends que ça remonte', 'J’en profite pour investir davantage'],
  },
  {
    name: 'experience',
    question: 'Quelle est ton expérience de l’épargne et de l’investissement ?',
    options: ['Aucune pour l’instant', 'Épargne, tontine, compte bloqué', 'Placements, actions, immobilier ou business'],
  },
  {
    name: 'riskShare',
    question: 'Quelle part de ton épargne accepterais-tu de risquer pour espérer gagner plus ?',
    options: ['Aucune', 'Moins d’un quart', 'Plus d’un quart'],
  },
] as const;

const initial: OnboardingState = {};

function RadioCards({ name, options, defaultValue }: { name: string; options: readonly string[]; defaultValue?: number }) {
  return (
    <div className="grid gap-2">
      {options.map((label, index) => (
        <label
          key={label}
          className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-surface-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary-ink"
        >
          <input type="radio" name={name} value={index} defaultChecked={defaultValue === index} className="size-4 accent-[var(--primary)]" required />
          {label}
        </label>
      ))}
    </div>
  );
}

export function OnboardingWizard({ defaults, userName }: { defaults: OnboardingDefaults; userName: string }) {
  const [state, action] = useActionState(saveOnboardingAction, initial);
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>(defaults.currency ?? 'XAF');
  const [stepError, setStepError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.errors) return;
    const firstField = Object.keys(state.errors)[0];
    const index = STEPS.findIndex((s) => (s.fields as readonly string[]).includes(firstField ?? ''));
    if (index >= 0) setStep(index);
  }, [state]);

  const validateStep = (): boolean => {
    const form = formRef.current;
    if (!form) return true;
    const container = form.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const required = Array.from(container?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[required]') ?? []);
    for (const element of required) {
      if (element instanceof HTMLInputElement && element.type === 'radio') {
        if (!form.querySelector(`input[name="${element.name}"]:checked`)) {
          setStepError('Réponds à toutes les questions pour continuer.');
          return false;
        }
      } else if (!element.value.trim()) {
        setStepError('Complète les champs obligatoires pour continuer.');
        element.focus();
        return false;
      }
    }
    setStepError(null);
    return true;
  };

  if (state.ok && state.result) {
    const r = state.result;
    const money = (v: number) => formatMoney(v, currency);
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="space-y-2 text-center">
          <Badge tone="gold" className="mx-auto">
            <Sparkles className="size-3.5" aria-hidden /> Diagnostic terminé
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ton profil : {r.profileLabel}</h1>
          <p className="mx-auto max-w-xl text-ink-2">{r.profileDescription}</p>
        </div>
        <Card>
          <CardContent className="grid gap-6 pt-5 sm:grid-cols-3 sm:pt-6">
            <div className="space-y-2">
              <p className="text-sm text-ink-2">Santé financière</p>
              <p className="text-3xl font-semibold">{r.health.score ?? '—'}<span className="text-base text-muted">/100</span></p>
              <Meter value={r.health.score ?? 0} max={100} label="Score de santé financière" tone="ok" showStatus={false} />
              <p className="text-sm font-medium">{r.health.label}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-ink-2">Marge mensuelle estimée</p>
              <p className={cn('text-2xl font-semibold', r.metrics.monthlyMargin < 0 && 'text-critical-ink')}>{money(r.metrics.monthlyMargin)}</p>
              <p className="text-xs text-muted">Revenus − charges − dépenses − remboursements</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-ink-2">Profil de risque</p>
              <p className="text-2xl font-semibold">{RISK_LABELS[r.risk.tolerance]}</p>
              <p className="text-xs text-muted">Score {r.risk.score}/8</p>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="space-y-3 pt-5 sm:pt-6">
              <p className="font-semibold">Tes points forts</p>
              {r.strengths.length ? (
                r.strengths.map((s) => (
                  <p key={s} className="flex gap-2 text-sm text-ink-2">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-good-ink" aria-hidden /> {s}
                  </p>
                ))
              ) : (
                <p className="text-sm text-ink-2">Tu poses les bases : chaque petit progrès comptera.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 pt-5 sm:pt-6">
              <p className="font-semibold">Points de vigilance</p>
              {r.watchPoints.length ? (
                r.watchPoints.map((s) => (
                  <p key={s} className="flex gap-2 text-sm text-ink-2">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-ink" aria-hidden /> {s}
                  </p>
                ))
              ) : (
                <p className="text-sm text-ink-2">Aucun point d’alerte majeur.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="space-y-3 pt-5 sm:pt-6">
            <p className="font-semibold">Tes 3 priorités</p>
            <ol className="space-y-3">
              {r.priorities.map((p, i) => (
                <li key={p.title} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-ink">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-sm text-ink-2">{p.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <ButtonLink href="/app" size="lg" className="w-full">
          Accéder à mon tableau de bord <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    );
  }

  const errors = state.errors ?? {};
  const v = state.values;
  const money = (name: keyof OnboardingDefaults, label: string, hint?: string, required = true) => (
    <Field label={label} htmlFor={name} hint={hint} errors={errors[name]}>
      <MoneyInput
        key={`${name}-${currency}`}
        id={name}
        name={name}
        currency={currency}
        defaultMinor={defaults[name] as number | undefined}
        defaultText={v?.[name]}
        required={required}
        aria-invalid={Boolean(errors[name])}
      />
    </Field>
  );

  return (
    <form ref={formRef} action={action} className="space-y-6" noValidate>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-accent-ink">
            Étape {step + 1} sur {STEPS.length}
          </span>
          <span className="text-muted">≈ 3 minutes</span>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s.title} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-surface-3')} />
          ))}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{step === 0 ? `Bienvenue ${userName} ! ` : ''}{STEPS[step]!.title}</h1>
      </div>

      {state.ok === false && state.message ? <Alert tone="critical">{state.message}</Alert> : null}
      {stepError ? <Alert tone="warning">{stepError}</Alert> : null}

      <div data-step="0" className={cn('space-y-4', step !== 0 && 'hidden')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tranche d’âge" htmlFor="ageRange" errors={errors.ageRange}>
            <Select id="ageRange" name="ageRange" required defaultValue={v?.ageRange ?? defaults.ageRange ?? ''}>
              <option value="" disabled>Choisir…</option>
              {AGE_RANGES.map((a) => (
                <option key={a} value={a}>{a === '55+' ? '55 ans et plus' : `${a} ans`}</option>
              ))}
            </Select>
          </Field>
          <Field label="Pays de résidence" htmlFor="country" errors={errors.country}>
            <Select
              id="country"
              name="country"
              required
              defaultValue={v?.country ?? defaults.country ?? ''}
              onChange={(e) => {
                const c = COUNTRIES.find((x) => x.code === e.target.value);
                if (c && !defaults.currency) setCurrency(c.currency);
              }}
            >
              <option value="" disabled>Choisir…</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Devise principale" htmlFor="currency" errors={errors.currency}>
            <Select id="currency" name="currency" required value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{CURRENCY_META[c].label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Situation professionnelle" htmlFor="employmentStatus" errors={errors.employmentStatus}>
            <Select id="employmentStatus" name="employmentStatus" required defaultValue={v?.employmentStatus ?? defaults.employmentStatus ?? ''}>
              <option value="" disabled>Choisir…</option>
              {EMPLOYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{EMPLOYMENT_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tes revenus sont…" htmlFor="incomeType" errors={errors.incomeType}>
            <Select id="incomeType" name="incomeType" required defaultValue={v?.incomeType ?? defaults.incomeType ?? ''}>
              <option value="" disabled>Choisir…</option>
              {INCOME_TYPES.map((t) => (
                <option key={t} value={t}>{INCOME_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Personnes à ta charge" htmlFor="dependents" errors={errors.dependents} hint="Enfants, parents, proches que tu soutiens régulièrement.">
            <Input id="dependents" name="dependents" type="number" min={0} max={50} inputMode="numeric" defaultValue={v?.dependents ?? defaults.dependents ?? 0} />
          </Field>
        </div>
      </div>

      <div data-step="1" className={cn('space-y-4', step !== 1 && 'hidden')}>
        <p className="text-sm text-ink-2">Des montants approximatifs suffisent : tu affineras ensuite avec tes vraies dépenses.</p>
        {money('monthlyIncome', 'Revenu mensuel moyen (net)', 'Salaire + revenus complémentaires réguliers.')}
        {money('fixedCharges', 'Charges fixes mensuelles', 'Loyer, électricité, eau, internet, transport régulier, scolarité…')}
        {money('variableExpenses', 'Dépenses variables mensuelles', 'Alimentation, sorties, famille, imprévus…')}
      </div>

      <div data-step="2" className={cn('space-y-4', step !== 2 && 'hidden')}>
        {money('debtTotal', 'Total de tes dettes et crédits', 'Indique 0 si tu n’as aucune dette.')}
        {money('debtMonthlyPayment', 'Remboursements mensuels', 'Total de tes mensualités.')}
        {money('currentSavings', 'Épargne actuelle disponible', 'Argent mis de côté (compte, Mobile Money, tontine récupérable…).')}
        <Alert tone="info">NexaFi ne te demandera jamais tes codes PIN ou identifiants bancaires.</Alert>
      </div>

      <div data-step="3" className={cn('space-y-5', step !== 3 && 'hidden')}>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Quels sont tes objectifs ? (plusieurs choix possibles)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {GOAL_TYPES.filter((g) => g !== 'autre').map((g) => (
              <label key={g} className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm hover:bg-surface-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input type="checkbox" name="goals" value={g} defaultChecked={defaults.goals?.includes(g)} className="size-4 accent-[var(--primary)]" />
                {GOAL_TYPE_LABELS[g]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Horizon d’investissement" htmlFor="investmentHorizon" errors={errors.investmentHorizon} hint="Dans combien de temps pourrais-tu avoir besoin de l’argent investi ?">
          <Select id="investmentHorizon" name="investmentHorizon" required defaultValue={v?.investmentHorizon ?? defaults.investmentHorizon ?? ''}>
            <option value="" disabled>Choisir…</option>
            {INVESTMENT_HORIZONS.map((h) => (
              <option key={h} value={h}>{HORIZON_LABELS[h]}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div data-step="4" className={cn('space-y-6', step !== 4 && 'hidden')}>
        {RISK_QUESTIONS.map((q) => (
          <fieldset key={q.name} className="space-y-2">
            <legend className="text-sm font-medium">{q.question}</legend>
            <RadioCards name={q.name} options={q.options} defaultValue={defaults[q.name]} />
          </fieldset>
        ))}
        <label className="flex items-start gap-3 rounded-xl bg-primary-soft px-4 py-3 text-sm">
          <input type="checkbox" name="createEmergencyGoal" defaultChecked className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span>
            <span className="font-medium">Créer mon objectif « Fonds d’urgence » (recommandé)</span>
            <span className="block text-ink-2">Montant cible calculé à partir de tes dépenses ; ton épargne actuelle y sera comptée.</span>
          </span>
        </label>
      </div>

      <div className="flex gap-3">
        {step > 0 ? (
          <Button variant="outline" size="lg" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="size-4" aria-hidden /> Retour
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button size="lg" className="flex-1" onClick={() => validateStep() && setStep((s) => s + 1)}>
            Continuer <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <SubmitButton size="lg" className="flex-1" pendingLabel="Analyse en cours…">
            Voir mon diagnostic
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
