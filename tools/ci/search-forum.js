// search-forum.js — search forum for our app
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
  // Get top topics in Apps category (id=7) and Devices (id=6)
  for (const catId of [7, 6, 8]) {
    console.log('\n=== Category ' + catId + ' top topics ===');
    const r = await get('https://community.homey.app/c/' + catId + '.json');
    if (r.body) {
      try {
        const data = JSON.parse(r.body);
        const topics = data.topic_list?.topics || [];
        console.log('  Topics:', topics.length);
        for (const t of topics.slice(0, 10)) {
          console.log('  - #' + t.id + ' [' + t.like_count + ' likes, ' + t.posts_count + ' posts] ' + t.title);
        }
      } catch (e) {
        console.log('  Parse error:', e.message);
      }
    }
  }

  // Search for our app - try a workaround for the anti-bot
  console.log('\n=== SEARCH via tag URL ===');
  const searchTerms = ['tuya-zigbee', 'dlnraja', 'universal-tuya', 'com.dlnraja.tuya.zigbee'];
  for (const term of searchTerms) {
    const r = await get('https://community.homey.app/tag/' + encodeURIComponent(term));
    console.log('  tag/' + term + ':', r.status);
    if (r.status === 200 && r.body.includes('topic')) {
      const matches = r.body.match(/<a href="\/t\/[^"]+"[^>]*>([^<]+)<\/a>/g) || [];
      console.log('  Topics found:', matches.length);
      for (const m of matches.slice(0, 5)) {
        const title = m.match(/>([^<]+)</)?.[1] || '';
        console.log('    ' + title);
      }
    }
  }

  // Try the show.json endpoint for specific topics
  console.log('\n=== Direct search for our app via Topics API ===');
  // Discourse supports: /search/query?term=...
  const r = await get('https://community.homey.app/search/query?term=tuya%20zigbee&type=topic');
  console.log('  search/query:', r.status, r.body?.substring(0, 300));
}

search().catch(console.error);
