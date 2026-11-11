import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { getAiConfig } from './config';

export interface TurnUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface TurnResult {
  content: Anthropic.Beta.BetaContentBlock[];
  stopReason: string | null;
  usage: TurnUsage;
  model: string;
}

export interface TurnParams {
  system: string;
  tools: Anthropic.Beta.BetaToolUnion[];
  messages: Anthropic.Beta.BetaMessageParam[];
  maxTokens: number;
  onText?: (delta: string) => void;
  signal?: AbortSignal;
}

/**
 * Fournisseur de LLM. Le format des messages suit celui de l'API Messages d'Anthropic ;
 * un autre fournisseur s'ajoute en implémentant cette interface (traduction des formats).
 */
export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  runTurn(params: TurnParams): Promise<TurnResult>;
}

/** Erreur JSON d'entrée d'outil non analysable (mode streaming) : le tour peut être relancé. */
export class ToolInputParseError extends Error {}

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private client: Anthropic;
  private effort: 'low' | 'medium' | 'high';
  private serverFallbacks: boolean;

  constructor() {
    const config = getAiConfig();
    if (!config.apiKey) throw new Error('ANTHROPIC_API_KEY manquante');
    this.client = new Anthropic({ apiKey: config.apiKey, maxRetries: 2, timeout: 120_000 });
    this.model = config.model;
    this.effort = config.effort;
    this.serverFallbacks = config.serverFallbacks;
  }

  async runTurn(params: TurnParams): Promise<TurnResult> {
    const stream = this.client.beta.messages.stream(
      {
        model: this.model,
        max_tokens: params.maxTokens,
        // Prompt système figé et mis en cache (les outils, déterministes, sont avant lui dans le préfixe).
        system: [{ type: 'text', text: params.system, cache_control: { type: 'ephemeral' } }],
        tools: params.tools,
        messages: params.messages,
        output_config: { effort: this.effort },
        ...(this.serverFallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      },
      { signal: params.signal },
    );
    if (params.onText) stream.on('text', params.onText);
    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
    } catch (error) {
      if (error instanceof Anthropic.APIError) throw error;
      if (error instanceof SyntaxError) throw new ToolInputParseError(error.message);
      throw error;
    }
    const u = message.usage;
    return {
      content: message.content,
      stopReason: message.stop_reason,
      model: message.model,
      usage: {
        input: u.input_tokens ?? 0,
        output: u.output_tokens ?? 0,
        cacheRead: u.cache_read_input_tokens ?? 0,
        cacheWrite: u.cache_creation_input_tokens ?? 0,
      },
    };
  }
}

export function createProvider(): LlmProvider {
  return new AnthropicProvider();
}
