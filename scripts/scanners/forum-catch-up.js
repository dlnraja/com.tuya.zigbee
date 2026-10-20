#!/usr/bin/env node
'use strict';
/**
 * P2909 — forum catch-up past lastSeen, post by post, for every tracked thread.
 *
 * forum-poll.js and the silent multi-scan read only the newest N posts of each topic, so a busy
 * day could push posts out of that window unseen. This script keeps a small tracked cursor per
 * topic (data/leads/forum-lastseen.json: last post id / number read) and reads EVERY post past
 * it, oldest first, in pages of 20 ids, with a bounded chunk per topic and per run. What is not
 * read this run stays past the cursor and is read next run, so nothing is skipped.
 *
 * Topics: the history-sweep threads (data/leads/sweep-checkpoint.json) every run, plus a
 * rotating slice of the silent multi-scan list (tools/ci/forum-silent-multi-scan.js).
 * A topic seen for the first time starts `--seed` posts before its tip; older history belongs to
 * the full-history sweep (scripts/progress/advance-sweep.js).
 *
 * Findings (identities, coverage, image count, author handle, link; never post text) go to
 * data/progress/ledger.json as `forum-post:<topic>/<n>` via scripts/progress/ledger-intake.js.
 * Public Discourse JSON, no login, no AI, read-only. On HTTP 429/403 it stops at once and keeps
 * the cursor at the last fully read page.
 *
 *   node scripts/scanners/forum-catch-up.js [--per-topic=60] [--budget=240] [--satellites=8]
 *        [--seed=40] [--delay=900] [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const STATE = path.join(ROOT, 'data/leads/forum-lastseen.json');
const SWEEP = path.join(ROOT, 'data/leads/sweep-checkpoint.json');
const HOST = 'community.homey.app';
const PAGE = 20;

const argv = process.argv.slice(2);
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const num = (k, d, lo, hi) => Math.max(lo, Math.min(hi, Number(opt(k, String(d))) || d));

function loadJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

function trackedTopics(state, satellites) {
  const main = Object.keys(loadJson(SWEEP, {}).threads || {}).map(Number).filter(Boolean);
  let sats = [];
  try {
    sats = require('../../tools/ci/forum-silent-multi-scan.js').DEFAULT_TOPICS.map((t) => Number(t.id)).filter(Boolean);
  } catch { sats = []; }
  sats = sats.filter((id) => !main.includes(id));
  const start = sats.length ? (Number(state.rotate) || 0) % sats.length : 0;
  const slice = [];
  for (let i = 0; i < Math.min(satellites, sats.length); i++) {slice.push(sats[(start + i) % sats.length]);}
  return { main, slice, nextRotate: sats.length ? (start + slice.length) % sats.length : 0 };
}

function countImages(cooked) {
  return (String(cooked || '').match(/<img [^>]*>/g) || []).filter((t) => !/class="emoji|avatar/.test(t)).length;
}

/**
 * Read one topic past its cursor. Mutates `cur` ({ lastSeenId, lastSeenPost, highest, at }).
 * Returns { items, read, left, rateLimited, error }.
 */
