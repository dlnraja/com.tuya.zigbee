'use strict';
/**
 * scripts/digest/forum-watch.js — replaces the "Homey forum scan" Grok routine. READ-ONLY.
 * Public Discourse JSON (no login): detects posts newer than the last-seen post number,
 * extracts enrichment leads with scripts/digest/enrich.js (mfr, productId, DP numbers, clusters,
 * endpoints, raw frames, flow cards, TX/RX hints, Z2M/ZHA refs, diag UUIDs) and cross-checks them
 * against the current checkout (drivers, lib, data) — report only. Posts ONE digest comment when new posts exist.
 * Forum content is untrusted: only IDs, author, and post links are echoed (never post bodies).
 *
 * Env: FORUM_TOPIC (140352) · FORUM_BASE (https://community.homey.app)
 *      FORUM_MAX_NEW (60) · FORUM_BOOTSTRAP (0 = first run only records the baseline;
 *      N = also report the last N posts on first run) · DRIVERS_DIR (drivers)
 *      FORUM_NOTIFY = any (default: comment when any new post) | missing (only when unknown IDs)
 *      FORUM_MAX_FETCHES (3) post-window requests max · FORUM_BACKOFF_HOURS (20)
 * Politeness: 1 request to /t/<id>.json + ≤3 post-window requests, random 2–5 s between them,
 * descriptive User-Agent; on 429/403 → stop immediately, record the back-off in state, skip
 * subsequent runs for FORUM_BACKOFF_HOURS (no retry storm).
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const E = require('./enrich');

const BASE = process.env.FORUM_BASE || 'https://community.homey.app';
const TOPIC = process.env.FORUM_TOPIC || '140352';
const MAX_NEW = Math.min(Number(process.env.FORUM_MAX_NEW || 60), 100);
const BOOT = Number(process.env.FORUM_BOOTSTRAP || 0);
const NOTIFY = process.env.FORUM_NOTIFY || 'any';
const DRIVERS = process.env.DRIVERS_DIR || 'drivers';
const MAX_FETCHES = Math.min(Number(process.env.FORUM_MAX_FETCHES || 3), 5);
const BACKOFF_H = Number(process.env.FORUM_BACKOFF_HOURS || 20);


const strip = (html) => String(html || '').replace(/<aside[\s\S]*?<\/aside>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

async function newPosts(lastSeen) {
  const t = await L.fetchJson(`${BASE}/t/${TOPIC}.json`);
  const highest = t.highest_post_number || t.posts_count;
  const stream = t.post_stream.stream || [];
  let from = lastSeen;
  if (from == null) from = BOOT > 0 ? highest - BOOT : highest;
  const want = Math.min(highest - from, MAX_NEW);
  if (want <= 0) return { title: t.title, highest, posts: [] };
  // newest ids first so the fetch cap keeps the most recent posts; small margin for deleted/whispers
  const ids = stream.slice(-Math.min(stream.length, want + 5, MAX_FETCHES * 20));
  // posts already embedded in /t/<id>.json need no extra request
  const posts = (t.post_stream.posts || []).filter((p) => ids.includes(p.id));
  const missingIds = ids.filter((id) => !posts.some((p) => p.id === id));
  for (let i = 0, n = 0; i < missingIds.length && n < MAX_FETCHES; i += 20, n++) {
    await L.jitter(2000, 5000); // 2–5 s random spacing between Discourse requests
    const q = missingIds.slice(i, i + 20).map((id) => `post_ids[]=${id}`).join('&');
    const j = await L.fetchJson(`${BASE}/t/${TOPIC}/posts.json?${q}`);
    posts.push(...(j.post_stream.posts || []));
  }
  return { title: t.title, highest, posts: posts.filter((p) => p.post_number > from).sort((a, b) => a.post_number - b.post_number) };
}

L.run(async () => {
  const { issue, prev } = await L.loadState('forum');
  const lastSeen = prev ? prev.lastSeen : null;
  if (prev && prev.blockedAt && Date.now() - Date.parse(prev.blockedAt) < BACKOFF_H * 3600e3) {
    console.log(`Discourse asked us to back off (${prev.blockedStatus}) at ${prev.blockedAt} — skipping until ${BACKOFF_H}h have passed.`);
    return;
  }
  let res;
  try { res = await newPosts(lastSeen); } catch (e) {
    if (e.status === 429 || e.status === 403) {
      console.log(`::warning::Discourse ${e.status} — stopping, back-off recorded (${BACKOFF_H}h).`);
      await L.saveState(issue, 'forum', { ...(prev || {}), blockedAt: new Date().toISOString(), blockedStatus: e.status });
      return;
    }
    throw e;
  }
  const { title, highest, posts } = res;
  let idx = null;
  try { if (fs.existsSync(DRIVERS)) idx = E.buildIndex(path.resolve(DRIVERS, '..')); } catch (e) { L.log(`index failed: ${e.message}`); }
  const rows = []; const missing = new Set();
  for (const p of posts) {
    const ex = E.extract(strip(p.cooked));
    if (E.isEmpty(ex) && !Object.keys(ex.txrx).length && !ex.refMention) { rows.push(`- [#${p.post_number}](${BASE}/t/${TOPIC}/${p.post_number}) ${L.esc(p.username)} · ${L.paris(p.created_at)} — _pas d'identifiant technique_`); continue; }
    let leads;
    if (idx) { const c = E.check(ex, idx); leads = E.renderLeads(c); E.unmappedLeads(c).forEach((u) => missing.add(u)); }
    else leads = [ex.mfr.join(', '), ex.pid.join(', '), ex.dp.length ? 'DP ' + ex.dp.join(',') : ''].filter(Boolean).join(' · ');
    rows.push(`- [#${p.post_number}](${BASE}/t/${TOPIC}/${p.post_number}) ${L.esc(p.username)} · ${L.paris(p.created_at)} — ${leads}`);
  }
  const known = idx;
  const state = { lastSeen: posts.length ? Math.max(lastSeen || 0, ...posts.map((p) => p.post_number)) : (lastSeen ?? highest), highest, at: new Date().toISOString() };
  if (lastSeen == null && BOOT <= 0) {
    console.log(`First run: baseline lastSeen=${highest} (no comment).`);
    await L.saveState(issue, 'forum', state);
    return;
  }
  const md = `## 💬 Forum watch — topic ${TOPIC} (${L.esc(title)})\n\n**${posts.length}** nouveau(x) post(s) depuis #${lastSeen ?? '—'} (dernier : #${highest}).` +
    (missing.size ? `\n\n🧭 **Pistes d'enrichissement (non mappées sur master)** : ${[...missing].slice(0, 40).map((m) => '`' + m + '`').join(', ')}` : known ? '\n\nTous les identifiants cités sont déjà connus ✅' : '') +
    (rows.length ? `\n\n${rows.join('\n')}\n\n${E.LEGEND}` : '') +
    `\n\n<sub>daily-digest.yml (forum) · lecture seule, aucun post sur le forum · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  if (posts.length && (NOTIFY === 'any' || missing.size || L.FORCE)) await L.postComment(issue, md);
  else console.log(posts.length ? 'New posts but no missing IDs (FORUM_NOTIFY=missing) — silent.' : 'No new post — silent.');
  await L.saveState(issue, 'forum', state);
});
