import { z } from 'zod';
import {
  AGE_RANGES,
  COUNTRY_CODES,
  CURRENCIES,
  DEBT_TYPES,
  EMPLOYMENT_STATUSES,
  GOAL_TYPES,
  INCOME_SOURCE_TYPES,
  INCOME_TYPES,
  INVESTMENT_DOMAIN_SLUGS,
  INVESTMENT_HORIZONS,
  PAYMENT_METHODS,
  type CurrencyCode,
} from '@/lib/constants';
import {
  amountSchema,
  checkboxSchema,
  dateKeySchema,
  monthKeySchema,
  optionalAmountSchema,
  optionalText,
  ratePercentToBpSchema,
  requiredText,
  uuidSchema,
} from './common';

const MIN_DATE = '2000-01-01';
const boundedDate = dateKeySchema.refine((d) => d >= MIN_DATE && d <= '2100-12-31', 'Date hors limites');
const optionalDate = z
  .union([z.literal(''), z.undefined(), z.null(), boundedDate])
  .transform((v) => (v ? v : null));
const optionalUuid = z
  .union([z.literal(''), z.undefined(), z.null(), uuidSchema])
  .transform((v) => (v ? v : null));
const optionalDay = z
  .union([z.literal(''), z.undefined(), z.null(), z.coerce.number().int('Jour invalide').min(1, 'Entre 1 et 31').max(31, 'Entre 1 et 31')])
  .transform((v) => (v === '' || v === undefined || v === null ? null : v));

export const expenseSchema = (currency: CurrencyCode) =>
  z.object({
    categoryId: uuidSchema.describe('Catégorie'),
    amount: amountSchema(currency),
    spentOn: boundedDate,
    label: z.string().trim().max(120, '120 caractères maximum').optional().transform((v) => v ?? ''),
    paymentMethod: z.enum(PAYMENT_METHODS).default('especes'),
    note: optionalText(500),
  });

export const incomeSchema = (currency: CurrencyCode) =>
  z.object({
    sourceId: optionalUuid,
    type: z.enum(INCOME_SOURCE_TYPES),
    amount: amountSchema(currency),
    receivedOn: boundedDate,
    label: z.string().trim().max(120, '120 caractères maximum').optional().transform((v) => v ?? ''),
    note: optionalText(500),
  });

export const incomeSourceSchema = (currency: CurrencyCode) =>
  z.object({
    name: requiredText('Le nom', 80),
    type: z.enum(INCOME_SOURCE_TYPES),
    isFixed: checkboxSchema,
    expectedAmount: optionalAmountSchema(currency),
    recurrence: z.enum(['none', 'monthly']).default('monthly'),
    payDay: optionalDay,
    isActive: checkboxSchema.optional(),
  });

export const budgetSchema = (currency: CurrencyCode) =>
  z.object({
    categoryId: uuidSchema,
    month: monthKeySchema,
    amount: amountSchema(currency, { allowZero: true }),
  });

export const goalSchema = (currency: CurrencyCode) =>
  z.object({
    name: requiredText('Le nom', 80),
    type: z.enum(GOAL_TYPES),
    targetAmount: amountSchema(currency, { label: 'Le montant cible' }),
    targetDate: optionalDate,
    plannedMonthly: optionalAmountSchema(currency),
    initialAmount: optionalAmountSchema(currency),
  });

export const contributionSchema = (currency: CurrencyCode) =>
  z.object({
    goalId: uuidSchema,
    amount: amountSchema(currency),
    contributedOn: boundedDate,
    withdrawal: checkboxSchema,
    note: optionalText(200),
  });

export const debtSchema = (currency: CurrencyCode) =>
  z.object({
    name: requiredText('Le nom', 80),
    type: z.enum(DEBT_TYPES),
    lender: optionalText(80),
    principal: amountSchema(currency, { label: 'Le montant emprunté' }),
    initialBalance: amountSchema(currency, { allowZero: true, label: 'Le capital restant dû' }),
    annualRate: ratePercentToBpSchema,
    minimumPayment: amountSchema(currency, { allowZero: true, label: 'La mensualité' }),
    dueDay: optionalDay,
    startDate: optionalDate,
  });

export const debtPaymentSchema = (currency: CurrencyCode) =>
  z.object({
    debtId: uuidSchema,
    amount: amountSchema(currency),
    paidOn: boundedDate,
    note: optionalText(200),
  });

export const investmentSchema = (currency: CurrencyCode) =>
  z.object({
    name: requiredText('Le nom', 80),
    domain: z.enum(INVESTMENT_DOMAIN_SLUGS),
    amount: amountSchema(currency, { label: 'Le montant investi' }),
    movedOn: boundedDate,
    currentValue: optionalAmountSchema(currency),
    note: optionalText(300),
  });

export const investmentMovementSchema = (currency: CurrencyCode) =>
  z.object({
    investmentId: uuidSchema,
    amount: amountSchema(currency),
    movedOn: boundedDate,
    withdrawal: checkboxSchema,
    note: optionalText(200),
  });

const riskAnswer = z.coerce.number().int().min(0).max(2).transform((v) => v as 0 | 1 | 2);

export const onboardingBaseSchema = z.object({
  ageRange: z.enum(AGE_RANGES, { error: 'Choisis ta tranche d’âge' }),
  country: z.enum(COUNTRY_CODES, { error: 'Choisis ton pays' }),
  currency: z.enum(CURRENCIES, { error: 'Choisis ta devise' }),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES, { error: 'Choisis ta situation' }),
  incomeType: z.enum(INCOME_TYPES, { error: 'Choisis le type de revenus' }),
  investmentHorizon: z.enum(INVESTMENT_HORIZONS, { error: 'Choisis un horizon' }),
  lossReaction: riskAnswer,
  experience: riskAnswer,
  riskShare: riskAnswer,
  dependents: z.coerce.number().int('Nombre entier attendu').min(0).max(50).default(0),
  createEmergencyGoal: checkboxSchema,
});

export const onboardingAmountsSchema = (currency: CurrencyCode) =>
  z.object({
    monthlyIncome: amountSchema(currency, { label: 'Le revenu mensuel' }),
    fixedCharges: amountSchema(currency, { allowZero: true, label: 'Les charges fixes' }),
    variableExpenses: amountSchema(currency, { allowZero: true, label: 'Les dépenses variables' }),
    debtTotal: amountSchema(currency, { allowZero: true, label: 'Le total des dettes' }),
    debtMonthlyPayment: amountSchema(currency, { allowZero: true, label: 'Les remboursements mensuels' }),
    currentSavings: amountSchema(currency, { allowZero: true, label: 'L’épargne actuelle' }),
  });

export const goalTypesSchema = z.array(z.enum(GOAL_TYPES)).max(GOAL_TYPES.length);
