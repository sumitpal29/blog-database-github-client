import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchMarkdown } from '../src/utils/fetchMarkdown.js';

function mockFetch(status, body) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

afterEach(() => vi.restoreAllMocks());

const MD_WITH_FRONTMATTER = `---
title: Hello World
description: My first post
published: true
views: 42
---

# Hello World

Body content here.`;

const MD_NO_FRONTMATTER = `# Just a heading\n\nSome content.`;

describe('fetchMarkdown', () => {
  it('parses front-matter and body correctly', async () => {
    mockFetch(200, MD_WITH_FRONTMATTER);
    const { frontmatter, content } = await fetchMarkdown('https://example.com/post.md');
    expect(frontmatter.title).toBe('Hello World');
    expect(frontmatter.description).toBe('My first post');
    expect(frontmatter.published).toBe(true);
    expect(frontmatter.views).toBe(42);
    expect(content).toContain('Body content here.');
  });

  it('returns empty frontmatter when no front-matter block exists', async () => {
    mockFetch(200, MD_NO_FRONTMATTER);
    const { frontmatter, content } = await fetchMarkdown('https://example.com/plain.md');
    expect(frontmatter).toEqual({});
    expect(content).toContain('Just a heading');
  });

  it('throws on 404', async () => {
    mockFetch(404, '');
    await expect(fetchMarkdown('https://example.com/gone.md')).rejects.toThrow('404');
  });

  it('throws on non-ok server error', async () => {
    mockFetch(503, '');
    await expect(fetchMarkdown('https://example.com/err.md')).rejects.toThrow('503');
  });

  it('throws on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchMarkdown('https://example.com')).rejects.toThrow('Network error');
  });

  it('strips surrounding quotes from string values', async () => {
    const md = `---\ntitle: "Quoted Title"\nauthor: 'Single Quoted'\n---\nBody`;
    mockFetch(200, md);
    const { frontmatter } = await fetchMarkdown('https://example.com/q.md');
    expect(frontmatter.title).toBe('Quoted Title');
    expect(frontmatter.author).toBe('Single Quoted');
  });
});
