#!/usr/bin/env node
/**
 * forum-tail.js — P87
 * Walks Discourse's /t/{id}.json?page=N to get ALL posts (or up to N pages),
 * then keeps the LAST 100 with their full content + FPs.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, '.github', 'state', 'forum', 'tail-100.json');
const TOPIC_ID = '140352';
const MAX_TAIL = 100;
const MAX_PAGES = 105; // safe upper bound for 2037 posts / ~20 per page

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'dlnraja-com.tuya.zigbee/9.0' } }, (res) => {
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
function extractFPs(text) {
  if (!text) return [];
  return [...new Set((text.match(FP_REGEX) || []).map(m => m.toLowerCase()))];
}

async function main() {
  const all = [];
  let last = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `https://community.homey.app/t/${TOPIC_ID}.json?page=${page}&include_raw=0`;
    process.stderr.write(`fetching page ${page} ... `);
    let topic;
    try { topic = await fetchJson(url); }
    catch (e) { process.stderr.write(`ERR ${e.message}\n`); break; }
    const posts = (topic.post_stream && topic.post_stream.posts) || [];
    if (posts.length === 0) { process.stderr.write('empty\n'); break; }
    process.stderr.write(`got ${posts.length}\n`);
    all.push(...posts);
    if (posts.length < 20) break;
    last = posts[posts.length - 1];
    if (last && last.post_number >= 2037) break;
  }
  // Dedupe by post_id
  const map = new Map();
  for (const p of all) map.set(p.id, p);
  const merged = [...map.values()].sort((a, b) => a.post_number - b.post_number);
  const tail = merged.slice(-MAX_TAIL);
  const out = {
    topicId: TOPIC_ID,
    fetchedAt: new Date().toISOString(),
    totalPosts: merged.length,
    tailSize: tail.length,
    tailStart: tail[0] && tail[0].post_number,
    tailEnd: tail[tail.length - 1] && tail[tail.length - 1].post_number,
    posts: tail.map(p => ({
      postId: p.id,
      postNumber: p.post_number,
      username: p.username,
      name: p.name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      cooked: p.cooked,
      excerpt: (p.cooked || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800),
      fps: extractFPs(p.cooked)
    }))
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const allFPs = [...new Set(out.posts.flatMap(p => p.fps))];
  const after2114 = out.posts.filter(p => p.postNumber > 2114);
  const summary = {
    fetched: merged.length,
    tail: out.tailSize,
    tailStart: out.tailStart,
    tailEnd: out.tailEnd,
    uniqueFPs: allFPs.length,
    newAfter2114: after2114.length,
    lastUsernames: [...new Set(after2114.map(p => p.username))],
    sampleExcerpts: after2114.slice(0, 5).map(p => ({ num: p.postNumber, user: p.username, date: p.created_at, text: p.excerpt.slice(0, 200) }))
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
