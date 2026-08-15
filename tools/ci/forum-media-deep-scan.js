#!/usr/bin/env node
'use strict';

/**
 * forum-media-deep-scan.js
 * Silent deep scan of recent Homey forum posts: FPs + image alts/URLs + hyperlinks.
 * Never posts. Default topic 140352; optional --topics=140352,26439 --max=60
 */

const fs = require('fs');
const path = require('path');
const { SmartFetcher } = require(path.resolve(__dirname, '..', '..', 'lib', 'scraper', 'smart-fetch'));

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, '.github', 'state', 'forum');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MFR_RE = /_T[YZ](?:E200|E204|E284|E28[0-9A-Z]*|ZB\d{2}|Z3000|Z3002|Z3210|Z3218|ST11)[_-][A-Za-z0-9]+/gi;
const PID_RE = /\bTS\d{4}[A-Z]?\b/g;
const DIAG_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const LINK_KEEP = /aliexpress|amazon|github\.com|blakadder|zigbee2mqtt|homey\.app\/t\/|drive\.google|imgur|dropbox|manual|pdf|tuya/i;

const args = process.argv.slice(2);
const maxPosts = (() => {
  const a = args.find((x) => x.startsWith('--max='));
  return a ? Math.max(20, parseInt(a.split('=')[1], 10) || 60) : 60;
})();
const topics = (() => {
  const a = args.find((x) => x.startsWith('--topics='));
  if (!a) return [140352, 26439, 89271];
  return a.split('=')[1].split(',').map((s) => Number(s.trim())).filter(Boolean);
})();

const fetcher = new SmartFetcher({
  source: 'forum-media-deep',
  userAgent: UA,
  concurrency: 2,
  maxRetries: 2,
  baseBackoffMs: 3000,
  defaultDelay: 300,
  headers: {
    Accept: 'application/json',
    'Accept-Encoding': 'identity',
    Referer: 'https://community.homey.app/',
  },
});

function strip(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractMedia(cooked) {
  const html = String(cooked || '');
  const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1].split('?')[0]);
  const lightbox = [...html.matchAll(/data-download-href="([^"]+)"/gi)].map((m) => m[1]);
  const alts = [...html.matchAll(/alt="([^"]+)"/gi)].map((m) => m[1]).filter(Boolean);
  const titles = [...html.matchAll(/title="([^"]+)"/gi)].map((m) => m[1]).filter(Boolean);
  const links = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map((m) => m[1]);
  return {
    images: [...new Set([...images, ...lightbox])],
    alts: [...new Set([...alts, ...titles])],
    links: [...new Set(links)].filter((u) => !/community\.homey\.app\/u\//i.test(u)),
  };
}

function loadDrivers() {
  const map = new Map();
  const dir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(dir, d, 'driver.compose.json'), 'utf8'));
      for (const m of c.zigbee?.manufacturerName || []) {
        const key = String(m).toLowerCase();
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(d);
      }
    } catch (_e) { /* skip */ }
  }
  return map;
}

async function fetchTopicTail(topicId, max) {
  const base = 'https://community.homey.app';
  const metaRes = await fetcher.fetch(`${base}/t/${topicId}.json`);
  if (metaRes.statusCode !== 200) throw new Error(`HTTP ${metaRes.statusCode} topic ${topicId}`);
  const meta = JSON.parse(metaRes.body.toString('utf8'));
  const stream = meta.post_stream?.stream || [];
  const posts = [...(meta.post_stream?.posts || [])];
  const have = new Set(posts.map((p) => p.id));
  const tailIds = stream.slice(-max).filter((id) => !have.has(id));
  for (let i = 0; i < tailIds.length; i += 20) {
    const chunk = tailIds.slice(i, i + 20);
    if (!chunk.length) continue;
    const q = chunk.map((id) => `post_ids[]=${id}`).join('&');
    // eslint-disable-next-line no-await-in-loop
    const r2 = await fetcher.fetch(`${base}/t/${topicId}/posts.json?${q}`);
    if (r2.statusCode !== 200) continue;
    const more = JSON.parse(r2.body.toString('utf8'));
    posts.push(...(more.post_stream?.posts || more.posts || []));
  }
  posts.sort((a, b) => a.post_number - b.post_number);
  return {
    title: meta.title,
    posts_count: meta.posts_count,
    last_posted_at: meta.last_posted_at,
    posts: posts.slice(-max),
  };
}

