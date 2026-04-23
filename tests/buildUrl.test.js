import { describe, it, expect } from 'vitest';
import { buildUrl } from '../src/utils/buildUrl.js';

const cfg = { repo: 'owner/repo', branch: 'main', project: 'my_blog' };

describe('buildUrl', () => {
  it('builds the correct raw GitHub URL', () => {
    expect(buildUrl(cfg, 'meta/index.json')).toBe(
      'https://raw.githubusercontent.com/owner/repo/main/my_blog/meta/index.json'
    );
  });

  it('strips a leading slash from filePath', () => {
    expect(buildUrl(cfg, '/posts/hello.md')).toBe(
      'https://raw.githubusercontent.com/owner/repo/main/my_blog/posts/hello.md'
    );
  });

  it('handles nested paths', () => {
    expect(buildUrl(cfg, 'meta/list_2.json')).toContain('list_2.json');
  });

  it('throws when repo is missing', () => {
    expect(() => buildUrl({ branch: 'main', project: 'p' }, 'f.json')).toThrow('repo');
  });

  it('throws when branch is missing', () => {
    expect(() => buildUrl({ repo: 'o/r', project: 'p' }, 'f.json')).toThrow('branch');
  });

  it('throws when project is missing', () => {
    expect(() => buildUrl({ repo: 'o/r', branch: 'main' }, 'f.json')).toThrow('project');
  });

  it('throws when filePath is missing', () => {
    expect(() => buildUrl(cfg, '')).toThrow('filePath');
  });
});
