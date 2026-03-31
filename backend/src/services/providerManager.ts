/**
 * Provider Manager — Multi-AI Orchestration Layer
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────┐
 * │  ProviderManager.generate(prompt)                       │
 * │    ↓                                                    │
 * │  For each provider in priority order:                   │
 * │    1. Check: is configured?                             │
 * │    2. Check: is circuit breaker allowing requests?      │
 * │    3. Try: call provider with retry + timeout           │
 * │    4. Success → record success, return result           │
 * │    5. Failure → record failure, try next provider       │
 * │    ↓ (all providers fail)                               │
 * │  Return null — caller handles Wikipedia / static error  │
 * └─────────────────────────────────────────────────────────┘
 *
 * Each provider has its OWN circuit breaker. When one provider
 * hits rate limits, only that provider is disabled — others keep working.
 *
 * Key features:
 * - Per-provider circuit breakers (independent failure tracking)
 * - Exponential backoff retry within each provider
 * - 429 error detection with extended cooldown
 * - Rate limit cooldown (2-3s between retries)
 * - Auth error detection (immediately skip, don't retry)
 * - Comprehensive health reporting per provider
 */

import { AIProvider, CircuitState, ProviderStatus, GenerationOptions } from "./providers/types";
import { groqProvider } from "./providers/groqProvider";
import { geminiProvider } from "./providers/geminiProvider";
import { openaiProvider } from "./providers/openaiProvider";
import { logger } from "@/utils/logger";
import { RETRY_CONFIG, CIRCUIT_BREAKER_CONFIG } from "@/constants/aiPrompts";

// ============================================================================
// PER-PROVIDER CIRCUIT BREAKER
// ============================================================================

class ProviderCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private halfOpenCalls = 0;
  private totalCalls = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private latencies: number[] = [];
  private rateLimitCooldownUntil = 0;

  constructor(private providerName: string) {}

  isAvailable(): boolean {
    // Check rate limit cooldown first
    if (Date.now() < this.rateLimitCooldownUntil) {
      logger.debug("CircuitBreaker", `${this.providerName} in rate-limit cooldown`, {
        cooldownRemainingMs: this.rateLimitCooldownUntil - Date.now(),
      });
      return false;
    }

    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= CIRCUIT_BREAKER_CONFIG.RECOVERY_TIMEOUT_MS) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCalls = 0;
        logger.info("CircuitBreaker", `${this.providerName}: OPEN → HALF_OPEN (testing recovery)`);
        return true;
      }
      return false;
    }

    // HALF_OPEN — allow limited calls
    return this.halfOpenCalls < CIRCUIT_BREAKER_CONFIG.HALF_OPEN_MAX_CALLS;
  }

  recordSuccess(latencyMs: number): void {
    this.totalCalls++;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    this.latencies.push(latencyMs);
    if (this.latencies.length > 100) this.latencies.shift();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= CIRCUIT_BREAKER_CONFIG.HALF_OPEN_MAX_CALLS) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        logger.info("CircuitBreaker", `${this.providerName}: HALF_OPEN → CLOSED (recovery confirmed)`);
      }
    } else {
      // Reduce failure count on success (gradual recovery)
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  recordFailure(error: Error): void {
    this.totalCalls++;
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // If rate limited, impose a longer cooldown
    if (error.message.startsWith("RATE_LIMIT:")) {
      const cooldownMs = 30_000; // 30 seconds cooldown for rate limits
      this.rateLimitCooldownUntil = Date.now() + cooldownMs;
      logger.warn("CircuitBreaker", `${this.providerName}: Rate limited — cooldown ${cooldownMs / 1000}s`, {
        error: error.message,
      });
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      logger.warn("CircuitBreaker", `${this.providerName}: HALF_OPEN → OPEN (recovery failed)`, {
        error: error.message,
      });
    } else if (this.failureCount >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
      this.state = CircuitState.OPEN;
      logger.error("CircuitBreaker", `${this.providerName}: CLOSED → OPEN (threshold reached)`, error, {
        failureCount: this.failureCount,
        recoveryIn: `${CIRCUIT_BREAKER_CONFIG.RECOVERY_TIMEOUT_MS / 1000}s`,
      });
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    this.rateLimitCooldownUntil = 0;
    logger.info("CircuitBreaker", `${this.providerName}: Manually reset → CLOSED`);
  }

  getStatus(): ProviderStatus {
    const avgLatency =
      this.latencies.length > 0
        ? Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length)
        : 0;

    return {
      name: this.providerName,
      configured: true, // Set by caller
      circuitState: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime > 0 ? this.lastFailureTime : null,
      lastSuccessTime: this.lastSuccessTime > 0 ? this.lastSuccessTime : null,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      averageLatencyMs: avgLatency,
    };
  }
}

// ============================================================================
// PROVIDER ENTRY
// ============================================================================

interface ProviderEntry {
  provider: AIProvider;
  circuitBreaker: ProviderCircuitBreaker;
  priority: number;
}

// ============================================================================
// PROVIDER MANAGER
// ============================================================================

class ProviderManager {
  private providers: ProviderEntry[] = [];
  private lastUsedProvider: string | null = null;
  private lastError: { provider: string; error: string; time: number } | null = null;

  constructor() {
    // Register providers in priority order (free providers first)
    // Fallback chain: Groq (free) → Gemini (free tier) → OpenAI (paid, optional) → Wikipedia
    this.registerProvider(groqProvider, 1);
    this.registerProvider(geminiProvider, 2);
    this.registerProvider(openaiProvider, 3);
  }

