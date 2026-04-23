/**
 * Type declarations for @blog-database/client
 */

export interface BlogClientConfig {
  repo: string;
  branch: string;
  project: string;
  cacheTtl?: number;
  useLocalStorage?: boolean;
}

export interface PostMeta {
  slug: string;
  title: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  metatags?: string[];
  [key: string]: any; // Catch-all for other front-matter
}

export interface PostsPage {
  page: number;
  totalPosts: number;
  items: PostMeta[];
}

export interface Post {
  slug: string;
  frontmatter: PostMeta;
  content: string; // Markdown body
}

export interface PaginationIndex {
  totalPosts: number;
  totalPages: number;
  pages: string[];
  generatedAt: string;
}

export interface BlogClient {
  /**
   * Fetch a single page of post metadata.
   * @param page 1-based page number (default 1)
   */
  getPosts(page?: number): Promise<PostsPage>;
  
  /**
   * Fetch all posts across all pages.
   */
  getAllPosts(): Promise<PostMeta[]>;
  
  /**
   * Fetch full content of a single post by slug.
   */
  getPost(slug: string): Promise<Post>;
  
  /**
   * Client-side search across all posts.
   */
  search(query: string): Promise<PostMeta[]>;
  
  /**
   * Return the cached pagination index without refetching.
   */
  getIndex(): PaginationIndex | null;
  
  /**
   * Clear all cached data.
   */
  clearCache(): void;
}

/**
 * Create a blog client instance.
 */
export function createBlogClient(config: BlogClientConfig): BlogClient;

// Internal Utils (optional to export types, but good practice if explicitly exported from index.js)
export function buildUrl(config: BlogClientConfig, filePath: string): string;
export function fetchJson<T = any>(url: string, options?: { signal?: AbortSignal, timeout?: number }): Promise<T>;
export function fetchMarkdown(url: string, options?: { signal?: AbortSignal, timeout?: number }): Promise<{ frontmatter: Record<string, any>; content: string }>;
