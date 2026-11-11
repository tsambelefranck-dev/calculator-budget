/**
 * Schéma PostgreSQL (Drizzle ORM).
 * Conventions : montants en unités mineures (bigint), devise ISO sur chaque ligne monétaire,
 * dates comptables en `date` (chaînes YYYY-MM-DD), mois en `YYYY-MM`.
 * Toutes les données personnelles sont supprimées en cascade avec l'utilisateur.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  CurrencyCode,
  DebtType,
  EmploymentStatus,
  GoalType,
  IncomeSourceType,
  IncomeType,
  InvestmentHorizon,
  PaymentMethod,
  Plan,
  PlannerBucket,
  ProfileType,
  RiskTolerance,
} from '@/lib/constants';
import type { RiskAnswers } from '@/lib/finance/profile';

const money = (name: string) => bigint(name, { mode: 'number' });
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const currency = () => text('currency').$type<CurrencyCode>().notNull();
const userRef = () =>
  uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' });

// ─── Utilisateurs & authentification ───────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role').$type<'user' | 'admin'>().notNull().default('user'),
    plan: text('plan').$type<Plan>().notNull().default('free'),
    premiumUntil: timestamp('premium_until', { withTimezone: true }),
    trialUsedAt: timestamp('trial_used_at', { withTimezone: true }),
    locale: text('locale').$type<'fr' | 'en'>().notNull().default('fr'),
    isDemo: boolean('is_demo').notNull().default(false),
    demoExpiresAt: timestamp('demo_expires_at', { withTimezone: true }),
    aiDataConsent: boolean('ai_data_consent').notNull().default(false),
    aiConsentAt: timestamp('ai_consent_at', { withTimezone: true }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email), index('users_created_idx').on(t.createdAt)],
);

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 (hex) du jeton de session : le jeton lui-même n'est jamais stocké. */
    id: text('id').primaryKey(),
    userId: userRef(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: userRef(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: createdAt(),
});

// ─── Profil financier ──────────────────────────────────────────────────────

export const financialProfiles = pgTable('financial_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  ageRange: text('age_range').notNull(),
  country: text('country').notNull(),
  currency: currency(),
  timezone: text('timezone').notNull(),
  employmentStatus: text('employment_status').$type<EmploymentStatus>().notNull(),
  incomeType: text('income_type').$type<IncomeType>().notNull(),
  monthlyIncome: money('monthly_income').notNull(),
  fixedCharges: money('fixed_charges').notNull(),
  variableExpenses: money('variable_expenses').notNull(),
  debtTotal: money('debt_total').notNull().default(0),
  debtMonthlyPayment: money('debt_monthly_payment').notNull().default(0),
  currentSavings: money('current_savings').notNull().default(0),
  dependents: integer('dependents').notNull().default(0),
  goals: jsonb('goals').$type<GoalType[]>().notNull().default([]),
  investmentHorizon: text('investment_horizon').$type<InvestmentHorizon>().notNull(),
  riskAnswers: jsonb('risk_answers').$type<RiskAnswers>().notNull(),
  riskScore: integer('risk_score').notNull(),
  riskTolerance: text('risk_tolerance').$type<RiskTolerance>().notNull(),
  profileType: text('profile_type').$type<ProfileType>().notNull(),
  initialHealthScore: integer('initial_health_score'),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAt(),
});

// ─── Revenus ───────────────────────────────────────────────────────────────

export const incomeSources = pgTable(
  'income_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    name: text('name').notNull(),
    type: text('type').$type<IncomeSourceType>().notNull(),
    isFixed: boolean('is_fixed').notNull().default(true),
    expectedAmount: money('expected_amount'),
    currency: currency(),
    recurrence: text('recurrence').$type<'none' | 'monthly'>().notNull().default('monthly'),
    payDay: integer('pay_day'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('income_sources_user_idx').on(t.userId)],
);

export const incomes = pgTable(
  'incomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    sourceId: uuid('source_id').references(() => incomeSources.id, { onDelete: 'set null' }),
    type: text('type').$type<IncomeSourceType>().notNull(),
    amount: money('amount').notNull(),
    currency: currency(),
    receivedOn: date('received_on', { mode: 'string' }).notNull(),
    label: text('label').notNull(),
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('incomes_user_date_idx').on(t.userId, t.receivedOn), check('incomes_amount_positive', sql`${t.amount} > 0`)],
);

// ─── Dépenses & budgets ────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  nameFr: text('name_fr').notNull(),
  nameEn: text('name_en').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isEssential: boolean('is_essential').notNull(),
  plannerBucket: text('planner_bucket').$type<PlannerBucket>().notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
});

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    amount: money('amount').notNull(),
    currency: currency(),
    spentOn: date('spent_on', { mode: 'string' }).notNull(),
    label: text('label').notNull(),
    paymentMethod: text('payment_method').$type<PaymentMethod>().notNull().default('especes'),
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('expenses_user_date_idx').on(t.userId, t.spentOn),
    index('expenses_user_category_idx').on(t.userId, t.categoryId),
    check('expenses_amount_positive', sql`${t.amount} > 0`),
  ],
);

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    amount: money('amount').notNull(),
    currency: currency(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('budgets_user_category_month_unique').on(t.userId, t.categoryId, t.month),
    check('budgets_amount_non_negative', sql`${t.amount} >= 0`),
  ],
);

