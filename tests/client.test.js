import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBlogClient } from '../src/client.js';

const BASE_CONFIG = { repo: 'owner/repo', branch: 'main', project: 'blog' };

const INDEX = { totalPosts: 3, totalPages: 2, pages: ['list_1.json', 'list_2.json'], generatedAt: '2024-01-01' };
const PAGE_1 = { page: 1, totalPosts: 3, items: [{ slug: 'post-a', title: 'Post A' }, { slug: 'post-b', title: 'Post B' }] };
const PAGE_2 = { page: 2, totalPosts: 3, items: [{ slug: 'post-c', title: 'Post C', metatags: ['js'] }] };
const POST_MD = `---\ntitle: Post A\ndescription: About A\n---\n\nFull body here.`;

function mockFetchForPath(responses) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    for (const [pattern, body] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        const isJson = typeof body === 'object';
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(isJson ? JSON.stringify(body) : body),
        });
      }
    }
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
  });
}

afterEach(() => vi.restoreAllMocks());

describe('createBlogClient', () => {
  it('throws if repo is missing', () => {
    expect(() => createBlogClient({ branch: 'main', project: 'p' })).toThrow('repo');
  });

  it('throws if branch is missing', () => {
    expect(() => createBlogClient({ repo: 'o/r', project: 'p' })).toThrow('branch');
  });

  it('throws if project is missing', () => {
    expect(() => createBlogClient({ repo: 'o/r', branch: 'main' })).toThrow('project');
  });
});

describe('client.getPosts', () => {
  let client;
  beforeEach(() => {
    client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    mockFetchForPath({ 'list_1.json': PAGE_1 });
  });

  it('returns page data', async () => {
    const result = await client.getPosts(1);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].slug).toBe('post-a');
  });

  it('throws for page < 1', async () => {
    await expect(client.getPosts(0)).rejects.toThrow('positive integer');
  });

  it('throws for non-integer page', async () => {
    await expect(client.getPosts(1.5)).rejects.toThrow('positive integer');
  });
});

describe('client.getPost', () => {
  let client;
  beforeEach(() => {
    client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    mockFetchForPath({ 'posts/post-a.md': POST_MD });
  });

  it('returns slug, frontmatter, and content', async () => {
    const post = await client.getPost('post-a');
    expect(post.slug).toBe('post-a');
    expect(post.frontmatter.title).toBe('Post A');
    expect(post.content).toContain('Full body here.');
  });

  it('throws for empty slug', async () => {
    await expect(client.getPost('')).rejects.toThrow('slug');
  });

  it('throws for non-string slug', async () => {
    await expect(client.getPost(123)).rejects.toThrow('slug');
  });
});

describe('client.getAllPosts', () => {
  it('fetches all pages in parallel and flattens items', async () => {
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    mockFetchForPath({ 'index.json': INDEX, 'list_1.json': PAGE_1, 'list_2.json': PAGE_2 });

    const all = await client.getAllPosts();
    expect(all).toHaveLength(3);
    expect(all.map(p => p.slug)).toEqual(['post-a', 'post-b', 'post-c']);
  });

  it('returns empty array when totalPages is 0', async () => {
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    mockFetchForPath({ 'index.json': { ...INDEX, totalPages: 0 } });

    const all = await client.getAllPosts();
    expect(all).toEqual([]);
  });
});

describe('client.search', () => {
  let client;
  beforeEach(async () => {
    client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    mockFetchForPath({ 'index.json': INDEX, 'list_1.json': PAGE_1, 'list_2.json': PAGE_2 });
  });

  it('returns posts matching all query terms', async () => {
    const results = await client.search('Post A');
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('post-a');
  });

  it('matches on metatags', async () => {
    const results = await client.search('js');
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('post-c');
  });

  it('returns empty array when nothing matches', async () => {
    const results = await client.search('nonexistent term xyz');
    expect(results).toEqual([]);
  });

  it('throws for empty query', async () => {
    await expect(client.search('')).rejects.toThrow('query');
  });
});

describe('client.getIndex / clearCache', () => {
  it('returns null before any fetch', () => {
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    expect(client.getIndex()).toBeNull();
  });

  it('returns index data after getAllPosts is called', async () => {
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    mockFetchForPath({ 'index.json': INDEX, 'list_1.json': PAGE_1, 'list_2.json': PAGE_2 });
    await client.getAllPosts();
    expect(client.getIndex()).toMatchObject({ totalPosts: 3 });
  });

  it('clearCache removes cached data', async () => {
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    mockFetchForPath({ 'index.json': INDEX, 'list_1.json': PAGE_1, 'list_2.json': PAGE_2 });
    await client.getAllPosts();
    client.clearCache();
    expect(client.getIndex()).toBeNull();
  });
});