function analyze(posts, drivers) {
  const items = [];
  for (const p of posts) {
    const media = extractMedia(p.cooked);
    const text = `${strip(p.cooked)} ${media.alts.join(' ')}`;
    const mfrs = [...new Set((text.match(MFR_RE) || []).map((m) => m.toUpperCase()))];
    const pids = [...new Set(text.match(PID_RE) || [])];
    const routing = mfrs.map((m) => ({ mfr: m, drivers: drivers.get(m.toLowerCase()) || [] }));
    const missing = routing.filter((r) => !r.drivers.length).map((r) => r.mfr);
    const multi = routing.filter((r) => r.drivers.length > 1);
    const usefulLinks = media.links.filter((u) => LINK_KEEP.test(u));
    const diag = (text.match(DIAG_RE) || [])[0] || null;
    if (!mfrs.length && !media.images.length && !usefulLinks.length && !diag) continue;
    items.push({
      n: p.post_number,
      user: p.username,
      at: p.created_at,
      mfrs,
      pids,
      routing,
      missing,
      multi,
      images: media.images.slice(0, 10),
      image_alts: media.alts.slice(0, 12),
      links: usefulLinks.slice(0, 15),
      all_links_count: media.links.length,
      diag,
      excerpt: text.slice(0, 320),
    });
  }
  return items;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const drivers = loadDrivers();
  const report = {
    generatedAt: new Date().toISOString(),
    policy: 'silent enrich only — no forum replies',
    topics: [],
    gaps: [],
    collisions: [],
  };

  console.log('=== Forum MEDIA deep scan (silent) ===');
  for (const topicId of topics) {
    process.stdout.write(`Topic ${topicId}... `);
    try {
      // eslint-disable-next-line no-await-in-loop
      const data = await fetchTopicTail(topicId, maxPosts);
      const items = analyze(data.posts, drivers);
      for (const it of items) {
        for (const m of it.missing) {
          report.gaps.push({ topicId, post: it.n, user: it.user, mfr: m, pids: it.pids, links: it.links, alts: it.image_alts });
        }
        for (const m of it.multi) {
          report.collisions.push({ topicId, post: it.n, user: it.user, mfr: m.mfr, drivers: m.drivers });
        }
      }
      report.topics.push({
        id: topicId,
        title: data.title,
        posts_count: data.posts_count,
        last_posted_at: data.last_posted_at,
        scanned: data.posts.length,
        withMediaOrFp: items.length,
        items: items.slice(-25),
      });
      console.log(`ok scanned=${data.posts.length} rich=${items.length}`);
    } catch (err) {
      console.log(`FAIL ${err.message}`);
      report.topics.push({ id: topicId, error: err.message });
    }
  }

  // dedupe gaps/collisions
  const gapKey = new Set();
  report.gaps = report.gaps.filter((g) => {
    const k = `${g.mfr}|${g.topicId}|${g.post}`;
    if (gapKey.has(k)) return false;
    gapKey.add(k);
    return true;
  });
  const colKey = new Set();
  report.collisions = report.collisions.filter((c) => {
    const k = `${c.mfr}|${(c.drivers || []).join(',')}`;
    if (colKey.has(k)) return false;
    colKey.add(k);
    return true;
  });

  const outPath = path.join(OUT_DIR, 'forum-media-deep.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nWrote ${outPath}`);
  console.log(`Gaps (missing mfr in drivers): ${report.gaps.length}`);
  console.log(`Multi-driver collisions mentioned: ${report.collisions.length}`);
  for (const g of report.gaps.slice(0, 20)) {
    console.log(`  GAP ${g.mfr} T${g.topicId}#${g.post} @${g.user} pids=${(g.pids || []).join(',')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