  private registerProvider(provider: AIProvider, priority: number): void {
    this.providers.push({
      provider,
      circuitBreaker: new ProviderCircuitBreaker(provider.name),
      priority,
    });
  }

  /**
   * Generate text by trying providers in priority order.
   * Returns the response text and the provider name, or null if all fail.
   */
  async generate(
    prompt: string,
    options?: GenerationOptions,
  ): Promise<{ text: string; provider: string; latencyMs: number } | null> {
    // Sort by priority (lowest number = highest priority)
    const sorted = [...this.providers].sort((a, b) => a.priority - b.priority);

    const errors: string[] = [];

    for (const entry of sorted) {
      const { provider, circuitBreaker } = entry;

      // Skip unconfigured providers
      if (!provider.isConfigured()) {
        logger.debug("ProviderManager", `Skipping ${provider.name} — not configured`);
        continue;
      }

      // Skip providers with open circuit breakers
      if (!circuitBreaker.isAvailable()) {
        logger.debug("ProviderManager", `Skipping ${provider.name} — circuit breaker is ${circuitBreaker.getStatus().circuitState}`);
        continue;
      }

      // Try this provider with retry
      try {
        const result = await this.tryProviderWithRetry(provider, circuitBreaker, prompt, options);
        this.lastUsedProvider = provider.name;
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(`${provider.name}: ${err.message}`);

        this.lastError = {
          provider: provider.name,
          error: err.message,
          time: Date.now(),
        };

        // Continue to next provider
        logger.warn("ProviderManager", `${provider.name} failed, trying next provider`, {
          error: err.message,
          remainingProviders: sorted
            .filter((e) => e.priority > entry.priority && e.provider.isConfigured())
            .map((e) => e.provider.name),
        });
      }
    }

    // All providers failed
    logger.error("ProviderManager", "All AI providers failed", undefined, {
      errors,
      configuredProviders: this.getConfiguredProviderNames(),
    });

    return null;
  }

  /**
   * Try a single provider with exponential backoff retry.
   * Auth errors are NOT retried (immediately throw).
   * Rate limit errors set cooldown then throw.
   */
  private async tryProviderWithRetry(
    provider: AIProvider,
    circuitBreaker: ProviderCircuitBreaker,
    prompt: string,
    options?: GenerationOptions,
  ): Promise<{ text: string; provider: string; latencyMs: number }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const startTime = performance.now();
        const text = await provider.generateText(prompt, options);
        const latencyMs = Math.round(performance.now() - startTime);

        circuitBreaker.recordSuccess(latencyMs);

        if (attempt > 0) {
          logger.info("ProviderManager", `${provider.name} succeeded on retry ${attempt}`, {
            totalAttempts: attempt + 1,
            latencyMs,
          });
        }

        return { text, provider: provider.name, latencyMs };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Auth errors: don't retry, immediately fail this provider
        if (lastError.message.startsWith("AUTH_ERROR:")) {
          circuitBreaker.recordFailure(lastError);
          throw lastError;
        }

        // Rate limit: record failure (sets cooldown), don't retry
        if (lastError.message.startsWith("RATE_LIMIT:")) {
          circuitBreaker.recordFailure(lastError);
          throw lastError;
        }

        // For other errors, retry with backoff
        circuitBreaker.recordFailure(lastError);

        if (attempt < RETRY_CONFIG.MAX_RETRIES) {
          const delay = Math.min(
            RETRY_CONFIG.BASE_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt),
            RETRY_CONFIG.MAX_DELAY_MS,
          );
          logger.warn("ProviderManager", `${provider.name} attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
            error: lastError.message,
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  // -------------------------------------------------------------------
  // Health & Status
  // -------------------------------------------------------------------

  getHealth(): Record<string, unknown> {
    const providerStatuses = this.providers.map((entry) => {
      const status = entry.circuitBreaker.getStatus();
      status.configured = entry.provider.isConfigured();
      return status;
    });

    const activeProvider = this.getActiveProvider();

    return {
      activeProvider: activeProvider?.name || "none",
      lastUsedProvider: this.lastUsedProvider,
      lastError: this.lastError
        ? {
            provider: this.lastError.provider,
            error: this.lastError.error.slice(0, 200),
            timeAgo: `${Math.round((Date.now() - this.lastError.time) / 1000)}s`,
          }
        : null,
      providers: providerStatuses,
      configuredCount: this.getConfiguredProviderNames().length,
      totalProviders: this.providers.length,
    };
  }

  getActiveProvider(): AIProvider | null {
    const sorted = [...this.providers].sort((a, b) => a.priority - b.priority);
    for (const entry of sorted) {
      if (entry.provider.isConfigured() && entry.circuitBreaker.isAvailable()) {
        return entry.provider;
      }
    }
    return null;
  }

  getConfiguredProviderNames(): string[] {
    return this.providers
      .filter((e) => e.provider.isConfigured())
      .map((e) => e.provider.name);
  }

  hasAnyProvider(): boolean {
    return this.providers.some(
      (e) => e.provider.isConfigured() && e.circuitBreaker.isAvailable(),
    );
  }

  resetAll(): void {
    for (const entry of this.providers) {
      entry.circuitBreaker.reset();
    }
    this.lastError = null;
    logger.info("ProviderManager", "All circuit breakers reset");
  }

  resetProvider(name: string): boolean {
    const entry = this.providers.find((e) => e.provider.name.toLowerCase() === name.toLowerCase());
    if (entry) {
      entry.circuitBreaker.reset();
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton
export const providerManager = new ProviderManager();