// ─── Planificateur de salaire ──────────────────────────────────────────────

export const salaryPlans = pgTable(
  'salary_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    incomeId: uuid('income_id').references(() => incomes.id, { onDelete: 'set null' }),
    month: text('month').notNull(),
    totalAmount: money('total_amount').notNull(),
    currency: currency(),
    status: text('status').$type<'draft' | 'validated'>().notNull().default('draft'),
    planStatus: text('plan_status').$type<'ok' | 'serre' | 'deficit'>().notNull().default('ok'),
    inputs: jsonb('inputs').$type<Record<string, unknown>>().notNull().default({}),
    notes: jsonb('notes').$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
    validatedAt: timestamp('validated_at', { withTimezone: true }),
  },
  (t) => [index('salary_plans_user_month_idx').on(t.userId, t.month)],
);

export const salaryPlanItems = pgTable(
  'salary_plan_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => salaryPlans.id, { onDelete: 'cascade' }),
    bucket: text('bucket').$type<PlannerBucket>().notNull(),
    label: text('label').notNull(),
    amount: money('amount').notNull(),
    recommendedAmount: money('recommended_amount').notNull(),
    rationale: text('rationale').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('salary_plan_items_plan_idx').on(t.planId)],
);

// ─── Objectifs d'épargne ───────────────────────────────────────────────────

export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    name: text('name').notNull(),
    type: text('type').$type<GoalType>().notNull(),
    targetAmount: money('target_amount').notNull(),
    currency: currency(),
    targetDate: date('target_date', { mode: 'string' }),
    plannedMonthly: money('planned_monthly'),
    status: text('status').$type<'active' | 'achieved' | 'archived'>().notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    achievedAt: timestamp('achieved_at', { withTimezone: true }),
  },
  (t) => [index('savings_goals_user_idx').on(t.userId), check('goals_target_positive', sql`${t.targetAmount} > 0`)],
);

export const goalContributions = pgTable(
  'goal_contributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => savingsGoals.id, { onDelete: 'cascade' }),
    userId: userRef(),
    /** Positif = versement, négatif = retrait. */
    amount: money('amount').notNull(),
    contributedOn: date('contributed_on', { mode: 'string' }).notNull(),
    /** Épargne déjà constituée avant l'ouverture de l'objectif : comptée dans le solde, pas dans les flux du mois. */
    isOpeningBalance: boolean('is_opening_balance').notNull().default(false),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('goal_contributions_user_date_idx').on(t.userId, t.contributedOn), index('goal_contributions_goal_idx').on(t.goalId)],
);

// ─── Dettes ────────────────────────────────────────────────────────────────

export const debts = pgTable(
  'debts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    name: text('name').notNull(),
    type: text('type').$type<DebtType>().notNull(),
    lender: text('lender'),
    principal: money('principal').notNull(),
    /** Capital restant dû au moment de l'enregistrement. */
    initialBalance: money('initial_balance').notNull(),
    currency: currency(),
    /** Taux annuel en points de base (1 550 = 15,50 %). */
    annualRateBp: integer('annual_rate_bp').notNull().default(0),
    minimumPayment: money('minimum_payment').notNull().default(0),
    dueDay: integer('due_day'),
    startDate: date('start_date', { mode: 'string' }),
    recordedOn: date('recorded_on', { mode: 'string' }).notNull(),
    status: text('status').$type<'active' | 'paid'>().notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('debts_user_idx').on(t.userId), check('debts_balance_non_negative', sql`${t.initialBalance} >= 0`)],
);

export const debtPayments = pgTable(
  'debt_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),
    userId: userRef(),
    amount: money('amount').notNull(),
    paidOn: date('paid_on', { mode: 'string' }).notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('debt_payments_user_date_idx').on(t.userId, t.paidOn), check('debt_payments_positive', sql`${t.amount} > 0`)],
);

// ─── Investissements déclarés ──────────────────────────────────────────────

export const investments = pgTable(
  'investments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    name: text('name').notNull(),
    domain: text('domain').notNull(),
    currentValue: money('current_value'),
    valuedOn: date('valued_on', { mode: 'string' }),
    currency: currency(),
    status: text('status').$type<'active' | 'closed'>().notNull().default('active'),
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('investments_user_idx').on(t.userId)],
);

export const investmentMovements = pgTable(
  'investment_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    investmentId: uuid('investment_id')
      .notNull()
      .references(() => investments.id, { onDelete: 'cascade' }),
    userId: userRef(),
    /** Positif = apport, négatif = retrait. */
    amount: money('amount').notNull(),
    movedOn: date('moved_on', { mode: 'string' }).notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('investment_movements_user_date_idx').on(t.userId, t.movedOn)],
);

// ─── Rapports & notifications ──────────────────────────────────────────────

