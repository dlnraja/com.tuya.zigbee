// search-forum-posts-v2.js — proper search for our app (P55 — uses smart-fetch)
const fs = require('fs');
const path = require('path');
const { SmartFetcher } = require(path.resolve(__dirname, '..', '..', 'lib', 'scraper', 'smart-fetch'));

// P55 — smart fetcher with browser UA + concurrency + cache + retry
const fetcher = new SmartFetcher({
  source: 'forum-search',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  concurrency: 4,
  maxRetries: 3,
  baseBackoffMs: 3000,
  defaultDelay: 250,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://community.homey.app/',
  },
});

async function get(url) {
  const r = await fetcher.fetch(url);
  return { status: r.statusCode, body: r.body.toString('utf8') };
}

async function search() {
  const queries = ['dlnraja', 'com.dlnraja.tuya.zigbee', 'Universal TUYA Zigbee'];
  const allTopics = new Map();
  const allPosts = [];

  for (const q of queries) {
    console.log('\n=== Search: ' + q + ' ===');
    // Build URLs for pages 1-10
    const urls = [];
    for (let page = 1; page <= 10; page++) {
      urls.push('https://community.homey.app/search.json?q=' + encodeURIComponent(q) + '&page=' + page);
    }
    // Fetch in parallel (smartFetcher handles cache + retry + 429 backoff)
    const results = await fetcher.fetchAll(urls, {
      concurrency: 4,
      onProgress: (d, t) => process.stdout.write(`\r  [${q}] ${d}/${t}    `),
    });
    for (let page = 1; page <= 10; page++) {
      const r = results[page - 1];
      if (r.error || !r.body) {
        console.log('\n  Page ' + page + ': ' + (r.error || 'no body'));
        break;
      }
      const body = r.body.toString('utf8');
      if (!body.startsWith('{')) {
        console.log('\n  Page ' + page + ': not JSON');
        break;
      }
      try {
        const data = JSON.parse(body);
        const posts = data.posts || [];
        const topics = data.topics || [];
        if (posts.length === 0 && topics.length === 0) break;
        console.log(`\n  Page ${page}: ${posts.length} posts, ${topics.length} topics (${r.fromCache ? (r.notModified ? 'CACHED 304' : 'CACHED stale') : 'FRESH'}, ${r.durationMs}ms)`);
        for (const t of topics) {
          if (!allTopics.has(t.id)) {
            allTopics.set(t.id, {
              id: t.id,
              title: t.title,
              slug: t.slug,
              url: 'https://community.homey.app/t/' + t.slug + '/' + t.id,
              category_id: t.category_id,
              like_count: t.like_count,
              posts_count: t.posts_count,
              views: t.views,
              created_at: t.created_at,
              bumped_at: t.bumped_at
            });
          }
        }
        allPosts.push(...posts);
      } catch (e) {
        console.log('\n  Page ' + page + ' parse error: ' + e.message);
        break;
      }
    }
  }

  console.log('\n=== TOTAL UNIQUE ===');
  console.log('  Topics:', allTopics.size);
  console.log('  Posts:', allPosts.length);

  // Show topics
  for (const t of allTopics.values()) {
    console.log('  - #' + t.id + ' [cat=' + t.category_id + '] ' + t.title);
  }

  // Get full post content for top 10 topics (parallel)
  console.log('\n=== GET FULL POSTS ===');
  const topics = [...allTopics.values()].slice(0, 10);
  const topicUrls = topics.map(t => 'https://community.homey.app/t/' + t.id + '.json');
  const tResults = await fetcher.fetchAll(topicUrls, { concurrency: 4 });
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    const r = tResults[i];
    if (r.error || !r.body) {
      console.log('  - ' + t.title + ' (error: ' + r.error + ')');
      continue;
    }
    try {
      const data = JSON.parse(r.body.toString('utf8'));
      t.posts = (data.post_stream?.posts || []).map(p => ({
        id: p.id,
        username: p.username,
        created_at: p.created_at,
        like_count: p.like_count,
        raw: p.raw?.substring(0, 2000),
        cooked: p.cooked?.substring(0, 3000)
      }));
      console.log('  - ' + t.title + ' (' + t.posts.length + ' posts)');
    } catch (e) {
      console.log('  - ' + t.title + ' (parse error)');
    }
  }

  // Save
  const result = { meta: { generatedAt: new Date().toISOString() }, topics: [...allTopics.values()], posts: allPosts };
  fs.writeFileSync('.github/state/forum-search-results.json', JSON.stringify(result, null, 2));
  console.log('\nSaved to .github/state/forum-search-results.json');
  console.log('Fetcher stats:', JSON.stringify(fetcher.getStats().metrics));
}

search().catch(console.error);
