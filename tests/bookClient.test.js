import { describe, it, expect, vi, afterEach } from 'vitest';
import { createBlogClient } from '../src/client.js';

const BASE_CONFIG = { repo: 'owner/repo', branch: 'main', project: 'my-docs' };

const BOOKS_INDEX = {
  books: [
    { slug: 'docs', name: 'docs', description: 'Main docs' },
    { slug: 'api-ref', name: 'api-ref', description: 'API reference' },
  ],
  generatedAt: '2026-01-01T00:00:00.000Z',
};

const BOOK_MAP = {
  slug: 'docs',
  name: 'docs',
  description: 'Main docs',
  type: 'book',
  generatedAt: '2026-01-01T00:00:00.000Z',
  tree: {
    name: 'docs',
    slug: 'docs',
    type: 'book',
    items: [
      { type: 'file', name: 'home', path: 'home.md', description: '' },
      {
        type: 'folder',
        name: 'concepts',
        path: 'concepts',
        description: '',
        items: [
          { type: 'file', name: 'overview', path: 'concepts/overview.md', description: '' },
        ],
      },
    ],
  },
};

const FILE_MD = `---\ntitle: Overview\ndescription: Core concepts\n---\n\n# Overview\n\nIntroduction text here.`;

function mockFetch(responses) {
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
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') });
  });
}

afterEach(() => vi.restoreAllMocks());

describe('getBooks()', () => {
  it('fetches books/index.json and returns the books array', async () => {
    mockFetch({ 'books/index.json': BOOKS_INDEX });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    const books = await client.getBooks();
    expect(books).toHaveLength(2);
    expect(books[0]).toMatchObject({ slug: 'docs', name: 'docs' });
  });

  it('returns empty array when books list is empty', async () => {
    mockFetch({ 'books/index.json': { books: [], generatedAt: '' } });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    const books = await client.getBooks();
    expect(books).toEqual([]);
  });

  it('caches the result on subsequent calls', async () => {
    mockFetch({ 'books/index.json': BOOKS_INDEX });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    await client.getBooks();
    await client.getBooks();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('getBookMap()', () => {
  it('fetches books/<slug>/map.json and returns the map', async () => {
    mockFetch({ 'books/docs/map.json': BOOK_MAP });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    const map = await client.getBookMap('docs');
    expect(map).toMatchObject({ slug: 'docs', type: 'book' });
    expect(map.tree.items).toHaveLength(2);
  });

  it('tree contains nested folder with items', async () => {
    mockFetch({ 'books/docs/map.json': BOOK_MAP });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    const map = await client.getBookMap('docs');
    const folder = map.tree.items.find(i => i.type === 'folder');
    expect(folder).toBeDefined();
    expect(folder.items).toHaveLength(1);
    expect(folder.items[0].path).toBe('concepts/overview.md');
  });

  it('throws if bookSlug is empty', async () => {
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    await expect(client.getBookMap('')).rejects.toThrow('bookSlug must be a non-empty string');
  });

  it('caches the result on subsequent calls', async () => {
    mockFetch({ 'books/docs/map.json': BOOK_MAP });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    await client.getBookMap('docs');
    await client.getBookMap('docs');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on 404 for unknown book', async () => {
    mockFetch({});
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    await expect(client.getBookMap('nonexistent')).rejects.toThrow();
  });
});

describe('getBookFile()', () => {
  it('fetches and parses markdown with front-matter', async () => {
    mockFetch({ 'books/docs/concepts/overview.md': FILE_MD });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    const file = await client.getBookFile('docs', 'concepts/overview.md');
    expect(file.bookSlug).toBe('docs');
    expect(file.path).toBe('concepts/overview.md');
    expect(file.frontmatter.title).toBe('Overview');
    expect(file.frontmatter.description).toBe('Core concepts');
    expect(file.content).toContain('Introduction text here.');
  });

  it('auto-appends .md extension when missing', async () => {
    mockFetch({ 'books/docs/home.md': '# Home\nWelcome.' });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    const file = await client.getBookFile('docs', 'home');
    expect(file.path).toBe('home.md');
  });

  it('caches the result on subsequent calls', async () => {
    mockFetch({ 'books/docs/home.md': '# Home' });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    await client.getBookFile('docs', 'home.md');
    await client.getBookFile('docs', 'home.md');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws if bookSlug is empty', async () => {
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    await expect(client.getBookFile('', 'home.md')).rejects.toThrow('bookSlug must be a non-empty string');
  });

  it('throws if filePath is empty', async () => {
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    await expect(client.getBookFile('docs', '')).rejects.toThrow('filePath must be a non-empty string');
  });

  it('throws on 404 for missing file', async () => {
    mockFetch({});
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    await expect(client.getBookFile('docs', 'missing.md')).rejects.toThrow();
  });

  it('returns empty content for file with no front-matter', async () => {
    mockFetch({ 'books/docs/simple.md': 'Just plain content.' });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    const file = await client.getBookFile('docs', 'simple.md');
    expect(file.content).toBe('Just plain content.');
    expect(file.frontmatter).toEqual({});
  });
});

describe('clearCache() clears book data too', () => {
  it('forces re-fetch after clearCache()', async () => {
    mockFetch({ 'books/docs/map.json': BOOK_MAP });
    const client = createBlogClient({ ...BASE_CONFIG, useLocalStorage: false });
    await client.getBookMap('docs');
    client.clearCache();
    await client.getBookMap('docs');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
