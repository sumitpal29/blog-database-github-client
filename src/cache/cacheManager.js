/**
 * @module cacheManager
 * In-memory cache with TTL and optional localStorage persistence for browsers.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Detects whether the localStorage API is available (browser env only).
 * @returns {boolean}
 */
function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * @typedef {object} CacheEntry
 * @property {any}    value     - Cached value
 * @property {number} expiresAt - Unix timestamp (ms) when entry expires
 */

/**
 * Create a cache manager instance.
 *
 * @param {object} [options={}]
 * @param {number}  [options.ttl=300000]         - Time-to-live in ms (default: 5 min)
 * @param {boolean} [options.useLocalStorage=true] - Persist to localStorage in browsers
 * @returns {CacheManager}
 *
 * @example
 * const cache = createCacheManager({ ttl: 10 * 60 * 1000 }); // 10-min TTL
 * cache.set('key', data);
 * const hit = cache.get('key'); // returns data or null if expired/missing
 */
export function createCacheManager(options = {}) {
  const { ttl = DEFAULT_TTL_MS, useLocalStorage = true } = options;

  /** @type {Map<string, CacheEntry>} */
  const memCache = new Map();
  const lsAvailable = useLocalStorage && hasLocalStorage();
  const LS_PREFIX = '__blog_sdk__';

  /**
   * @typedef {object} CacheManager
   */
  return {
    /**
     * Retrieve a cached value. Returns `null` if missing or expired.
     * @param {string} key
     * @returns {any|null}
     */
    get(key) {
      const now = Date.now();

      // 1. Check in-memory first (fast path)
      if (memCache.has(key)) {
        const entry = memCache.get(key);
        if (entry.expiresAt > now) {
          return entry.value;
        }
        memCache.delete(key);
      }

      // 2. Fall back to localStorage
      if (lsAvailable) {
        try {
          const raw = window.localStorage.getItem(`${LS_PREFIX}${key}`);
          if (raw) {
            const entry = JSON.parse(raw);
            if (entry.expiresAt > now) {
              // Warm in-memory cache on hit
              memCache.set(key, entry);
              return entry.value;
            }
            window.localStorage.removeItem(`${LS_PREFIX}${key}`);
          }
        } catch {
          // localStorage read failed — degrade gracefully
        }
      }

      return null;
    },

    /**
     * Store a value in cache.
     * @param {string} key
     * @param {any}    value
     * @param {number} [customTtl] - Override TTL for this entry (ms)
     */
    set(key, value, customTtl) {
      const entry = { value, expiresAt: Date.now() + (customTtl ?? ttl) };
      memCache.set(key, entry);

      if (lsAvailable) {
        try {
          window.localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(entry));
        } catch {
          // Storage quota exceeded or private browsing — degrade gracefully
        }
      }
    },

    /**
     * Remove a specific key from all cache layers.
     * @param {string} key
     */
    delete(key) {
      memCache.delete(key);
      if (lsAvailable) {
        try { window.localStorage.removeItem(`${LS_PREFIX}${key}`); } catch { /* noop */ }
      }
    },

    /**
     * Clear the entire cache (both memory and localStorage keys for this SDK).
     */
    clear() {
      memCache.clear();
      if (lsAvailable) {
        try {
          const keysToRemove = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && k.startsWith(LS_PREFIX)) keysToRemove.push(k);
          }
          keysToRemove.forEach(k => window.localStorage.removeItem(k));
        } catch { /* noop */ }
      }
    },
  };
}
