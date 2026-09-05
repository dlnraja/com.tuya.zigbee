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
const { extractForumSignals } = require('./forum-signal-extract');

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
  { id: 155646, name: 'homesuite-reliability', replyAllowed: false },
  // Satellite Tuya / Zigbee threads — silent enrich only
  { id: 106779, name: 'tuya-inc-official', replyAllowed: false },
  { id: 21313, name: 'tuya-cloud', replyAllowed: false },
  { id: 156053, name: 'tuya-unknown-gang-switches', replyAllowed: false },
  { id: 156792, name: 'tuya-finger-bot', replyAllowed: false },
  { id: 149230, name: 'tuya-garage-door', replyAllowed: false },
  { id: 155212, name: 'zemismart-energy-meters', replyAllowed: false },
  { id: 154092, name: 'zemismart-hello', replyAllowed: false },
  { id: 156967, name: 'moes-official', replyAllowed: false },
  { id: 150690, name: 'relax-moes-zigbee', replyAllowed: false },
  { id: 99614, name: 'nous-energy', replyAllowed: false },
  // Satellite thematic — rain / Moes presence (silent enrich only)
  { id: 158754, name: 'tuya-raindetector-pair', replyAllowed: false },
  { id: 158757, name: 'moes-presence-settings', replyAllowed: false },
  { id: 120477, name: 'rainsensor-solar-tuya', replyAllowed: false },
  { id: 146667, name: 'hobeian-zg303z-soil', replyAllowed: false },
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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
    highest_post_number: meta.highest_post_number,
    last_posted_at: meta.last_posted_at,
    posts,
  };
}

function isPollutedNewFp(mfr, pids) {
  const m = String(mfr || '');
  const list = Array.isArray(pids) ? pids : [];
  // Placeholders / examples
  if (/ABC123|XXXX|example|needs_device|_HYBRID_/i.test(m)) return true;
  // Truncated / non-canonical Tuya MFS (real ones are _TZ3000_xxxxxxxx ~ 8+ alnum)
  if (/^_TZ\d{4}_[A-Z0-9]{1,7}$/i.test(m) && m === m.toUpperCase() && m.length < 18) {
    // allow only if looks like full id; short UPPER dumps from Johan OP are noise
  }
  // Johan catalogue posts dump one mfr against dozens of modelIds — never a real couple
  if (list.length > 6) return true;
  // Uppercase-only short vendor ids from scraped device lists (CEHUW1L2, H1JNZ6L, OBORYB)
  if (/^_TZ\d{4}_[A-Z0-9]{5,10}$/.test(m) && m === m.toUpperCase() && list.length > 1) return true;
  return false;
}

function analyzePosts(posts, localMfrs) {
  const actionable = [];
  const newFPs = new Map();

  for (const p of posts) {
    const text = String(p.cooked || p.raw || '');
    const { mfrs, pids, issues, clusters } = extractForumSignals(text);
    if (!mfrs.length && !issues.length && !clusters.length) {continue;}

    for (const m of mfrs) {
      if (!localMfrs.has(m.toLowerCase())) {
        if (isPollutedNewFp(m, pids)) continue;
        newFPs.set(m, {
          mfr: m,
          pids,
          topicHint: true,
          by: p.username,
          post_number: p.post_number,
        });
      }
    }

    if (issues.length || mfrs.length || clusters.length) {
      actionable.push({
        post_number: p.post_number,
        username: p.username,
        created_at: p.created_at,
        mfrs,
        pids,
        issues,
        clusters,
        excerpt: text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220),
      });
    }
  }

  return { actionable, newFPs: [...newFPs.values()] };
}

async function main() {
  ensureDir();
  const localMfrs = loadLocalMfrs();
  const topics = DEFAULT_TOPICS.filter((t) => !topicFilter || topicFilter.has(t.id));

  // WHY: --topics partial refresh must not wipe other topic rows
  const prior = fs.existsSync(DIGEST_PATH)
    ? JSON.parse(fs.readFileSync(DIGEST_PATH, 'utf8'))
    : null;
  const digest = {
    generatedAt: new Date().toISOString(),
    replyPolicy: 'REPLY_TOPICS=140352 only — other topics are READ-ONLY',
    maxPostsPerTopic: maxPosts,
    topics: topicFilter && prior?.topics?.length
      ? prior.topics.filter((t) => !topicFilter.has(t.id))
      : [],
    totals: { actionable: 0, newFPs: 0 },
  };
  const allNew = topicFilter && fs.existsSync(NEW_FPS_PATH)
    ? [...(JSON.parse(fs.readFileSync(NEW_FPS_PATH, 'utf8')).items || [])]
    : [];

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
        highest_post_number: data.highest_post_number,
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

  digest.totals.actionable = digest.topics.reduce(
    (n, t) => n + (t.actionable || []).length,
    0,
  );
  digest.totals.newFPs = allNew.length;

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
