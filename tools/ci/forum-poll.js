#!/usr/bin/env node
/**
 * forum-poll.js — P69
 *
 * Polls the Homey community forum (Discourse API) for new posts in our
 * 140352 thread and related topics. Cross-references any new fingerprints
 * mentioned in posts and queues them for the next auto-enrich-closed-loop run.
 *
 * Strategy:
 *   1. Fetch latest N posts from topic 140352 (and the most recent 2-3 related
 *      topics with new posts since last run)
 *   2. Extract fingerprints via regex (`_T[a-zA-Z]+_[a-zA-Z0-9]+`)
 *   3. Diff against last-known forum state
 *   4. Write new FPs to a queue for the closed-loop pipeline
 *
 * Output:
 *   .github/state/forum/latest.json
 *   .github/state/forum/new-fps.json
 *
 * Run:
 *   node tools/ci/forum-poll.js
 *   node tools/ci/forum-poll.js --topic=140352 --max=20
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'forum');
if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

const args = process.argv.slice(2);
const topicId = (() => { const a = args.find(x => x.startsWith('--topic=')); return a ? a.split('=')[1] : '140352'; })();
const maxPosts = (() => { const a = args.find(x => x.startsWith('--max=')); return a ? parseInt(a.split('=')[1]) : 20; })();

const FP_REGEX = /_T[A-Z0-9]+_[A-Za-z0-9]{4,}/g;
const lastStateFile = path.join(STATE_DIR, 'last-seen.json');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'dlnraja-com.tuya.zigbee/9.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
      });
    }).on('error', reject);
  });
}

function extractFPs(text) {
  if (!text) return [];
  const matches = text.match(FP_REGEX) || [];
  return [...new Set(matches.map(m => m.toLowerCase()))];
}

async function poll() {
  const t0 = Date.now();
  const lastState = fs.existsSync(lastStateFile) ? JSON.parse(fs.readFileSync(lastStateFile, 'utf8')) : { posts: {} };
  const result = {
    timestamp: new Date().toISOString(),
    topicId,
    posts: [],
    newPosts: [],
    newFPs: [],
    allFPs: []
  };

  // Fetch latest N posts from the topic
  const url = `https://community.homey.app/t/${topicId}.json?include_raw=0`;
  let topic;
  try {
    topic = await fetchJson(url);
  } catch (e) {
    console.error('Failed to fetch forum topic:', e.message);
    fs.writeFileSync(path.join(STATE_DIR, 'latest.json'), JSON.stringify({ error: e.message, timestamp: result.timestamp }, null, 2));
    process.exit(1);
  }

  const posts = (topic.post_stream && topic.post_stream.posts) || [];
  // Take the last N posts
  const recent = posts.slice(-maxPosts);
  for (const p of recent) {
    const fpList = extractFPs(p.cooked);
    const entry = {
      postId: p.id,
      postNumber: p.post_number,
      username: p.username,
      createdAt: p.created_at,
      excerpt: (p.cooked || '').replace(/<[^>]+>/g, ' ').slice(0, 200),
      fps: fpList
    };
    result.posts.push(entry);
    if (!lastState.posts[p.id]) {
      result.newPosts.push(entry);
      result.newFPs.push(...fpList);
    }
    result.allFPs.push(...fpList);
  }
  result.allFPs = [...new Set(result.allFPs)];
  result.newFPs = [...new Set(result.newFPs)];

  // Write outputs
  fs.writeFileSync(path.join(STATE_DIR, 'latest.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'new-fps.json'), JSON.stringify({ newFPs: result.newFPs, count: result.newFPs.length, timestamp: result.timestamp }, null, 2));

  // Update last-seen
  const newLastState = { posts: { ...lastState.posts } };
  for (const p of result.posts) newLastState.posts[p.postId] = { postNumber: p.postNumber, createdAt: p.createdAt };
  fs.writeFileSync(lastStateFile, JSON.stringify(newLastState, null, 2));

  const summary = {
    durationMs: Date.now() - t0,
    totalPosts: result.posts.length,
    newPosts: result.newPosts.length,
    allFPs: result.allFPs.length,
    newFPs: result.newFPs.length
  };
  console.log(JSON.stringify(summary, null, 2));
}

poll().catch(e => { console.error(e); process.exit(1); });
