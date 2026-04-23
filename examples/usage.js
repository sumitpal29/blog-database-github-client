import { createBlogClient } from '../src/index.js';

async function run() {
  console.log('--- @blog-database/client Example ---');

  // 1. Initialize client
  // Make sure this matches your actual GitHub repository and data structure
  const client = createBlogClient({
    repo: 'sumitpal/blog_database', // Or whichever repo the projects folder is uploaded to
    branch: 'main',
    project: 'test', // We migrated the "test" project earlier
  });

  try {
    // 2. Fetch page 1 list
    console.log('\nFetching generic page 1... (will fail if repo is private or not pushed)');
    const page = await client.getPosts(1);
    console.log(`Found ${page.totalPosts} total posts.`);
    console.log('Page 1 items:', page.items);

    if (page.items.length > 0) {
      // 3. Fetch full content of the first post
      const firstSlug = page.items[0].slug;
      console.log(`\nFetching full post: ${firstSlug}...`);
      const post = await client.getPost(firstSlug);
      console.log(`Title: ${post.frontmatter.title}`);
      console.log(`Content extract:\n${post.content.slice(0, 100)}...`);

      // 4. Test Search
      console.log('\nSearching for title keywords...');
      const results = await client.search(post.frontmatter.title.split(' ')[0]);
      console.log(`Search results: ${results.length} matches found.`);
    }

  } catch (err) {
    console.error('\n[Error running example]:', err.message);
    console.log('Ensure that:');
    console.log('1. The repo sumitpal/blog_database exists and is public.');
    console.log('2. The "test" project is pushed to the "main" branch.');
    console.log('3. The backend has generated "meta/list_1.json".');
  }
}

run();
