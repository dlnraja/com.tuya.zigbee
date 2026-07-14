#!/usr/bin/env node
/**
 * forum-fetch-140352.js — P53
 *
 * Fetches ALL messages from the Homey community forum topic #140352
 * (Universal Tuya Zigbee Device App — main user feedback channel).
 *
 * Discourse API: https://docs.discourse.org/
 *   GET /t/{id}.json — topic + first 20 posts
 *   GET /t/{id}/posts.json?page=N — additional pages (30 posts each)
 *
 * Output:
 *   .github/state/forum/topic-140352-meta.json
 *   .github/state/forum/topic-140352-posts.json (all 2031+)
 *   .github/state/forum/topic-140352-summary.json (stats per user + mfr+pid extraction)
 *
 * Run: node tools/ci/forum-fetch-140352.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'forum');
const TOPIC_ID = 140352;
const BASE = 'https://community.homey.app';

const MFR_REGEX = /_T[YZ](?:E200|E2[E2]8[0-9]|ZB\d{2}|Z3000|Z3210)[_-][A-Za-z0-9]+/g;
const PID_REGEX = /\bTS\d{4}[A-Z]?\b/g;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mavis-Forum/1.0', 'Accept': 'application/json' },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('JSON parse: ' + e.message + ' — body head: ' + body.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('timeout')));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractMfrsPid(text) {
  return {
    mfrs: [...new Set((text.match(MFR_REGEX) || []).map(s => s.toUpperCase()))],
    pids: [...new Set((text.match(PID_REGEX) || []))],
  };
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('=== Forum topic 140352 fetch ===');
  fs.mkdirSync(STATE_DIR, { recursive: true });

  // 1. Topic meta + first 20 posts
  console.log('Fetching topic meta...');
  const topic = await fetchJson(BASE + '/t/' + TOPIC_ID + '.json');
  const totalPosts = topic.posts_count || topic.posts?.length || 0;
  console.log('  Topic:', topic.title);
  console.log('  Posts count:', totalPosts);
  console.log('  Created:', topic.created_at);
  console.log('  Last activity:', topic.last_posted_at);
  console.log('  Views:', topic.views);

  // Save raw topic meta
  fs.writeFileSync(path.join(STATE_DIR, 'topic-140352-meta.json'), JSON.stringify({
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    posts_count: topic.posts_count,
    created_at: topic.created_at,
    last_posted_at: topic.last_posted_at,
    views: topic.views,
    like_count: topic.like_count,
    reply_count: topic.reply_count,
    participants: (topic.details?.participants || []).slice(0, 30).map(p => ({
      username: p.username, name: p.name, post_count: p.post_count,
    })),
  }, null, 2));

  // 2. Fetch all posts
  // Discourse pagination: /t/{id}.json?page=N returns the topic with posts 1..30 on page 1
  // To get posts beyond that, you need to use the post stream: /t/{id}/posts.json?post_ids[]=...
  // OR a different approach: /search.json?q=...
  // Easiest: /t/{id}.json with a 'page' parameter on the post stream.
  // Actually the working endpoint is /t/{id}.json (returns all posts in post_stream.posts, capped at 30).
  // For more: /t/{id}/posts.json returns posts[]. The trick is to look at post_stream.posts[].id and use the post_ids.
  //
  // Per Discourse docs: for big topics, the recommended way is to use the post IDs from the
  // topic's posts[] array, then fetch each. Or use the /posts.json?topic_id=ID endpoint.
  //
  // Let's use: /posts.json?topic_id=ID&page=N (paginated, ~50/page)

  const allPosts = topic.post_stream?.posts ? [...topic.post_stream.posts] : (topic.posts ? [...topic.posts] : []);
  const perPage = 50;
  const totalFromMeta = topic.posts_count || totalPosts;
  const pages = Math.ceil((totalFromMeta - allPosts.length) / perPage);
  console.log('Already have:', allPosts.length, 'posts from meta');
  console.log('Fetching remaining ' + pages + ' pages of ' + perPage + ' posts each via /posts.json?topic_id=...');

  for (let p = 1; p <= pages + 2; p++) {
    process.stdout.write('  page ' + p + '...');
    try {
      const data = await fetchJson(BASE + '/posts.json?topic_id=' + TOPIC_ID + '&page=' + p);
      const batch = (data.posts || []).filter(x => !allPosts.find(y => y.id === x.id));
      if (batch.length === 0) {
        console.log(' (no new posts, total=' + allPosts.length + ')');
        if (allPosts.length >= totalFromMeta) break;
        continue;
      }
      allPosts.push(...batch);
      console.log(' +' + batch.length + ' (total=' + allPosts.length + ')');
      if (allPosts.length >= totalFromMeta) {
        console.log('  (reached target ' + totalFromMeta + ')');
        break;
      }
    } catch (e) {
      console.log(' FAILED: ' + e.message);
    }
    await sleep(500); // rate limit
  }
  console.log('Total posts fetched:', allPosts.length);

  // 3. Extract mfrs+pids per post
  console.log('Extracting mfrs+pids per post...');
  const enriched = allPosts.map(p => {
    const text = stripHtml(p.cooked || '');
    const { mfrs, pids } = extractMfrsPid(text);
    return {
      id: p.id,
      post_number: p.post_number,
      username: p.username,
      name: p.name,
      created_at: p.created_at,
      reply_to_post_number: p.reply_to_post_number,
      text_excerpt: text.substring(0, 500),
      text_length: text.length,
      mfrs,
      pids,
      has_image: /<img\s/i.test(p.cooked || ''),
      image_urls: (p.cooked || '').match(/src="(https:\/\/[^"]+\.(?:jpe?g|png|gif|webp))"/gi) || [],
    };
  });

  // 4. Stats
  const userPostCount = {};
  const mfrCount = {};
  const pidCount = {};
  const postImages = enriched.filter(p => p.has_image);
  for (const p of enriched) {
    userPostCount[p.username] = (userPostCount[p.username] || 0) + 1;
    for (const m of p.mfrs) mfrCount[m] = (mfrCount[m] || 0) + 1;
    for (const p2 of p.pids) pidCount[p2] = (pidCount[p2] || 0) + 1;
  }
  const summary = {
    meta: { generatedAt: new Date().toISOString(), topicId: TOPIC_ID, totalPosts: allPosts.length, totalImages: postImages.length },
    topUsers: Object.entries(userPostCount).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([u, c]) => ({ username: u, posts: c })),
    topMfrs: Object.entries(mfrCount).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([m, c]) => ({ mfr: m, mentions: c })),
    topPids: Object.entries(pidCount).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([p, c]) => ({ pid: p, mentions: c })),
    postsWithImages: postImages.length,
  };

  // 5. Save
  fs.writeFileSync(path.join(STATE_DIR, 'topic-140352-posts.json'), JSON.stringify(enriched, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'topic-140352-summary.json'), JSON.stringify(summary, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log('Total posts:', enriched.length);
  console.log('Posts with images:', postImages.length);
  console.log('Unique mfrs mentioned:', Object.keys(mfrCount).length);
  console.log('Unique pids mentioned:', Object.keys(pidCount).length);
  console.log('\nTop users:');
  for (const u of summary.topUsers.slice(0, 10)) {
    console.log('  ' + u.username.padEnd(28) + ' ' + u.posts);
  }
  console.log('\nTop mfrs:');
  for (const m of summary.topMfrs.slice(0, 10)) {
    console.log('  ' + m.mfr.padEnd(28) + ' ' + m.mentions);
  }
  console.log('\nTop pids:');
  for (const p of summary.topPids.slice(0, 10)) {
    console.log('  ' + p.pid.padEnd(10) + ' ' + p.mentions);
  }
  console.log('\nOutput: ' + STATE_DIR);
}

main().catch(e => { console.error('FATAL:', e.stack || e.message); process.exit(1); });
