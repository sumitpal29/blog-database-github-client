import { createBlogClient } from '../src/index.js';

async function run() {
  console.log('--- blog-database-github-client Example ---\n');

  const client = createBlogClient({
    repo: 'your-username/your-repo', // replace with your GitHub repo
    branch: 'main',
    project: 'your_project',         // replace with your project folder name
  });

  try {
    // ── Posts ──────────────────────────────────────────────────────────────────

    // Fetch a single page
    console.log('Fetching page 1 of posts...');
    const page1 = await client.getPosts(1);
    console.log(`Total posts: ${page1.totalPosts}`);
    console.log('Page 1 items:', page1.items.map(p => p.slug));

    // Paginate through all pages
    const index = await client.getIndex();
    if (index) {
      console.log(`\nTotal pages: ${index.totalPages}`);
      for (let p = 1; p <= index.totalPages; p++) {
        const page = await client.getPosts(p);
        console.log(`  Page ${p}: ${page.items.length} posts`);
      }
    }

    // Fetch all posts at once (parallel)
    const allPosts = await client.getAllPosts();
    console.log(`\nAll posts (${allPosts.length} total):`, allPosts.map(p => p.slug));

    if (allPosts.length > 0) {
      // Fetch full content of the first post
      const firstSlug = allPosts[0].slug;
      console.log(`\nFetching full post: ${firstSlug}...`);
      const post = await client.getPost(firstSlug);
      console.log(`  Title: ${post.frontmatter.title}`);
      console.log(`  Content (first 100 chars): ${post.content.slice(0, 100)}...`);
    }

    // Search across all posts (AND logic — all terms must match)
    console.log('\nSearching for "javascript tips"...');
    const results = await client.search('javascript tips');
    console.log(`  ${results.length} results found`);

    // ── Books ──────────────────────────────────────────────────────────────────

    // List all books
    console.log('\nFetching books...');
    const books = await client.getBooks();
    console.log('Books:', books.map(b => b.slug));

    if (books.length > 0) {
      const firstBook = books[0].slug;

      // Fetch the book's file/folder tree
      console.log(`\nFetching book map for: ${firstBook}`);
      const map = await client.getBookMap(firstBook);
      console.log('Book name:', map.name);
      console.log('Top-level items:', map.tree.items.map(i => i.name));

      // Fetch a specific chapter/file within the book
      if (map.tree.items.length > 0) {
        const firstFile = map.tree.items.find(i => i.type === 'file');
        if (firstFile) {
          console.log(`\nFetching file: ${firstFile.path}`);
          const chapter = await client.getBookFile(firstBook, firstFile.path);
          console.log(`  Content (first 100 chars): ${chapter.content.slice(0, 100)}...`);
        }
      }
    }

    // ── Cache ──────────────────────────────────────────────────────────────────
    client.clearCache();
    console.log('\nCache cleared.');

  } catch (err) {
    console.error('\n[Error]:', err.message);
    console.log('\nMake sure:');
    console.log('1. The repo exists and is public on GitHub.');
    console.log('2. The project folder is pushed to the branch.');
    console.log('3. You have run "Generate" in the CMS so meta files exist.');
  }
}

run();