async function catchUpTopic(tid, cur, limit, { getJson, sleep, delayMs, seed, identity }) {
  const topic = await getJson(`/t/${tid}.json`);
  if (topic.rateLimited) {return { items: [], read: 0, left: null, rateLimited: true };}
  if (topic.error || !topic.post_stream) {return { items: [], read: 0, left: null, error: topic.status || 'no-stream' };}
  const stream = (topic.post_stream.stream || []).map(Number).sort((a, b) => a - b);
  cur.highest = Math.max(Number(cur.highest) || 0, Number(topic.highest_post_number) || 0);
  if (!cur.lastSeenId) {
    const idx = Math.max(0, stream.length - seed);
    cur.lastSeenId = idx > 0 ? stream[idx - 1] : 0;
    cur.seeded = new Date().toISOString().slice(0, 10);
  }
  const pending = stream.filter((id) => id > Number(cur.lastSeenId));
  const todo = pending.slice(0, limit);
  const items = []; let read = 0;
  for (let i = 0; i < todo.length; i += PAGE) {
    const ids = todo.slice(i, i + PAGE);
    await sleep(delayMs);
    const r = await getJson(`/t/${tid}/posts.json?${ids.map((id) => `post_ids[]=${id}`).join('&')}`);
    if (r.rateLimited) {return { items, read, left: pending.length - read, rateLimited: true };}
    if (r.error || !r.post_stream) {return { items, read, left: pending.length - read, error: r.status || 'no-posts' };}
    const posts = (r.post_stream.posts || []).sort((a, b) => a.id - b.id);
    for (const p of posts) {
      const ids2 = identity.extract(identity.stripHtml(p.cooked));
      const images = countImages(p.cooked);
      let c = identity.classify(ids2);
      if (/^dlnraja$/i.test(p.username || '') && c.status !== 'pending') {c = { ...c, status: 'no-action' };}
      if (c.status !== 'no-action' || images) {
        items.push({
          topic: Number(tid), post: p.post_number, author: p.username,
          link: `https://${HOST}/t/${tid}/${p.post_number}`,
          status: c.status === 'no-action' ? 'needs-info' : c.status,
          mfrs: ids2.mfrs, pids: ids2.pids, missing: c.cov && c.cov.missing, images,
        });
      }
      cur.lastSeenPost = Math.max(Number(cur.lastSeenPost) || 0, Number(p.post_number) || 0);
    }
    // The page answered: every id asked for is now behind the cursor (deleted/hidden ones too).
    cur.lastSeenId = Math.max(Number(cur.lastSeenId) || 0, ...ids);
    read += ids.length;
  }
  cur.at = new Date().toISOString();
  return { items, read, left: pending.length - read };
}

async function run({ perTopic = 60, budget = 240, satellites = 8, seed = 40, delayMs = 900, dry = false,
  getJson, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), ledger, intake, identity, statePath = STATE } = {}) {
  getJson = getJson || require('../progress/lib/sweep-forum').getJson;
  ledger = ledger || require('../lib/ledger');
  intake = intake || require('../progress/ledger-intake');
  identity = identity || require('../progress/lib/sweep-identity');
  const state = loadJson(statePath, { topics: {} });
  state.topics = state.topics || {};
  const { main, slice, nextRotate } = trackedTopics(state, satellites);
  const L = ledger.load();
  const report = []; let left = budget; let rateLimited = false; const all = [];
  for (const tid of [...main, ...slice]) {
    if (left <= 0 || rateLimited) { report.push({ tid, skipped: left <= 0 ? 'budget' : 'rate-limited' }); continue; }
    const cur = state.topics[tid] || (state.topics[tid] = {});
    const r = await catchUpTopic(tid, cur, Math.min(perTopic, left), { getJson, sleep, delayMs, seed, identity });
    left -= r.read;
    all.push(...r.items);
    if (r.rateLimited) {rateLimited = true;}
    report.push({ tid, read: r.read, left: r.left, findings: r.items.length, lastSeenPost: cur.lastSeenPost, highest: cur.highest, error: r.error, rateLimited: !!r.rateLimited });
    await sleep(delayMs);
  }
  const stats = intake.recordForumPosts(all, L, { max: 150 });
  if (!rateLimited) {state.rotate = nextRotate;}
  state.updated = new Date().toISOString();
  if (!dry) {
    if (stats.new || stats.changed) {ledger.save(L);}
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 1)}\n`);
  }
  return { dry, rateLimited, budgetLeft: left, ledger: stats, topics: report };
}

if (require.main === module) {
  run({
    perTopic: num('per-topic', 60, 1, 200), budget: num('budget', 240, 1, 600), satellites: num('satellites', 8, 0, 40),
    seed: num('seed', 40, 1, 200), delayMs: num('delay', 900, 300, 5000), dry: argv.includes('--dry'),
  }).then((r) => {
    const s = JSON.stringify(r, null, 1);
    console.log(s);
    if (process.env.GITHUB_STEP_SUMMARY) {
      try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Forum catch-up past lastSeen\n\`\`\`json\n${s.slice(0, 6000)}\n\`\`\`\n`); } catch { /* best effort */ }
    }
  }).catch((e) => { console.error(e); process.exitCode = 1; });
}

module.exports = { run, catchUpTopic, trackedTopics, countImages };
