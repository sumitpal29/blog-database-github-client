/**
 * @module fetchJson
 * Fetches and parses JSON from a URL with structured error handling.
 */

/**
 * @typedef {object} FetchJsonOptions
 * @property {AbortSignal} [signal] - Optional AbortSignal for cancellation
 * @property {number}      [timeout=10000] - Request timeout in ms
 */

/**
 * Fetch JSON from a URL. Returns parsed data or throws a descriptive error.
 *
 * @param {string} url - The URL to fetch
 * @param {FetchJsonOptions} [options={}]
 * @returns {Promise<any>} Parsed JSON data
 * @throws {Error} On network failure, 404, or invalid JSON
 *
 * @example
 * const data = await fetchJson('https://raw.githubusercontent.com/.../meta/list_1.json');
 */
export async function fetchJson(url, options = {}) {
  const { timeout = 10_000 } = options;

  // Timeout via AbortController so we don't hang forever
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`[fetchJson] Request timed out after ${timeout}ms: ${url}`);
    }
    throw new Error(`[fetchJson] Network error fetching ${url}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw new Error(`[fetchJson] Not found (404): ${url}`);
  }

  if (!response.ok) {
    throw new Error(`[fetchJson] Server error ${response.status} fetching: ${url}`);
  }

  let text;
  try {
    text = await response.text();
  } catch (err) {
    throw new Error(`[fetchJson] Failed to read response body from ${url}: ${err.message}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`[fetchJson] Invalid JSON at ${url}. Received: ${text.slice(0, 100)}...`);
  }
}
