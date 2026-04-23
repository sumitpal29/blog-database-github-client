/**
 * @module client
 * Core factory for the @blog-database/client SDK.
 */

import { buildUrl } from './utils/buildUrl.js';
import { fetchJson } from './utils/fetchJson.js';
import { fetchMarkdown } from './utils/fetchMarkdown.js';
import { createCacheManager } from './cache/cacheManager.js';

/**
 * @typedef {object} BlogClientConfig
 * @property {string} repo          - GitHub repo (e.g. "sumitpal/blog_database")
 * @property {string} branch        - Branch to read from (e.g. "main")
 * @property {string} project       - Project folder inside /projects (e.g. "personal_blog")
 * @property {number} [cacheTtl]    - Cache TTL in ms (default: 300_000 = 5 min)
 * @property {boolean} [useLocalStorage] - Enable localStorage cache in browser (default: true)
 */

/**
 * @typedef {object} PostMeta
 * @property {string}   slug        - URL-safe identifier
 * @property {string}   title       - Post title
 * @property {string}   [description]
 * @property {string}   [createdAt]
 * @property {string}   [updatedAt]
 * @property {string[]} [metatags]
 */

/**
 * @typedef {object} PostsPage
 * @property {number}     page       - Current page number
 * @property {number}     totalPosts - Total posts across all pages
 * @property {PostMeta[]} items      - Posts on this page
 */

/**
 * @typedef {object} Post
 * @property {PostMeta} frontmatter - Post metadata from YAML front-matter
 * @property {string}   content     - Markdown body content
 * @property {string}   slug        - Post slug
 */

/**
 * @typedef {object} PaginationIndex
 * @property {number}   totalPosts  - Total number of posts
 * @property {number}   totalPages  - Total number of pages
 * @property {string[]} pages       - List of page file names (e.g. ["list_1.json"])
 * @property {string}   generatedAt - ISO timestamp of last generation
 */

/**
 * @typedef {object} BlogClient
 * @property {function(number=): Promise<PostsPage>}       getPosts    - Fetch one page of posts
 * @property {function(): Promise<PostMeta[]>}             getAllPosts  - Fetch all posts across all pages
 * @property {function(string): Promise<Post>}             getPost     - Fetch a single post by slug
 * @property {function(string): Promise<PostMeta[]>}       search      - Client-side search across all posts
 * @property {function(): PaginationIndex|null}            getIndex    - Return cached index (or null)
 * @property {function(): void}                            clearCache  - Flush all cached data
 */

/**
 * Create a blog client instance bound to a specific GitHub project.
 *
 * @param {BlogClientConfig} config
 * @returns {BlogClient}
 *
 * @example
 * const client = createBlogClient({
 *   repo: 'sumitpal/blog_database',
 *   branch: 'main',
 *   project: 'personal_blog',
 * });
 *
 * const page = await client.getPosts(1);
 * const post = await client.getPost('my-first-blog');
 * const results = await client.search('javascript');
 */
export function createBlogClient(config) {
  if (!config || !config.repo || !config.branch || !config.project) {
    throw new Error('[createBlogClient] config must include: repo, branch, project');
  }

  const cache = createCacheManager({
    ttl: config.cacheTtl ?? 5 * 60 * 1000,
    useLocalStorage: config.useLocalStorage ?? true,
  });

  // ── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Get a URL for a file inside the project, with caching.
   * @param {string} filePath - Relative to the project root
   */
  function url(filePath) {
    return buildUrl(config, filePath);
  }

  /**
   * Fetch JSON with cache read/write.
   * @param {string} filePath
   * @returns {Promise<any>}
   */
  async function cachedJson(filePath) {
    const cacheKey = `json:${config.repo}:${config.branch}:${config.project}:${filePath}`;
    const hit = cache.get(cacheKey);
    if (hit !== null) return hit;

    const data = await fetchJson(url(filePath));
    cache.set(cacheKey, data);
    return data;
  }

  /**
   * Fetch Markdown with cache read/write.
   * @param {string} filePath
   * @returns {Promise<import('./utils/fetchMarkdown.js').ParsedMarkdown>}
   */
  async function cachedMarkdown(filePath) {
    const cacheKey = `md:${config.repo}:${config.branch}:${config.project}:${filePath}`;
    const hit = cache.get(cacheKey);
    if (hit !== null) return hit;

    const data = await fetchMarkdown(url(filePath));
    cache.set(cacheKey, data);
    return data;
  }

  /**
   * Fetch the pagination index (meta/index.json).
   * @returns {Promise<PaginationIndex>}
   */
  async function fetchIndex() {
    return cachedJson('meta/index.json');
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  return {
    /**
     * Fetch a single page of post metadata.
     *
     * @param {number} [page=1] - 1-based page number
     * @returns {Promise<PostsPage>}
     * @throws {Error} If the page file doesn't exist
     *
     * @example
     * const { items, totalPosts } = await client.getPosts(2);
     */
    async getPosts(page = 1) {
      if (!Number.isInteger(page) || page < 1) {
        throw new Error(`[getPosts] page must be a positive integer, got: ${page}`);
      }
      const filePath = `meta/list_${page}.json`;
      return cachedJson(filePath);
    },

    /**
     * Fetch all posts across all pages by reading the index first,
     * then fetching each page in parallel.
     *
     * @returns {Promise<PostMeta[]>} Flat array of all post metadata
     *
     * @example
     * const all = await client.getAllPosts();
     */
    async getAllPosts() {
      const index = await fetchIndex();
      const { totalPages } = index;

      if (totalPages === 0) return [];

      const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
      const pages = await Promise.all(pageNumbers.map(p => this.getPosts(p)));

      return pages.flatMap(p => p.items ?? []);
    },

    /**
     * Fetch full content of a single post by slug.
     * Parses front-matter and returns both metadata and markdown body.
     *
     * @param {string} slug - The post slug (filename without .md)
     * @returns {Promise<Post>}
     * @throws {Error} If the post doesn't exist (404)
     *
     * @example
     * const { frontmatter, content } = await client.getPost('hello-world');
     */
    async getPost(slug) {
      if (!slug || typeof slug !== 'string') {
        throw new Error('[getPost] slug must be a non-empty string');
      }
      const filePath = `posts/${slug}.md`;
      const { frontmatter, content } = await cachedMarkdown(filePath);
      return { slug, frontmatter, content };
    },

    /**
     * Client-side full-text search across all posts.
     * Searches within: title, description, and metatags.
     *
     * @param {string} query - Search query (case-insensitive)
     * @returns {Promise<PostMeta[]>} Matching posts
     *
     * @example
     * const results = await client.search('javascript tips');
     */
    async search(query) {
      if (!query || typeof query !== 'string') {
        throw new Error('[search] query must be a non-empty string');
      }

      const allPosts = await this.getAllPosts();
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

      return allPosts.filter(post => {
        const searchIn = [
          post.title ?? '',
          post.description ?? '',
          ...(Array.isArray(post.metatags) ? post.metatags : []),
        ].join(' ').toLowerCase();

        // All terms must appear (AND logic — better precision than OR)
        return terms.every(term => searchIn.includes(term));
      });
    },

    /**
     * Return the cached pagination index without refetching.
     * Useful for showing total post counts etc.
     *
     * @returns {PaginationIndex|null} null if not yet loaded
     */
    getIndex() {
      const cacheKey = `json:${config.repo}:${config.branch}:${config.project}:meta/index.json`;
      return cache.get(cacheKey);
    },

    /**
     * Clear all cached data for this client instance.
     * Useful for force-refreshing after a push/deploy.
     */
    clearCache() {
      cache.clear();
    },
  };
}
