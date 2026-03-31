/**
 * Shared interfaces for AI providers
 *
 * Every provider (Groq, Gemini, OpenAI) must implement the AIProvider interface.
 * This allows the ProviderManager to treat them uniformly, swap them dynamically,
 * and iterate through the fallback chain without any provider-specific logic.
 */

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

export interface AIProvider {
  /** Human-readable name for logging and health checks */
  readonly name: string;

  /** Whether this provider has valid configuration (API key present, etc.) */
  isConfigured(): boolean;

  /**
   * Generate a text completion from the given prompt.
   * Must throw on failure — the ProviderManager handles retries/fallback.
   */
  generateText(prompt: string, options?: GenerationOptions): Promise<string>;
}

export interface GenerationOptions {
  /** Controls randomness. 0 = deterministic, 1 = creative. Default ~0.7 */
  temperature?: number;
  /** Maximum tokens in the response */
  maxTokens?: number;
  /** Abort signal for timeout control */
  signal?: AbortSignal;
}

// ============================================================================
// PROVIDER STATUS (used by ProviderManager)
// ============================================================================

export enum CircuitState {
  CLOSED = "CLOSED",       // Normal — accepting requests
  OPEN = "OPEN",           // Failing — blocking all requests
  HALF_OPEN = "HALF_OPEN", // Testing — allowing limited requests
}

export interface ProviderStatus {
  name: string;
  configured: boolean;
  circuitState: CircuitState;
  failureCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  averageLatencyMs: number;
}

// ============================================================================
// AI RESPONSE (standardised across all providers)
// ============================================================================

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  provider?: string;
  latencyMs?: number;
  fallbackUsed?: boolean;
}

// ============================================================================
// CONTENT TYPES (shared by aiService consumers)
// ============================================================================

export interface NotesContent {
  title?: string;
  definition: string;
  key_concepts: string[];
  important_points: string[];
  examples: string[];
  exam_highlights?: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface FlashcardContent {
  front: string;
  back: string;
  mastered?: boolean;
}

export interface GeneralResponse {
  title?: string;
  explanation: string;
  key_points?: string[];
  example?: string;
  takeaway?: string;
}
