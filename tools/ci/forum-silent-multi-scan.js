#!/usr/bin/env node
'use strict';

/**
 * forum-silent-multi-scan.js (P108)
 *
 * READ-ONLY scan of Homey Discourse topics for fingerprints + symptoms.
 * NEVER posts/replies. REPLY_TOPICS remains 140352-only elsewhere.
 *
 * Topics (scan-only):
 *   140352 — own Universal Tuya Zigbee thread
 *   146735 — Smart Life / cloud (silent)
 *   26439  — JohanBendz Tuya Zigbee (silent)
 *   89271  — device request archive (silent)
 *
 * Output (gitignored state):
 *   .github/state/forum/multi-silent-digest.json
 *   .github/state/forum/multi-silent-new-fps.json
 *
 * Usage:
 *   node tools/ci/forum-silent-multi-scan.js
 *   node tools/ci/forum-silent-multi-scan.js --max=40
 *   node tools/ci/forum-silent-multi-scan.js --topics=140352,146735
 */

const fs = require('fs');
const path = require('path');
const { SmartFetcher } = require(path.resolve(__dirname, '..', '..', 'lib', 'scraper', 'smart-fetch'));

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'forum');
const DIGEST_PATH = path.join(STATE_DIR, 'multi-silent-digest.json');
const NEW_FPS_PATH = path.join(STATE_DIR, 'multi-silent-new-fps.json');

const DEFAULT_TOPICS = [
  { id: 140352, name: 'universal-tuya-zigbee', replyAllowed: true },
  { id: 146735, name: 'tuya-smart-life', replyAllowed: false },
  { id: 26439, name: 'johan-tuya-zigbee', replyAllowed: false },
  { id: 89271, name: 'device-request-archive', replyAllowed: false },
  // Capability UX patterns (Arie DC) — READ-ONLY inspiration for our flow/capability hardening
  { id: 43287, name: 'device-capabilities', replyAllowed: false },
  // Community anti-AI-paste doctrine — READ-ONLY; reinforce silent/humanize policy
  { id: 157628, name: 'stop-ai-paste', replyAllowed: false },
  // RF coexistence education (Zigbee/Thread vs Wi-Fi numbering) — READ-ONLY
  { id: 157859, name: 'rf-channels-coexistence', replyAllowed: false },
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
// Include _TZE28C1000000_* (Z2M #32305 Avatto prefix) — old {3,6} missed it.
const MFR_RE = /_T[YZ](?:E200|E204|E284|E28[0-9A-Z]*|ZB\d{2}|Z3000|Z3002|Z3210|Z3218|ST11)[_-][A-Za-z0-9]+/gi;
const PID_RE = /\bTS\d{4}[A-Z]?\b/g;
const ISSUE_RE = /\b(?:crash|timeout|battery|button|dimmer|cover|curtain|blind|thermostat|TRV|scale|divisor|kWh|unavailable|offline|no.?data|not.?work|wrong.?driver|unknown|lux|luminance|SOS|presence|soil|irrigation|flow)\b/gi;

const args = process.argv.slice(2);
const maxPosts = (() => {
  const a = args.find((x) => x.startsWith('--max='));
  return a ? Math.max(10, parseInt(a.split('=')[1], 10) || 40) : 40;
})();
const topicFilter = (() => {
  const a = args.find((x) => x.startsWith('--topics='));
  if (!a) {return null;}
  return new Set(a.split('=')[1].split(',').map((s) => Number(s.trim())).filter(Boolean));
})();

const fetcher = new SmartFetcher({
  source: 'forum-silent-multi',
  userAgent: UA,
  concurrency: 3,
  maxRetries: 2,
  baseBackoffMs: 4000,
  defaultDelay: 350,
  headers: {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'identity',
    Referer: 'https://community.homey.app/',
  },
});

function ensureDir() {
  if (!fs.existsSync(STATE_DIR)) {fs.mkdirSync(STATE_DIR, { recursive: true });}
}

function loadLocalMfrs() {
  const set = new Set();
  const dir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(dir, d, 'driver.compose.json'), 'utf8'));
      for (const m of (c.zigbee?.manufacturerName || [])) {
        set.add(String(m).toLowerCase());
      }
    } catch (_e) { /* skip */ }
  }
  return set;
}

