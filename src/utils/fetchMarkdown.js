/**
 * @module fetchMarkdown
 * Fetches raw Markdown content from a URL and parses front-matter.
 *
 * We intentionally avoid `gray-matter` here so the SDK stays browser-compatible
 * with zero dependencies.
 */

/**
 * @typedef {object} ParsedMarkdown
 * @property {Record<string, any>} frontmatter - Parsed YAML front-matter fields
 * @property {string}              content     - Markdown body (without front-matter block)
 */

/**
 * Lightweight front-matter parser.
 * Handles the YAML block created by `gray-matter.stringify()` on the server.
 *
 * @param {string} raw - Raw file contents
 * @returns {ParsedMarkdown}
 */
function parseFrontmatter(raw) {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = raw.match(fmRegex);

  if (!match) {
    return { frontmatter: {}, content: raw.trim() };
  }

  const yamlBlock = match[1];
  const body = match[2].trim();

  // Parse simple key: value YAML (handles strings, numbers, booleans, ISO dates)
  const frontmatter = {};
  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (!isNaN(value) && value !== '') {
      value = Number(value);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, content: body };
}

/**
 * Fetch a Markdown file from a URL and return its parsed front-matter + content.
 *
 * @param {string} url - Raw URL to the .md file
 * @param {object} [options={}]
 * @param {number} [options.timeout=10000] - Request timeout in ms
 * @returns {Promise<ParsedMarkdown>}
 * @throws {Error} On 404, network failure, or missing content
 *
 * @example
 * const { frontmatter, content } = await fetchMarkdown('https://raw.githubusercontent.com/.../posts/my-blog.md');
 */
export async function fetchMarkdown(url, options = {}) {
  const { timeout = 10_000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`[fetchMarkdown] Request timed out after ${timeout}ms: ${url}`);
    }
    throw new Error(`[fetchMarkdown] Network error fetching ${url}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw new Error(`[fetchMarkdown] Not found (404): ${url}`);
  }

  if (!response.ok) {
    throw new Error(`[fetchMarkdown] Server error ${response.status}: ${url}`);
  }

  const raw = await response.text();
  return parseFrontmatter(raw);
}
