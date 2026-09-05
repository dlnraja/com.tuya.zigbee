#!/usr/bin/env node
'use strict';

/**
 * parse-forum-digest.js (P2214)
 *
 * Parse multi-silent-digest for one topic + verify live Discourse highest post.
 * Cross-platform replacement for PowerShell `node -e` one-liners (&& / # comments break).
 *
 * Usage:
 *   node tools/ci/parse-forum-digest.js
 *   node tools/ci/parse-forum-digest.js --topic=140352
 *   node tools/ci/parse-forum-digest.js --topic=140352 --min-post=2180
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, '.github', 'state', 'forum');
const DEFAULT_DIGEST = path.join(STATE, 'multi-silent-digest.json');

const topicArg = process.argv.find((a) => a.startsWith('--topic='));
const TOPIC_ID = topicArg ? Number(topicArg.split('=')[1]) : 140352;
const minPostArg = process.argv.find((a) => a.startsWith('--min-post='));
const MIN_POST = minPostArg ? Number(minPostArg.split('=')[1]) : 2180;
const digestArg = process.argv.find((a) => a.startsWith('--digest='));
const DIGEST_PATH = digestArg ? path.resolve(ROOT, digestArg.split('=')[1]) : DEFAULT_DIGEST;
const NO_LIVE = process.argv.includes('--no-live');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function loadJson(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function fetchTopicMeta(topicId) {
  return new Promise((resolve, reject) => {
    const url = `https://community.homey.app/t/${topicId}.json`;
    https.get(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
        'Accept-Encoding': 'identity',
        Referer: 'https://community.homey.app/',
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for topic ${topicId}`));
          return;
        }
        try {
          const j = JSON.parse(data);
          resolve({
            topicId,
            title: j.title,
            posts_count: j.posts_count,
            highest_post_number: j.highest_post_number,
            last_posted_at: j.last_posted_at,
            fetchedAt: new Date().toISOString(),
          });
        } catch (e) {
          reject(new Error(`JSON parse: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function summarizeActionable(actionable, minPost) {
  const rows = (actionable || [])
    .filter((a) => (a.post_number || 0) >= minPost)
    .sort((a, b) => (b.post_number || 0) - (a.post_number || 0));
  return rows.map((a) => ({
    post_number: a.post_number,
    username: a.username,
    created_at: a.created_at,
    issues: a.issues || [],
    mfrs: a.mfrs || [],
    pids: a.pids || [],
    excerpt: (a.excerpt || '').slice(0, 140),
  }));
}

async function main() {
  const digest = loadJson(DIGEST_PATH);
  if (!digest?.topics?.length) {
    console.error(`[parse-forum-digest] Missing digest: ${DIGEST_PATH}`);
    console.error('Run: npm run forum:silent-scan');
    process.exit(1);
  }

  const topic = digest.topics.find((t) => t.id === TOPIC_ID);
  if (!topic) {
    console.error(`[parse-forum-digest] Topic ${TOPIC_ID} not in digest`);
    process.exit(1);
  }

  const actionable = topic.actionable || [];
  const digestHighest = actionable.length
    ? Math.max(...actionable.map((a) => a.post_number || 0))
    : null;

  let live = null;
  let liveError = null;
  if (!NO_LIVE) {
    try {
      live = await fetchTopicMeta(TOPIC_ID);
    } catch (e) {
      liveError = e.message;
    }
  }

  const recent = summarizeActionable(actionable, MIN_POST);
  const gap = (live && digestHighest != null && live.highest_post_number > digestHighest)
    ? live.highest_post_number - digestHighest
    : 0;

  const report = {
    generatedAt: new Date().toISOString(),
    topicId: TOPIC_ID,
    digestPath: DIGEST_PATH,
    digestGeneratedAt: digest.generatedAt,
    digest: {
      title: topic.title,
      posts_count: topic.posts_count,
      last_posted_at: topic.last_posted_at,
      scanned: topic.scanned,
      actionableCount: actionable.length,
      highestActionablePost: digestHighest,
      error: topic.error || null,
    },
    live: live || { error: liveError },
    analysis: {
      minPostFilter: MIN_POST,
      recentActionable: recent,
      liveHighest: live?.highest_post_number ?? null,
      digestHighestActionable: digestHighest,
      newPostsSinceDigestScan: gap,
      status: gap > 0
        ? 'STALE — re-run forum:silent-scan'
        : (live?.highest_post_number === digestHighest || !live)
          ? 'OK — digest covers live highest actionable window'
          : 'OK — live highest matches (no new actionable in tail)',
    },
  };

  fs.mkdirSync(STATE, { recursive: true });
  const outFile = path.join(STATE, `topic-${TOPIC_ID}-parse.json`);
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);

  console.log('=== parse-forum-digest (P2214) ===');
  console.log(`Topic T${TOPIC_ID}: ${topic.title || '(no title)'}`);
  console.log(`Digest generated: ${digest.generatedAt}`);
  console.log(`Digest highest actionable: #${digestHighest ?? '—'} (scanned ${topic.scanned || 0} posts)`);
  if (live) {
    console.log(`Live highest_post_number: #${live.highest_post_number} (${live.last_posted_at})`);
    console.log(`Gap (live − digest actionable): ${gap}${gap > 0 ? ' → run npm run forum:silent-scan' : ''}`);
  } else {
    console.log(`Live fetch failed: ${liveError || 'skipped'}`);
  }
  if (recent.length) {
    console.log(`\nRecent actionable (≥#${MIN_POST}):`);
    for (const r of recent.slice(0, 8)) {
      const couple = r.mfrs.length && r.pids.length
        ? `${r.mfrs[0]}+${r.pids[0]}`
        : (r.issues.join(',') || 'symptom');
      console.log(`  #${r.post_number} @${r.username} | ${couple}`);
    }
  }
  console.log(`\nWrote: ${outFile}`);

  if (gap > 0) process.exit(2);
}

main().catch((err) => {
  console.error('[parse-forum-digest]', err.message);
  process.exit(1);
});
