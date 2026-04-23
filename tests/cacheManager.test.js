import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCacheManager } from '../src/cache/cacheManager.js';

describe('createCacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = createCacheManager({ ttl: 1000, useLocalStorage: false });
  });

  it('returns null for a missing key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    cache.set('k', { data: 42 });
    expect(cache.get('k')).toEqual({ data: 42 });
  });

  it('returns null after TTL expires', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(now)        // set: expiresAt = now + 1000
      .mockReturnValueOnce(now + 2000); // get: 2s later → expired

    cache.set('k', 'value');
    expect(cache.get('k')).toBeNull();

    vi.restoreAllMocks();
  });

  it('respects a custom TTL per entry', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(now)
      .mockReturnValueOnce(now + 500); // still within custom 2s TTL

    cache.set('k', 'value', 2000);
    expect(cache.get('k')).toBe('value');

    vi.restoreAllMocks();
  });

  it('delete removes a key', () => {
    cache.set('k', 'v');
    cache.delete('k');
    expect(cache.get('k')).toBeNull();
  });

  it('clear removes all keys', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  it('caches different values under different keys', () => {
    cache.set('x', 'foo');
    cache.set('y', 'bar');
    expect(cache.get('x')).toBe('foo');
    expect(cache.get('y')).toBe('bar');
  });
});