async function fetchTopicTail(topicId, max) {
  const base = 'https://community.homey.app';
  const metaRes = await fetcher.fetch(`${base}/t/${topicId}.json`);
  if (metaRes.statusCode !== 200) {
    throw new Error(`HTTP ${metaRes.statusCode} topic ${topicId}`);
  }
  const meta = JSON.parse(metaRes.body.toString('utf8'));
  const stream = meta.post_stream?.stream || [];
  const posts = meta.post_stream?.posts || [];
  const have = new Set(posts.map((p) => p.id));
  const tailIds = stream.slice(-max).filter((id) => !have.has(id));

  const chunks = [];
  for (let i = 0; i < tailIds.length; i += 20) {
    chunks.push(tailIds.slice(i, i + 20));
  }
  for (const chunk of chunks) {
    if (!chunk.length) {continue;}
    const q = chunk.map((id) => `post_ids[]=${id}`).join('&');
    // eslint-disable-next-line no-await-in-loop
    const r2 = await fetcher.fetch(`${base}/t/${topicId}/posts.json?${q}`);
    if (r2.statusCode !== 200) {continue;}
    const more = JSON.parse(r2.body.toString('utf8'));
    const extra = more.post_stream?.posts || more.posts || [];
    posts.push(...extra);
  }

  return {
    title: meta.title,
    posts_count: meta.posts_count,
    last_posted_at: meta.last_posted_at,
    posts,
  };
}

function analyzePosts(posts, localMfrs) {
  const actionable = [];
  const newFPs = new Map();

  for (const p of posts) {
    const text = String(p.cooked || p.raw || '').replace(/<[^>]+>/g, ' ');
    const mfrs = [...new Set((text.match(MFR_RE) || []).map((m) => m.toUpperCase()))];
    const pids = [...new Set(text.match(PID_RE) || [])];
    const issues = [...new Set((text.match(ISSUE_RE) || []).map((s) => s.toLowerCase()))];
    if (!mfrs.length && !issues.length) {continue;}

    for (const m of mfrs) {
      if (!localMfrs.has(m.toLowerCase())) {
        newFPs.set(m, {
          mfr: m,
          pids,
          topicHint: true,
          by: p.username,
          post_number: p.post_number,
        });
      }
    }

    if (issues.length || mfrs.length) {
      actionable.push({
        post_number: p.post_number,
        username: p.username,
        created_at: p.created_at,
        mfrs,
        pids,
        issues,
        excerpt: text.replace(/\s+/g, ' ').trim().slice(0, 220),
      });
    }
  }

  return { actionable, newFPs: [...newFPs.values()] };
}

async function main() {
  ensureDir();
  const localMfrs = loadLocalMfrs();
  const topics = DEFAULT_TOPICS.filter((t) => !topicFilter || topicFilter.has(t.id));
  const digest = {
    generatedAt: new Date().toISOString(),
    replyPolicy: 'REPLY_TOPICS=140352 only — other topics are READ-ONLY',
    maxPostsPerTopic: maxPosts,
    topics: [],
    totals: { actionable: 0, newFPs: 0 },
  };
  const allNew = [];

  console.log('=== Forum SILENT multi-scan (never posts) ===');
  for (const t of topics) {
    process.stdout.write(`Topic ${t.id} (${t.name})... `);
    try {
      // eslint-disable-next-line no-await-in-loop
      const data = await fetchTopicTail(t.id, maxPosts);
      const { actionable, newFPs } = analyzePosts(data.posts, localMfrs);
      digest.topics.push({
        id: t.id,
        name: t.name,
        replyAllowed: t.replyAllowed === true,
        title: data.title,
        posts_count: data.posts_count,
        last_posted_at: data.last_posted_at,
        scanned: data.posts.length,
        actionable: actionable.slice(-30),
        newFPs,
      });
      digest.totals.actionable += actionable.length;
      digest.totals.newFPs += newFPs.length;
      allNew.push(...newFPs.map((fp) => ({ ...fp, topicId: t.id })));
      console.log(`ok scanned=${data.posts.length} actionable=${actionable.length} newFP=${newFPs.length}`);
    } catch (err) {
      console.log(`FAIL ${err.message}`);
      digest.topics.push({ id: t.id, name: t.name, error: err.message });
    }
  }

  fs.writeFileSync(DIGEST_PATH, `${JSON.stringify(digest, null, 2)}\n`);
  fs.writeFileSync(NEW_FPS_PATH, `${JSON.stringify({
    generatedAt: digest.generatedAt,
    count: allNew.length,
    items: allNew,
  }, null, 2)}\n`);

  console.log(`\nDigest: ${DIGEST_PATH}`);
  console.log(`New FPs: ${NEW_FPS_PATH} (${allNew.length})`);
  console.log('Policy: no forum replies from this script.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