export const monthlyReports = pgTable(
  'monthly_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    month: text('month').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    aiSummary: text('ai_summary'),
    aiModel: text('ai_model'),
    aiGeneratedAt: timestamp('ai_generated_at', { withTimezone: true }),
    generatedBy: text('generated_by').$type<'auto' | 'manual'>().notNull().default('manual'),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('monthly_reports_user_month_unique').on(t.userId, t.month)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link'),
    dedupeKey: text('dedupe_key').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('notifications_user_dedupe_unique').on(t.userId, t.dedupeKey), index('notifications_user_created_idx').on(t.userId, t.createdAt)],
);

// ─── Intelligence artificielle ─────────────────────────────────────────────

export interface ToolCallRecord {
  name: string;
  input: unknown;
  ok: boolean;
}

export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    title: text('title').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('ai_conversations_user_idx').on(t.userId, t.updatedAt)],
);

export const aiMessages = pgTable(
  'ai_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),
    userId: userRef(),
    role: text('role').$type<'user' | 'assistant'>().notNull(),
    /** Texte affiché à l'utilisateur. */
    content: text('content').notNull(),
    /** Contenu exact envoyé au modèle (rejoué à l'identique pour préserver le cache). */
    apiContent: jsonb('api_content').$type<unknown>().notNull(),
    toolCalls: jsonb('tool_calls').$type<ToolCallRecord[]>().notNull().default([]),
    status: text('status').$type<'ok' | 'error' | 'refusal' | 'truncated'>().notNull().default('ok'),
    model: text('model'),
    createdAt: createdAt(),
  },
  (t) => [index('ai_messages_conversation_idx').on(t.conversationId, t.createdAt)],
);

export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    kind: text('kind').$type<'chat' | 'report'>().notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
    cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
    /** Coût estimé en micro-dollars (1 $ = 1 000 000). */
    costMicroUsd: bigint('cost_micro_usd', { mode: 'number' }).notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('ai_usage_user_created_idx').on(t.userId, t.createdAt), index('ai_usage_created_idx').on(t.createdAt)],
);

// ─── Contenus : éducation, investissement, publications ────────────────────

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  body: text('body').notNull(),
  topic: text('topic').notNull(),
  level: text('level').$type<'debutant' | 'intermediaire'>().notNull().default('debutant'),
  durationMin: integer('duration_min').notNull().default(5),
  quiz: jsonb('quiz').$type<QuizQuestion[]>().notNull().default([]),
  exercise: text('exercise'),
  isPremium: boolean('is_premium').notNull().default(false),
  isPublished: boolean('is_published').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: userRef(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    quizScore: integer('quiz_score').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export interface SourceRef {
  label: string;
  url: string;
  /** Date de consultation (YYYY-MM-DD) ; `null` si la source n'a pas été vérifiée automatiquement. */
  consultedAt: string | null;
}

export const investmentDomains = pgTable('investment_domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('trending-up'),
  summary: text('summary').notNull(),
  description: text('description').notNull(),
  howItWorks: text('how_it_works').notNull(),
  startingCapital: text('starting_capital').notNull(),
  skills: jsonb('skills').$type<string[]>().notNull().default([]),
  riskLevel: integer('risk_level').notNull(),
  horizon: text('horizon').notNull(),
  liquidity: text('liquidity').notNull(),
  costs: text('costs').notNull(),
  returnPotential: text('return_potential').notNull(),
  lossRisks: text('loss_risks').notNull(),
  example: text('example').notNull(),
  sources: jsonb('sources').$type<SourceRef[]>().notNull().default([]),
  infoNature: text('info_nature').$type<'documente' | 'hypothese' | 'mixte'>().notNull().default('mixte'),
  isPublished: boolean('is_published').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const publications = pgTable('publications', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url').notNull(),
  consultedAt: date('consulted_at', { mode: 'string' }).notNull(),
  country: text('country'),
  isPublished: boolean('is_published').notNull().default(true),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ─── Abonnements ───────────────────────────────────────────────────────────

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    plan: text('plan').$type<Plan>().notNull(),
    interval: text('interval').$type<'trial' | 'monthly' | 'yearly' | 'custom'>().notNull(),
    status: text('status').$type<'active' | 'canceled' | 'expired'>().notNull().default('active'),
    provider: text('provider').$type<'trial' | 'manual'>().notNull(),
    providerRef: text('provider_ref'),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('subscriptions_user_idx').on(t.userId)],
);

// ─── Exploitation : audit, erreurs, limitation de débit ────────────────────

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ip: text('ip'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_logs_user_idx').on(t.userId, t.createdAt), index('audit_logs_action_idx').on(t.action, t.createdAt)],
);

export const errorLogs = pgTable(
  'error_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    digest: text('digest'),
    message: text('message').notNull(),
    stack: text('stack'),
    path: text('path'),
    method: text('method'),
    routeType: text('route_type'),
    createdAt: createdAt(),
  },
  (t) => [index('error_logs_created_idx').on(t.createdAt)],
);

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull().default(0),
});
