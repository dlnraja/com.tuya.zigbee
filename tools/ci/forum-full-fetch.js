#!/usr/bin/env node
/**
 * forum-full-fetch.js — P87
 * Fetch ALL posts from topic 140352 + search related topics on community.homey.app.
 * Then for each post, capture: id, num, user, date, full text, FPs, imageUrls.
 * Saves to .github/state/forum/full-140352.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, '.github', 'state', 'forum', 'full-140352.json');
const TOPIC_ID = '140352';
const MAX_PAGES = 200;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'dlnraja-com.tuya.zigbee/9.0', 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`JSON parse error: ${e.message} for ${url}`)); }
        } else { reject(new Error(`HTTP ${res.statusCode} for ${url}`)); }
      });
    }).on('error', reject);
  });
}

const FP_REGEX = /_T[A-Z0-9]+_[A-Za-z0-9]{4,}/g;
const IMG_REGEX = /<img[^>]+src="([^"]+)"/g;
function extractFPs(text) {
  if (!text) return [];
  return [...new Set((text.match(FP_REGEX) || []).map(m => m.toLowerCase()))];
}
function extractImages(html) {
  if (!html) return [];
  const out = [];
  let m; while ((m = IMG_REGEX.exec(html))) out.push(m[1]);
  return out;
}

async function main() {
  console.error('Fetching full thread 140352...');
  const all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `https://community.homey.app/t/${TOPIC_ID}.json?page=${page}&include_raw=1`;
    let topic;
    try { topic = await fetchJson(url); }
    catch (e) { console.error(`page ${page} ERR: ${e.message}`); break; }
    const posts = (topic.post_stream && topic.post_stream.posts) || [];
    if (posts.length === 0) break;
    all.push(...posts);
    if (posts.length < 20) break;
  }
  const map = new Map();
  for (const p of all) map.set(p.id, p);
  const merged = [...map.values()].sort((a, b) => a.post_number - b.post_number);
  console.error(`Got ${merged.length} posts`);
  const out = {
    topicId: TOPIC_ID,
    fetchedAt: new Date().toISOString(),
    totalPosts: merged.length,
    posts: merged.map(p => ({
      postId: p.id,
      postNumber: p.post_number,
      username: p.username,
      name: p.name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      cooked: p.cooked,
      excerpt: (p.cooked || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500),
      fps: extractFPs(p.cooked),
      images: extractImages(p.cooked)
    }))
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  // Print a quick summary
  const allFPs = [...new Set(out.posts.flatMap(p => p.fps))];
  const allImages = out.posts.flatMap(p => p.images);
  console.log(JSON.stringify({
    totalPosts: out.totalPosts,
    totalFPs: allFPs.length,
    totalImages: allImages.length,
    lastDate: out.posts[out.posts.length-1] && out.posts[out.posts.length-1].createdAt,
    firstDate: out.posts[0] && out.posts[0].createdAt,
    fpList: allFPs
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
