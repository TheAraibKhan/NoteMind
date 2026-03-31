/**
 * In-Memory Caching Service — Production Grade
 *
 * Features:
 * - LRU eviction when cache is full
 * - TTL-based expiration per entry
 * - Hit/miss statistics
 * - Batch invalidation by prefix
 * - Thread-safe (single-threaded Node.js, but safe for async)
 *
 * Note: For multi-instance production deployments, swap this for Redis.
 */

import { logger } from "@/utils/logger";

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  hitCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  evictions: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_TTL_MS = 60 * 60 * 1000;       // 1 hour
const MAX_CACHE_SIZE = 500;                    // Max entries
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;    // Cleanup expired every 5 min

// Per-type TTLs (ms)
const TYPE_TTL: Record<string, number> = {
  notes: 2 * 60 * 60 * 1000,       // 2 hours — notes are stable
  quiz: 30 * 60 * 1000,            // 30 min — quizzes should vary
  flashcards: 60 * 60 * 1000,      // 1 hour
  "query:explanation": 60 * 60 * 1000,
  "query:general_question": 60 * 60 * 1000,
  "query:comparison": 60 * 60 * 1000,
  "query:summary": 60 * 60 * 1000,
};

// ============================================================================
// SERVICE
// ============================================================================

class CachingService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, entries: 0, evictions: 0 };
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start periodic cleanup of expired entries
    this.cleanupTimer = setInterval(() => this.purgeExpired(), CLEANUP_INTERVAL_MS);
    // Allow Node to exit even if timer is running
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Get a value from cache. Returns null on miss or expiration.
   */
  get<T>(query: string, prefix: string = ""): T | null {
    const key = this.makeKey(query, prefix);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.entries = this.cache.size;
      return null;
    }

    // Update access tracking
    entry.hitCount++;
    entry.lastAccessedAt = Date.now();
    this.stats.hits++;

    logger.debug("Cache", "HIT", {
      key: key.slice(0, 60),
      hitCount: entry.hitCount,
    });

    return entry.data;
  }

  /**
   * Store a value in cache. Automatically selects TTL by type prefix.
   */
  set<T>(query: string, data: T, prefix: string = "", customTTL?: number): void {
    const key = this.makeKey(query, prefix);

    // Evict if at capacity
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictLRU();
    }

    const ttl = customTTL ?? TYPE_TTL[prefix] ?? DEFAULT_TTL_MS;

    this.cache.set(key, {
      data,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      hitCount: 0,
    });

    this.stats.entries = this.cache.size;

    logger.debug("Cache", "SET", {
      key: key.slice(0, 60),
      ttlMs: ttl,
      totalEntries: this.cache.size,
    });
  }

  /**
   * Delete a specific cache entry.
   */
  delete(query: string, prefix: string = ""): boolean {
    const key = this.makeKey(query, prefix);
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.entries = this.cache.size;
    }
    return deleted;
  }

  /**
   * Delete all entries matching a prefix (e.g., invalidate all quiz caches).
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${prefix}:`)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.entries = this.cache.size;
    if (count > 0) {
      logger.info("Cache", `Invalidated ${count} entries by prefix`, { prefix });
    }
    return count;
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, entries: 0, evictions: 0 };
    logger.info("Cache", `Cleared all ${size} entries`);
  }

  /**
   * Check existence without updating access time.
   */
  has(query: string, prefix: string = ""): boolean {
    const key = this.makeKey(query, prefix);
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats & { hitRate: string; oldestEntryAge: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : "0";

    let oldestAge = 0;
    for (const entry of this.cache.values()) {
      const age = Date.now() - entry.createdAt;
      if (age > oldestAge) oldestAge = age;
    }

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      oldestEntryAge: `${Math.round(oldestAge / 1000)}s`,
    };
  }

  /**
   * Shutdown: clear the cleanup interval.
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // -------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------

  private makeKey(query: string, prefix: string): string {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
    return prefix ? `${prefix}:${normalized}` : normalized;
  }

  /**
   * Evict the least recently used entry.
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      logger.debug("Cache", "Evicted LRU entry", { key: oldestKey.slice(0, 60) });
    }
  }

  /**
   * Remove all expired entries (called periodically).
   */
  private purgeExpired(): void {
    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        purged++;
      }
    }

    if (purged > 0) {
      this.stats.entries = this.cache.size;
      logger.debug("Cache", `Purged ${purged} expired entries`, {
        remaining: this.cache.size,
      });
    }
  }
}

export const cachingService = new CachingService();
