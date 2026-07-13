// search-forum-posts-v2.js — proper search for our app
const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'curl/7.0' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function search() {
  const queries = ['dlnraja', 'com.dlnraja.tuya.zigbee', 'Universal TUYA Zigbee'];
  const allTopics = new Map();
  const allPosts = [];

  for (const q of queries) {
    console.log('\n=== Search: ' + q + ' ===');
    for (let page = 1; page <= 10; page++) {
      const r = await get('https://community.homey.app/search.json?q=' + encodeURIComponent(q) + '&page=' + page);
      if (!r.body || !r.body.startsWith('{')) {
        console.log('  Page ' + page + ': no JSON');
        break;
      }
      try {
        const data = JSON.parse(r.body);
        const posts = data.posts || [];
        const topics = data.topics || [];
        if (posts.length === 0 && topics.length === 0) break;
        console.log('  Page ' + page + ': ' + posts.length + ' posts, ' + topics.length + ' topics');
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
        console.log('  Parse error:', e.message);
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

  // Get full post content for top 5 topics
  console.log('\n=== GET FULL POSTS ===');
  const topics = [...allTopics.values()].slice(0, 10);
  for (const t of topics) {
    const r = await get('https://community.homey.app/t/' + t.id + '.json');
    if (r.body?.startsWith('{')) {
      const data = JSON.parse(r.body);
      t.posts = (data.post_stream?.posts || []).map(p => ({
        id: p.id,
        username: p.username,
        created_at: p.created_at,
        like_count: p.like_count,
        raw: p.raw?.substring(0, 2000),
        cooked: p.cooked?.substring(0, 3000)
      }));
      console.log('  - ' + t.title + ' (' + t.posts.length + ' posts)');
    }
  }

  // Save
  const result = { meta: { generatedAt: new Date().toISOString() }, topics: [...allTopics.values()], posts: allPosts };
  fs.writeFileSync('.github/state/forum-search-results.json', JSON.stringify(result, null, 2));
  console.log('\nSaved to .github/state/forum-search-results.json');
}

search().catch(console.error);
