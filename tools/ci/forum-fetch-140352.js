#!/usr/bin/env node
/**
 * forum-fetch-140352.js — P53 v2
 *
 * Fetches ALL messages from the Homey community forum topic #140352
 * (Universal Tuya Zigbee Device App — main user feedback channel).
 *
 * KEY INSIGHT: Discourse returns the full topic when using a browser-like
 * User-Agent. The JSON API is normally rate-limited + only returns 20 posts.
 * With a Chrome User-Agent, the full topic (2032 posts) is returned in
 * `post_stream.posts` (sometimes with all of them if `chunk_size` allows).
 *
 * Discourse API: https://docs.discourse.org/
 *   GET /t/{id}.json — topic + post_stream
 *   GET /t/{id}/posts.json?post_ids[]=... — for additional posts
 *
 * Output:
 *   .github/state/forum/topic-140352-meta.json
 *   .github/state/forum/topic-140352-posts.json
 *   .github/state/forum/topic-140352-summary.json
 *
 * Run: node tools/ci/forum-fetch-140352.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { SmartFetcher } = require(path.resolve(__dirname, '..', '..', 'lib', 'scraper', 'smart-fetch'));

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'forum');
const TOPIC_ID = 140352;
const BASE = 'https://community.homey.app';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MFR_REGEX = /_T[YZ](?:E200|E2[E2]8[0-9]|ZB\d{2}|Z3000|Z3210)[_-][A-Za-z0-9]+/g;
const PID_REGEX = /\bTS\d{4}[A-Z]?\b/g;

// P55 — smart fetcher with browser UA + cache + retry + adaptive rate limit
const fetcher = new SmartFetcher({
  source: 'forum-topic-140352',
  userAgent: UA,
  concurrency: 4,
  maxRetries: 2,
  baseBackoffMs: 5000,
  defaultDelay: 400,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'identity',
    'Referer': 'https://community.homey.app/',
  },
});

async function fetchJson(url, opts) {
  opts = opts || {};
  const r = await fetcher.fetch(url, {
    headers: opts.accept ? { 'Accept': opts.accept } : {},
  });
  if (r.statusCode !== 200) {
    throw new Error('HTTP ' + r.statusCode + ' for ' + url);
  }
  const body = r.body.toString('utf8');
  try { return JSON.parse(body); }
  catch (e) { throw new Error('JSON parse: ' + e.message + ' — body head: ' + body.substring(0, 200)); }
}

// Puppeteer fallback for when the JSON API is rate-limited or returns HTML.
// Requires: npm install puppeteer (~200MB Chromium download).
// Usage: set FORUM_USE_PUPPETEER=1 in the environment.
// Intelligent wait: we wait for the page to load, then for the JS to finish
// rendering posts (3-5s after navigation, because Discourse loads posts lazily).

async function fetchJsonPuppeteer(url) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    throw new Error('Puppeteer not installed — run `npm install puppeteer` to enable this fallback');
  }
  console.log('  [puppeteer] Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.5', 'Referer': 'https://community.homey.app/' });

    // For API endpoints, just fetch the JSON directly via page.goto + page.content
    if (url.includes('.json')) {
      const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      if (!res || !res.ok()) throw new Error('HTTP ' + (res ? res.status() : 'unknown') + ' via Puppeteer');
      // Wait for lazy-loaded content (Discourse loads posts via JS)
      await new Promise(r => setTimeout(r, 3000));
      const body = await page.content();
      // Strip HTML wrapper if present
      const json = body.replace(/^<pre[^>]*>/, '').replace(/<\/pre>$/, '').trim();
      return JSON.parse(json);
    }
    // For HTML pages, wait for posts to render
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    // Intelligent wait: scroll to bottom to trigger lazy loading
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    // Wait for any post elements
    try {
      await page.waitForSelector('.topic-post, .post', { timeout: 10000 });
    } catch (e) {
      console.log('  [puppeteer] No posts selector found, returning HTML anyway');
    }
    return await page.content();
  } finally {
    await browser.close();
  }
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
  console.log('=== Forum topic 140352 fetch (v2 with browser UA + Puppeteer fallback) ===');
  fs.mkdirSync(STATE_DIR, { recursive: true });

  const USE_PUPPETEER = process.env.FORUM_USE_PUPPETEER === '1';
  const fetch = USE_PUPPETEER ? fetchJsonPuppeteer : fetchJson;
  if (USE_PUPPETEER) console.log('  Mode: PUPPETEER (slow but reliable)');

  // 1. Topic meta
  console.log('Fetching topic meta...');
  let topic;
  try {
    topic = await fetch(BASE + '/t/' + TOPIC_ID + '.json');
  } catch (e) {
    if (USE_PUPPETEER) throw e;
    console.log('  JSON API failed, falling back to Puppeteer...');
    topic = await fetchJsonPuppeteer(BASE + '/t/' + TOPIC_ID + '.json');
  }
  const totalPosts = topic.posts_count || 0;
  console.log('  Topic:', topic.title);
  console.log('  Posts count:', totalPosts);
  console.log('  Created:', topic.created_at);
  console.log('  Last activity:', topic.last_posted_at);
  console.log('  Views:', topic.views);
  console.log('  Participants:', topic.details?.participants?.length || 0);

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
    participants: (topic.details?.participants || []).slice(0, 50).map(p => ({
      username: p.username, name: p.name, post_count: p.post_count,
    })),
    stream_post_ids_count: topic.post_stream?.stream?.length || 0,
  }, null, 2));

  // 2. Fetch all posts
  // Discourse returns up to 20 posts in post_stream.posts by default.
  // Use the /t/{id}/posts.json endpoint with the stream IDs.
  const streamIds = topic.post_stream?.stream || [];
  const allPosts = topic.post_stream?.posts ? [...topic.post_stream.posts] : [];
  console.log('Stream IDs:', streamIds.length, '| Initial posts from meta:', allPosts.length);

  // Try fetching the rest via the per-post stream
  if (streamIds.length > allPosts.length) {
    console.log('Fetching remaining ' + (streamIds.length - allPosts.length) + ' posts via /t/' + TOPIC_ID + '/posts.json...');
    // Discourse has a post_ids[] param. Use it in chunks of 20.
    const chunkSize = 20;
    const have = new Set(allPosts.map(p => p.id));
    const want = streamIds.filter(id => !have.has(id));
    // Build all URLs upfront
    const chunkUrls = [];
    for (let i = 0; i < want.length; i += chunkSize) {
      const chunk = want.slice(i, i + chunkSize);
      const params = chunk.map(id => 'post_ids[]=' + id).join('&');
      chunkUrls.push({ idx: i, url: BASE + '/t/' + TOPIC_ID + '/posts.json?' + params });
    }
    console.log('  ' + chunkUrls.length + ' chunks to fetch (parallel, concurrency=' + fetcher.concurrency + ')...');
    // P55 — fetch in parallel (smartFetcher handles cache + retry + 429 backoff)
    const tChunks = Date.now();
    const chunkResults = await fetcher.fetchAll(chunkUrls.map(c => c.url), {
      concurrency: fetcher.concurrency,
      onProgress: (d, t) => process.stdout.write(`\r  chunk ${d}/${t}    `),
    });
    console.log(`\r  Chunks done in ${Date.now() - tChunks}ms`);
    for (let i = 0; i < chunkUrls.length; i++) {
      const r = chunkResults[i];
      if (r.error || !r.body) {
        console.log('  chunk ' + (i + 1) + ' FAILED: ' + r.error);
        continue;
      }
      try {
        const data = JSON.parse(r.body.toString('utf8'));
        const batch = (data.post_stream?.posts || data.posts || []).filter(x => !have.has(x.id));
        allPosts.push(...batch);
      } catch (e) {
        console.log('  chunk ' + (i + 1) + ' parse error: ' + e.message);
      }
    }
  }
  console.log('Total posts fetched:', allPosts.length, '/', totalPosts);

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
    meta: { generatedAt: new Date().toISOString(), topicId: TOPIC_ID, totalPosts: allPosts.length, totalImages: postImages.length, fetchedPct: ((allPosts.length/totalPosts)*100).toFixed(1) + '%' },
    topUsers: Object.entries(userPostCount).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([u, c]) => ({ username: u, posts: c })),
    topMfrs: Object.entries(mfrCount).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([m, c]) => ({ mfr: m, mentions: c })),
    topPids: Object.entries(pidCount).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([p, c]) => ({ pid: p, mentions: c })),
    postsWithImages: postImages.length,
  };

  // 5. Save
  fs.writeFileSync(path.join(STATE_DIR, 'topic-140352-posts.json'), JSON.stringify(enriched, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'topic-140352-summary.json'), JSON.stringify(summary, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log('Total posts:', enriched.length, '/', totalPosts, '(' + summary.meta.fetchedPct + ')');
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
