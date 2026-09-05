#!/usr/bin/env node
/**
 * forum-fetch-146735.js
 *
 * READ-ONLY scan of Homey community topic #146735
 * (Tuya Smart Life / Smart Living — official/cloud thread).
 *
 * NEVER posts or replies. Output is sanitized (PII stripped) for local
 * cross-ref against our Zigbee/local-first drivers.
 *
 * Discourse API (browser UA):
 *   GET /t/146735.json
 *   GET /t/146735/posts.json?post_ids[]=...
 *   Response posts at data.post_stream.posts
 *
 * Output (gitignored via .github/state/forum/):
 *   topic-146735-meta.json
 *   topic-146735-posts.json
 *   topic-146735-summary.json
 *   topic-146735-actionable.json
 *
 * Run: node tools/ci/forum-fetch-146735.js
 * Env:  FORUM_MAX_POSTS=N (optional cap), FORUM_USE_PUPPETEER=1
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { SmartFetcher } = require(path.resolve(__dirname, '..', '..', 'lib', 'scraper', 'smart-fetch'));

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'forum');
const TOPIC_ID = 146735;
const BASE = 'https://community.homey.app';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Sacred-couple style identifiers
const MFR_REGEX = /_T[YZ](?:E200|E204|E284|E28[0-9A-Z]*|ZB\d{2}|Z3000|Z3002|Z3210|Z3218|ST11)[_-][A-Za-z0-9]+/gi;
const PID_REGEX = /\b(?:TS\d{4}[A-Z]?|ZG-?\d{3,}[A-Z]*|TH0\d{2}|SNZB-?\d+|CS-?\d+[A-Z]*)\b/gi;
const LOCAL_KEY_HINT = /\b(?:local[_ ]?key|device[_ ]?id|localKey|tuyapi|tinytuya|udp.?discovery|offline|not.?connected|pairing.?fail|QR.?code|2001)\b/gi;
const DP_HINT = /\b(?:DP\s*\d{1,3}|datapoint|data.?point|raw.?code|dps?\s*[:=]\s*\{)/gi;
const ISSUE_HINT = /\b(?:crash|timeout|battery|button|dimmer|cover|curtain|blind|thermostat|TRV|scale|divisor|kWh|tenfold|unavailable|offline)\b/gi;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const KEY_RE = /\b(?:local[_ ]?key|password|token|secret)\s*[:=]\s*['"]?[A-Za-z0-9+/=_-]{8,}['"]?/gi;

const fetcher = new SmartFetcher({
  source: 'forum-topic-146735',
  userAgent: UA,
  concurrency: 4,
  maxRetries: 2,
  baseBackoffMs: 5000,
  defaultDelay: 400,
  headers: {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'identity',
    Referer: 'https://community.homey.app/',
  },
});

async function fetchJson(url) {
  const r = await fetcher.fetch(url);
  if (r.statusCode !== 200) throw new Error('HTTP ' + r.statusCode + ' for ' + url);
  const body = r.body.toString('utf8');
  try {
    return JSON.parse(body);
  } catch (e) {
    throw new Error('JSON parse: ' + e.message + ' — body head: ' + body.substring(0, 200));
  }
}

function stripHtml(html) {
  return String(html || '')
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

function sanitizeText(text) {
  return String(text || '')
    .replace(EMAIL_RE, '[email]')
    .replace(KEY_RE, '[redacted-credential]')
    .replace(IP_RE, '[ip]')
    .replace(/\b[0-9a-f]{32}\b/gi, '[hex32]')
    .replace(/\b[0-9a-f]{16}\b/gi, '[hex16]');
}

function extractImageMeta(cooked) {
  const html = String(cooked || '');
  const alts = [];
  const captions = [];
  const urls = [];
  const altRe = /<img[^>]+alt="([^"]*)"[^>]*>/gi;
  let m;
  while ((m = altRe.exec(html))) {
    if (m[1] && m[1].trim()) alts.push(sanitizeText(m[1].trim()).slice(0, 200));
  }
  const srcRe = /src="(https:\/\/[^"]+\.(?:jpe?g|png|gif|webp)[^"]*)"/gi;
  while ((m = srcRe.exec(html))) {
    urls.push(m[1].split('?')[0]);
  }
  const figRe = /<(?:figcaption|p class="lightbox-caption")[^>]*>([\s\S]*?)<\//gi;
  while ((m = figRe.exec(html))) {
    const c = sanitizeText(stripHtml(m[1]));
    if (c) captions.push(c.slice(0, 200));
  }
  return { alts: [...new Set(alts)], captions: [...new Set(captions)], urls: [...new Set(urls)].slice(0, 10) };
}

function extractLinks(cooked) {
  const html = String(cooked || '');
  const links = [];
  const re = /href="(https?:\/\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = m[1];
    if (/community\.homey\.app\/t\/146735/i.test(u)) continue;
    links.push(u.split('?')[0]);
  }
  return [...new Set(links)].slice(0, 20);
}

function extractIds(text) {
  const mfrs = [...new Set((text.match(MFR_REGEX) || []).map((s) => s.toUpperCase().replace(/-/g, '_')))];
  const pids = [...new Set((text.match(PID_REGEX) || []).map((s) => s.toUpperCase()))];
  return { mfrs, pids };
}

function classifyHints(text) {
  const local = [...new Set((text.match(LOCAL_KEY_HINT) || []).map((s) => s.toLowerCase()))];
  const dps = [...new Set((text.match(DP_HINT) || []).map((s) => s.toLowerCase().replace(/\s+/g, ' ')))];
  const issues = [...new Set((text.match(ISSUE_HINT) || []).map((s) => s.toLowerCase()))];
  return { local, dps, issues };
}

async function main() {
  console.log('=== Forum topic 146735 READ-ONLY fetch (silent scan) ===');
  fs.mkdirSync(STATE_DIR, { recursive: true });

  const maxPosts = parseInt(process.env.FORUM_MAX_POSTS || '0', 10) || 0;

  console.log('Fetching topic meta...');
  const topic = await fetchJson(BASE + '/t/' + TOPIC_ID + '.json');
  const totalPosts = topic.posts_count || 0;
  console.log('  Topic:', topic.title);
  console.log('  Posts count:', totalPosts);
  console.log('  Last activity:', topic.last_posted_at);

  fs.writeFileSync(
    path.join(STATE_DIR, 'topic-146735-meta.json'),
    JSON.stringify(
      {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        posts_count: topic.posts_count,
        created_at: topic.created_at,
        last_posted_at: topic.last_posted_at,
        views: topic.views,
        like_count: topic.like_count,
        reply_count: topic.reply_count,
        // No real names / emails — usernames only, capped
        participants: (topic.details?.participants || []).slice(0, 40).map((p) => ({
          username: p.username,
          post_count: p.post_count,
        })),
        stream_post_ids_count: topic.post_stream?.stream?.length || 0,
        policy: 'READ_ONLY_NO_REPLY',
      },
      null,
      2
    )
  );

  const streamIds = topic.post_stream?.stream || [];
  const allPosts = topic.post_stream?.posts ? [...topic.post_stream.posts] : [];
  console.log('Stream IDs:', streamIds.length, '| Initial posts:', allPosts.length);

  if (streamIds.length > allPosts.length) {
    const have = new Set(allPosts.map((p) => p.id));
    let want = streamIds.filter((id) => !have.has(id));
    if (maxPosts > 0) {
      const already = allPosts.length;
      want = want.slice(0, Math.max(0, maxPosts - already));
    }
    const chunkSize = 20;
    const chunkUrls = [];
    for (let i = 0; i < want.length; i += chunkSize) {
      const chunk = want.slice(i, i + chunkSize);
      const params = chunk.map((id) => 'post_ids[]=' + id).join('&');
      chunkUrls.push(BASE + '/t/' + TOPIC_ID + '/posts.json?' + params);
    }
    console.log('  Fetching', chunkUrls.length, 'chunks...');
    const chunkResults = await fetcher.fetchAll(chunkUrls, {
      concurrency: fetcher.concurrency,
      onProgress: (d, t) => process.stdout.write(`\r  chunk ${d}/${t}    `),
    });
    console.log('');
    for (let i = 0; i < chunkResults.length; i++) {
      const r = chunkResults[i];
      if (r.error || !r.body) {
        console.log('  chunk', i + 1, 'FAILED:', r.error);
        continue;
      }
      try {
        const data = JSON.parse(r.body.toString('utf8'));
        const batch = (data.post_stream?.posts || data.posts || []).filter((x) => !have.has(x.id));
        for (const p of batch) have.add(p.id);
        allPosts.push(...batch);
      } catch (e) {
        console.log('  chunk', i + 1, 'parse error:', e.message);
      }
    }
  }

  if (maxPosts > 0 && allPosts.length > maxPosts) {
    allPosts.length = maxPosts;
  }
  console.log('Total posts fetched:', allPosts.length, '/', totalPosts);

  const enriched = allPosts.map((p) => {
    const raw = stripHtml(p.cooked || '');
    const text = sanitizeText(raw);
    const { mfrs, pids } = extractIds(text);
    const hints = classifyHints(text);
    const images = extractImageMeta(p.cooked || '');
    // Also mine alt/captions for mfr/pid
    const altBlob = sanitizeText([...images.alts, ...images.captions].join(' '));
    const fromAlt = extractIds(altBlob);
    for (const m of fromAlt.mfrs) if (!mfrs.includes(m)) mfrs.push(m);
    for (const pid of fromAlt.pids) if (!pids.includes(pid)) pids.push(pid);

    return {
      id: p.id,
      post_number: p.post_number,
      username: p.username, // Discourse handle only (no email/name)
      created_at: p.created_at,
      reply_to_post_number: p.reply_to_post_number,
      text_excerpt: text.substring(0, 600),
      text_length: text.length,
      mfrs,
      pids,
      hints,
      links: extractLinks(p.cooked || ''),
      has_image: images.urls.length > 0 || images.alts.length > 0,
      image_alts: images.alts,
      image_captions: images.captions,
      // Host-only URLs (no query tokens)
      image_hosts: [...new Set(images.urls.map((u) => {
        try { return new URL(u).hostname; } catch (_) { return null; }
      }).filter(Boolean))],
    };
  });

  const userPostCount = {};
  const mfrCount = {};
  const pidCount = {};
  const coupleCount = {};
  const issueCount = {};
  const localCount = {};
  const actionable = [];

  for (const p of enriched) {
    userPostCount[p.username] = (userPostCount[p.username] || 0) + 1;
    for (const m of p.mfrs) mfrCount[m] = (mfrCount[m] || 0) + 1;
    for (const pid of p.pids) pidCount[pid] = (pidCount[pid] || 0) + 1;
    for (const iss of p.hints.issues) issueCount[iss] = (issueCount[iss] || 0) + 1;
    for (const loc of p.hints.local) localCount[loc] = (localCount[loc] || 0) + 1;

    // Couple candidates: same post mentions both
    if (p.mfrs.length && p.pids.length) {
      for (const m of p.mfrs) {
        for (const pid of p.pids) {
          const key = m + '|' + pid;
          coupleCount[key] = (coupleCount[key] || 0) + 1;
        }
      }
    }

    const interesting =
      p.mfrs.length > 0 ||
      p.pids.length > 0 ||
      p.hints.dps.length > 0 ||
      p.hints.local.length > 0 ||
      (p.hints.issues.length > 0 && (p.links.length > 0 || p.has_image));

    if (interesting) {
      actionable.push({
        post_number: p.post_number,
        username: p.username,
        created_at: p.created_at,
        mfrs: p.mfrs,
        pids: p.pids,
        hints: p.hints,
        links: p.links.slice(0, 8),
        image_alts: p.image_alts,
        excerpt: p.text_excerpt.slice(0, 280),
      });
    }
  }

  const summary = {
    meta: {
      generatedAt: new Date().toISOString(),
      topicId: TOPIC_ID,
      totalPosts: allPosts.length,
      topicPostsCount: totalPosts,
      fetchedPct: totalPosts ? ((allPosts.length / totalPosts) * 100).toFixed(1) + '%' : 'n/a',
      actionablePosts: actionable.length,
      policy: 'READ_ONLY_NO_REPLY_STRIP_PII',
    },
    topUsers: Object.entries(userPostCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([u, c]) => ({ username: u, posts: c })),
    topMfrs: Object.entries(mfrCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 80)
      .map(([m, c]) => ({ mfr: m, mentions: c })),
    topPids: Object.entries(pidCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([p, c]) => ({ pid: p, mentions: c })),
    topCouples: Object.entries(coupleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 80)
      .map(([k, c]) => {
        const [mfr, pid] = k.split('|');
        return { mfr, pid, mentions: c };
      }),
    topIssues: Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([k, c]) => ({ issue: k, mentions: c })),
    localHints: Object.entries(localCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([k, c]) => ({ hint: k, mentions: c })),
  };

  fs.writeFileSync(path.join(STATE_DIR, 'topic-146735-posts.json'), JSON.stringify(enriched, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'topic-146735-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    path.join(STATE_DIR, 'topic-146735-actionable.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        topicId: TOPIC_ID,
        count: actionable.length,
        items: actionable,
      },
      null,
      2
    )
  );

  console.log('\n=== SUMMARY ===');
  console.log('Posts scanned:', enriched.length, '/', totalPosts, '(' + summary.meta.fetchedPct + ')');
  console.log('Actionable posts:', actionable.length);
  console.log('Unique mfrs:', Object.keys(mfrCount).length);
  console.log('Unique pids:', Object.keys(pidCount).length);
  console.log('Couple candidates:', Object.keys(coupleCount).length);
  console.log('\nTop mfrs:');
  for (const m of summary.topMfrs.slice(0, 15)) console.log('  ' + m.mfr.padEnd(28) + ' ' + m.mentions);
  console.log('\nTop couples:');
  for (const c of summary.topCouples.slice(0, 15)) console.log('  ' + (c.mfr + '|' + c.pid).padEnd(40) + ' ' + c.mentions);
  console.log('\nOutput:', STATE_DIR);
}

main().catch((e) => {
  console.error('FATAL:', e.stack || e.message);
  process.exit(1);
});
