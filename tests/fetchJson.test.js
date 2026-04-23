import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchJson } from '../src/utils/fetchJson.js';

function mockFetch(status, body) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('fetchJson', () => {
  it('parses and returns JSON on 200', async () => {
    mockFetch(200, '{"items":[1,2,3]}');
    const data = await fetchJson('https://example.com/data.json');
    expect(data).toEqual({ items: [1, 2, 3] });
  });

  it('throws a descriptive error on 404', async () => {
    mockFetch(404, 'Not Found');
    await expect(fetchJson('https://example.com/missing.json')).rejects.toThrow('404');
  });

  it('throws on a non-ok server error', async () => {
    mockFetch(500, 'Internal Server Error');
    await expect(fetchJson('https://example.com/err')).rejects.toThrow('500');
  });

  it('throws on invalid JSON', async () => {
    mockFetch(200, 'not json at all <<<');
    await expect(fetchJson('https://example.com/bad.json')).rejects.toThrow('Invalid JSON');
  });

  it('throws on a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchJson('https://example.com')).rejects.toThrow('Network error');
  });

  it('throws a timeout error when AbortError is raised', async () => {
    const err = new DOMException('aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(err);
    await expect(fetchJson('https://example.com', { timeout: 1 })).rejects.toThrow('timed out');
  });
});
