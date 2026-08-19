'use strict';
const https = require('https');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Encoding': 'identity' };

function fetchJSON(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, { headers: HEADERS }, r => {
      let d = '';
      r.on('data', c => { d += c; });
      r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { res({ _raw: d.slice(0, 500) }); } });
    });
    req.on('error', rej);
    req.setTimeout(20000, () => { req.destroy(); rej(new Error('timeout')); });
  });
}

function strip(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchPosts(topicId, postIds) {
  const qs = postIds.map(id => 'post_ids[]=' + id).join('&');
  const d = await fetchJSON('https://community.homey.app/t/' + topicId + '/posts.json?' + qs);
  return (d.post_stream ? d.post_stream.posts : []);
}

// Get post IDs for specific post numbers from topic stream
async function getPostIdsForNumbers(topicId, numbers) {
  const d = await fetchJSON('https://community.homey.app/t/' + topicId + '.json');
  const stream = d.post_stream ? d.post_stream.stream : [];
  // post_stream.stream maps index to post_id, and post number = index+1
  // Better: just fetch the topic JSON page that contains those posts
  // Actually stream is just a flat array of post IDs in order
  // We need to batch-fetch and match post_number
  const ids = [];
  // Heuristic: last 100 posts (numbers 2084-2183 → last 100 stream IDs)
  const lastN = stream.slice(-100);
  return lastN;
}

async function main() {
  const topicId = 140352;
  console.log('Fetching stream...');
  const meta = await fetchJSON('https://community.homey.app/t/' + topicId + '.json');
  const stream = meta.post_stream ? meta.post_stream.stream : [];

  // Fetch last 100 posts in batches of 20
  const lastIds = stream.slice(-100);
  const allPosts = [];
  for (let i = 0; i < lastIds.length; i += 20) {
    const batch = lastIds.slice(i, i + 20);
    const posts = await fetchPosts(topicId, batch);
    allPosts.push(...posts);
    await new Promise(r => setTimeout(r, 400));
  }

  // Print full content of key posts
  const KEY_NUMBERS = [2168, 2169, 2171, 2173, 2178, 2181, 2182, 2183, 2166, 2167];
  const key = allPosts.filter(p => KEY_NUMBERS.includes(p.post_number));
  for (const p of key) {
    const text = strip(p.cooked);
    const imgMatches = (p.cooked || '').match(/src=["']([^"']*(?:jpeg|jpg|png)[^"']*)["']/gi) || [];
    const images = imgMatches.map(m => m.replace(/src=["']/i, '').replace(/["']$/, ''));
    console.log('\n============================');
    console.log('POST #' + p.post_number + ' @' + p.username + ' [' + (p.created_at || '').slice(0, 10) + ']');
    console.log(text);
    if (images.length) { console.log('\nIMAGES:'); images.forEach(img => console.log(' ', img)); }
  }
}

main().catch(console.error);
