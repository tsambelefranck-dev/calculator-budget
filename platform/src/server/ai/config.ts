import 'server-only';

export interface ModelPricing {
  /** Prix en dollars par million de tokens. */
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/** Tarifs publics Anthropic (USD / million de tokens). Écriture cache 5 min = 1,25 × entrée. */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-fable-5-1': { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
};

export type Effort = 'low' | 'medium' | 'high';

export interface AiConfig {
  provider: 'anthropic' | 'disabled';
  model: string;
  effort: Effort;
  apiKey: string | null;
  /** Reprise serveur en cas de refus d'un classifieur (modèles qui la supportent). */
  serverFallbacks: boolean;
}

export function getAiConfig(): AiConfig {
  const provider = process.env.AI_PROVIDER === 'disabled' ? 'disabled' : 'anthropic';
  const model = process.env.AI_MODEL?.trim() || 'claude-opus-5-5';
  const effortRaw = process.env.AI_EFFORT;
  const effort: Effort = effortRaw === 'low' || effortRaw === 'high' ? effortRaw : 'medium';
  const supportsFallback = /^claude-(opus-5|sonnet-5-5|fable-5)/.test(model);
  return {
    provider,
    model,
    effort,
    apiKey: process.env.ANTHROPIC_API_KEY?.trim() || null,
    serverFallbacks: supportsFallback && process.env.AI_FALLBACKS !== 'off',
  };
}

export function isAiConfigured(): boolean {
  const c = getAiConfig();
  return c.provider === 'anthropic' && Boolean(c.apiKey);
}

/** Coût estimé en micro-dollars. Modèle inconnu → tarif Opus 5.5 (estimation prudente). */
export function estimateCostMicroUsd(
  model: string,
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number },
): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING['claude-opus-5-5']!;
  return Math.round(usage.input * p.input + usage.output * p.output + usage.cacheRead * p.cacheRead + usage.cacheWrite * p.cacheWrite);
}
