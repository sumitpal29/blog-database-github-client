/**
 * @module buildUrl
 * Constructs GitHub raw content URLs for fetching blog files.
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

/**
 * Build a raw GitHub URL for a file inside a project.
 *
 * @param {object} config
 * @param {string} config.repo   - GitHub repo in "owner/repo" format (e.g. "sumitpal/blog_database")
 * @param {string} config.branch - Branch name (e.g. "main")
 * @param {string} config.project - Project folder name (e.g. "personal_blog")
 * @param {string} filePath      - Relative path inside the project (e.g. "posts/my-blog.md")
 * @returns {string} Full raw GitHub URL
 *
 * @example
 * buildUrl({ repo: 'sumitpal/blog_database', branch: 'main', project: 'personal_blog' }, 'meta/list_1.json')
 * // => 'https://raw.githubusercontent.com/sumitpal/blog_database/main/personal_blog/meta/list_1.json'
 */
export function buildUrl(config, filePath) {
  const { repo, branch, project } = config;

  if (!repo || !branch || !project) {
    throw new Error('[buildUrl] Missing required config: repo, branch, and project are all required.');
  }
  if (!filePath) {
    throw new Error('[buildUrl] filePath is required.');
  }

  // Normalise: strip leading slashes so we don't produce double slashes
  const normalised = filePath.replace(/^\/+/, '');
  return `${GITHUB_RAW_BASE}/${repo}/${branch}/${project}/${normalised}`;
}
