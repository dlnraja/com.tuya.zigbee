// search-forum-v2.js — try different Discourse API endpoints
const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'curl/7.0' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function search() {
  // Try /c/7/show.json (Discourse standard)
  console.log('=== Category 7 (Apps) show.json ===');
  let r = await get('https://community.homey.app/c/7/show.json');
  console.log('  Status:', r.status, 'Type:', r.headers?.['content-type']);
  if (r.body && r.body.startsWith('{')) {
    try {
      const data = JSON.parse(r.body);
      console.log('  Topic count:', data.topic_list?.topics?.length);
      for (const t of (data.topic_list?.topics || []).slice(0, 10)) {
        console.log('  - #' + t.id + ' [' + (t.like_count || 0) + ' likes, ' + (t.posts_count || 0) + ' posts] ' + t.title);
      }
    } catch (e) {
      console.log('  Parse error:', e.message);
    }
  } else {
    console.log('  Body:', r.body?.substring(0, 200));
  }

  // Try /c/7.json (top-level category)
  console.log('\n=== Category 7 (Apps) c/7.json ===');
  r = await get('https://community.homey.app/c/7.json');
  console.log('  Status:', r.status);
  if (r.body?.startsWith('{')) {
    try {
      const data = JSON.parse(r.body);
      console.log('  Keys:', Object.keys(data).slice(0, 10));
      if (data.topics) for (const t of data.topics.slice(0, 5)) {
        console.log('  - ' + t.title);
      }
    } catch (e) { console.log('  Parse error'); }
  }

  // Search with /search.json?q=... (Discourse proper)
  console.log('\n=== SEARCH /search.json ===');
  for (const q of ['tuya', 'zigbee', 'dlnraja', 'TS0601', '_TZE200']) {
    r = await get('https://community.homey.app/search.json?q=' + encodeURIComponent(q));
    console.log('  q=' + q + ': status=' + r.status);
    if (r.body?.startsWith('[') || r.body?.startsWith('{')) {
      try {
        const data = JSON.parse(r.body);
        if (Array.isArray(data)) {
          console.log('    Found:', data.length);
          for (const item of data.slice(0, 3)) console.log('    - ' + (item.title || '').substring(0, 70));
        } else if (data.topics) {
          console.log('    Found:', data.topics.length);
        }
      } catch (e) { console.log('    Parse error'); }
    } else {
      console.log('    Not JSON');
    }
  }

  // Try /latest.json
  console.log('\n=== LATEST TOPICS /latest.json ===');
  r = await get('https://community.homey.app/latest.json');
  console.log('  Status:', r.status);
  if (r.body?.startsWith('{')) {
    try {
      const data = JSON.parse(r.body);
      const topics = data.topic_list?.topics || [];
      console.log('  Total topics:', topics.length);
      for (const t of topics.slice(0, 10)) {
        if (t.title.match(/tuya|zigbee|dlnraja/i)) {
          console.log('  - ' + t.title);
        }
      }
    } catch (e) { console.log('  Parse error'); }
  }
}

search().catch(console.error);
