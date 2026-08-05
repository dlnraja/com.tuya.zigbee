#!/usr/bin/env node
'use strict';
// One-off: fetch recent posts from Tuya/Zigbee forum threads, extract
// (mfr, pid) pairs, and diff against the local fingerprint catalog.
const fs = require('fs');
const path = require('path');
const { SmartFetcher } = require('./lib/scraper/smart-fetch');

const TOPICS = [
  { id: 26439, slug: 'app-pro-tuya-zigbee-app' },
  { id: 156792, slug: 'tuya-zigbee-finger-bot' },
  { id: 149230, slug: 'app-pro-tuya-zigbee-garage-door-opener' },
  { id: 155212, slug: 'zemismart-1-2-3-phase-energy-meters-now-work-with-homey-pro' },
  { id: 99614, slug: 'app-pro-nous-save-energy-increase-security-and-comfort' },
  { id: 106779, slug: 'app-tuya-connect-any-tuya-device-with-homey-by-tuya-inc' },
];
const SINCE = new Date('2026-05-01');
const MFR_RE = /_T[YZ][A-Z0-9]{3,5}_[A-Za-z0-9]{6,10}/g;
const PID_RE = /\bTS\d{4}[A-Z]?\b/g;

const fetcher = new SmartFetcher({
  source: 'forum-threads-scan',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  concurrency: 3, maxRetries: 2, baseBackoffMs: 4000, defaultDelay: 300, persistMetrics: false,
});

// Local fingerprint set (all drivers)
const local = new Set();
for (const d of fs.readdirSync('drivers')) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join('drivers', d, 'driver.compose.json'), 'utf8'));
    (c.zigbee?.manufacturerName || []).forEach((m) => local.add(m.toLowerCase()));
  } catch { /* skip */ }
}
console.log('local mfrs:', local.size);

(async () => {
  for (const t of TOPICS) {
    try {
      const r = await fetcher.fetch(`https://community.homey.app/t/${t.slug}/${t.id}.json`);
      const data = JSON.parse(r.body.toString());
      // The first chunk only covers the oldest posts — pull the tail of the
      // stream explicitly so recent requests are actually seen.
      const stream = data.post_stream?.stream || [];
      const tailIds = stream.slice(-40);
      let posts = data.post_stream?.posts || [];
      const have = new Set(posts.map((p) => p.id));
      const missing = tailIds.filter((id) => !have.has(id));
      if (missing.length) {
        const q = missing.map((id) => `post_ids[]=${id}`).join('&');
        const r2 = await fetcher.fetch(`https://community.homey.app/t/${t.id}/posts.json?${q}`);
        const more = JSON.parse(r2.body.toString());
        posts = posts.concat(more.post_stream?.posts || more.posts || []);
      }
      posts = posts.filter((p) => new Date(p.created_at) > SINCE);
      console.log(`\n=== ${t.id} ${t.slug} — ${posts.length} posts since ${SINCE.toISOString().slice(0, 10)}`);
      const found = new Map();
      for (const p of posts) {
        const text = (p.cooked || '').replace(/<[^>]+>/g, ' ');
        const mfrs = text.match(MFR_RE) || [];
        const pids = text.match(PID_RE) || [];
        for (const m of mfrs) {
          if (!local.has(m.toLowerCase())) {
            found.set(m, { pids: [...new Set(pids)], by: p.username, excerpt: text.replace(/\s+/g, ' ').slice(0, 160) });
          }
        }
      }
      for (const [m, info] of found) {
        console.log(`NEW FP: ${m} pids=${info.pids.join('/')} @${info.by}`);
        console.log(`   "${info.excerpt}"`);
      }
      if (!found.size) { console.log('(no unknown fingerprint)'); }
    } catch (e) {
      console.log(`\n=== ${t.id} FAILED: ${e.message}`);
    }
  }
})();
