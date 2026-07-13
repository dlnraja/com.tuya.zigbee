// search-forum-posts.js — search and save forum results for our app
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
  const queries = ['dlnraja', 'com.dlnraja.tuya.zigbee', 'tuya zigbee dlnraja'];
  const allResults = [];

  for (const q of queries) {
    console.log('\n=== Search: ' + q + ' ===');
    for (let page = 1; page <= 5; page++) {
      const r = await get('https://community.homey.app/search.json?q=' + encodeURIComponent(q) + '&page=' + page);
      if (!r.body || !r.body.startsWith('[')) {
        console.log('  Page ' + page + ': no JSON');
        break;
      }
      try {
        const data = JSON.parse(r.body);
        if (data.length === 0) break;
        console.log('  Page ' + page + ': ' + data.length + ' results');
        for (const item of data) {
          allResults.push({
            id: item.id,
            title: item.title,
            slug: item.slug,
            url: 'https://community.homey.app/t/' + item.slug + '/' + item.id,
            category_id: item.category_id,
            like_count: item.like_count,
            posts_count: item.posts_count,
            created_at: item.created_at,
            bumped_at: item.bumped_at,
            excerpt: item.excerpt?.substring(0, 300)
          });
        }
      } catch (e) {
        console.log('  Parse error:', e.message);
        break;
      }
    }
  }

  // Dedupe by id
  const seen = new Set();
  const deduped = allResults.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  console.log('\n=== TOTAL UNIQUE RESULTS ===');
  console.log('  Total:', deduped.length);

  // Save results
  fs.writeFileSync('.github/state/forum-search-results.json', JSON.stringify(deduped, null, 2));
  console.log('  Saved to .github/state/forum-search-results.json');

  // Show top 20
  for (const r of deduped.slice(0, 20)) {
    console.log('  - #' + r.id + ' [' + (r.like_count || 0) + ' likes, ' + (r.posts_count || 0) + ' posts] ' + r.title);
    if (r.excerpt) {
      console.log('    > ' + r.excerpt.replace(/<[^>]+>/g, '').substring(0, 200));
    }
  }

  // Also get full post content for the top 5
  console.log('\n=== GET FULL POST CONTENT ===');
  for (const r of deduped.slice(0, 5)) {
    const post = await get('https://community.homey.app/t/' + r.id + '.json');
    if (post.body?.startsWith('{')) {
      const data = JSON.parse(post.body);
      r.posts = (data.post_stream?.posts || []).map(p => ({
        id: p.id,
        username: p.username,
        created_at: p.created_at,
        cooked: p.cooked?.substring(0, 2000),
        raw: p.raw?.substring(0, 1000)
      }));
      console.log('  - ' + r.title + ' (posts: ' + r.posts.length + ')');
    }
  }

  // Save full results
  fs.writeFileSync('.github/state/forum-full-results.json', JSON.stringify(deduped, null, 2));
  console.log('\nSaved full results');
}

search().catch(console.error);
