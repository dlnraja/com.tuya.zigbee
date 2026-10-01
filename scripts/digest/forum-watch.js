'use strict';
/**
 * scripts/digest/forum-watch.js — replaces the "Homey forum scan" Grok routine. READ-ONLY.
 * Public Discourse JSON (no login): detects posts newer than the last-seen post number,
 * extracts Tuya manufacturer names (_TZ3000_xxxxxxxx, _TZE2xx_xxxxxxxx, _TYZB01_…, _TYST11_…)
 * and productIds (TS0xxx / TS1xxx) and cross-checks them against drivers/<id>/driver.compose.json
 * of the current checkout (master). Posts ONE digest comment when new posts exist.
 * Forum content is untrusted: only IDs, author, and post links are echoed (never post bodies).
 *
 * Env: FORUM_TOPIC (140352) · FORUM_BASE (https://community.homey.app)
 *      FORUM_MAX_NEW (60) · FORUM_BOOTSTRAP (0 = first run only records the baseline;
 *      N = also report the last N posts on first run) · DRIVERS_DIR (drivers)
 *      FORUM_NOTIFY = any (default: comment when any new post) | missing (only when unknown IDs)
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const BASE = process.env.FORUM_BASE || 'https://community.homey.app';
const TOPIC = process.env.FORUM_TOPIC || '140352';
const MAX_NEW = Number(process.env.FORUM_MAX_NEW || 60);
const BOOT = Number(process.env.FORUM_BOOTSTRAP || 0);
const NOTIFY = process.env.FORUM_NOTIFY || 'any';
const DRIVERS = process.env.DRIVERS_DIR || 'drivers';

const MFR_RE = /\b_(?:TZ[0-9A-Z]{4}|TZE[0-9]{3}|TYZB0[0-9]|TYST11|TZB[0-9]{3})_[a-z0-9]{8}\b/gi;
const PID_RE = /\bTS[01][0-9]{3}[A-Z]?\b/g;

function knownIds() {
  const mfr = new Map(); const pid = new Set();
  if (!fs.existsSync(DRIVERS)) { L.log(`no ${DRIVERS}/ — cross-check disabled`); return null; }
  for (const d of fs.readdirSync(DRIVERS)) {
    const f = path.join(DRIVERS, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    try {
      const z = (JSON.parse(fs.readFileSync(f, 'utf8')).zigbee) || {};
      for (const m of [].concat(z.manufacturerName || [])) {
        const k = String(m).toLowerCase();
        if (!mfr.has(k)) mfr.set(k, []);
        if (!mfr.get(k).includes(d)) mfr.get(k).push(d);
      }
      for (const p of [].concat(z.productId || [])) pid.add(String(p).toUpperCase());
    } catch (e) { L.log(`bad json ${f}: ${e.message}`); }
  }
  return { mfr, pid };
}

const strip = (html) => String(html || '').replace(/<aside[\s\S]*?<\/aside>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

async function newPosts(lastSeen) {
  const t = await L.fetchJson(`${BASE}/t/${TOPIC}.json`);
  const highest = t.highest_post_number || t.posts_count;
  const stream = t.post_stream.stream || [];
  let from = lastSeen;
  if (from == null) from = BOOT > 0 ? highest - BOOT : highest;
  const want = Math.min(highest - from, MAX_NEW);
  if (want <= 0) return { title: t.title, highest, posts: [] };
  const ids = stream.slice(-Math.min(stream.length, want + 10)); // small margin (deleted/whispers)
  const posts = [];
  for (let i = 0; i < ids.length; i += 20) {
    const q = ids.slice(i, i + 20).map((id) => `post_ids[]=${id}`).join('&');
    const j = await L.fetchJson(`${BASE}/t/${TOPIC}/posts.json?${q}`);
    posts.push(...(j.post_stream.posts || []));
    await L.sleep(800); // be gentle with Discourse rate limits
  }
  return { title: t.title, highest, posts: posts.filter((p) => p.post_number > from).sort((a, b) => a.post_number - b.post_number) };
}

(async () => {
  const { issue, prev } = await L.loadState('forum');
  const lastSeen = prev ? prev.lastSeen : null;
  const { title, highest, posts } = await newPosts(lastSeen);
  const known = knownIds();
  const rows = []; const missing = new Set();
  for (const p of posts) {
    const text = strip(p.cooked);
    const mfrs = [...new Set((text.match(MFR_RE) || []).map((s) => s.toLowerCase()))];
    const pids = [...new Set((text.match(PID_RE) || []).map((s) => s.toUpperCase()))];
    const tag = (m) => {
      if (!known) return '`' + m + '`';
      const ds = known.mfr.get(m);
      if (!ds) { missing.add(m); return '`' + m + '` ❌'; }
      return '`' + m + '` ✅ ' + ds.slice(0, 2).join(',') + (ds.length > 2 ? '…' : '');
    };
    const tagP = (x) => (!known ? x : known.pid.has(x) ? x : (missing.add(x), x + ' ❌'));
    rows.push(`| [#${p.post_number}](${BASE}/t/${TOPIC}/${p.post_number}) | ${L.esc(p.username)} | ${L.paris(p.created_at)} | ${mfrs.map(tag).join('<br>') || '—'} | ${pids.map(tagP).join(', ') || '—'} |`);
  }
  const state = { lastSeen: posts.length ? Math.max(lastSeen || 0, ...posts.map((p) => p.post_number)) : (lastSeen ?? highest), highest, at: new Date().toISOString() };
  if (lastSeen == null && BOOT <= 0) {
    console.log(`First run: baseline lastSeen=${highest} (no comment).`);
    await L.saveState(issue, 'forum', state);
    return;
  }
  const md = `## 💬 Forum watch — topic ${TOPIC} (${L.esc(title)})\n\n**${posts.length}** nouveau(x) post(s) depuis #${lastSeen ?? '—'} (dernier : #${highest}).` +
    (missing.size ? `\n\n⚠️ **Absents de \`drivers/*/driver.compose.json\` (master)** : ${[...missing].map((m) => '`' + m + '`').join(', ')}` : known ? '\n\nTous les IDs cités sont déjà couverts ✅' : '') +
    (rows.length ? `\n\n| Post | Auteur | Date | manufacturerName | productId |\n|---|---|---|---|---|\n${rows.join('\n')}` : '') +
    `\n\n<sub>forum-poll.yml (forum-watch) · lecture seule, aucun post sur le forum · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  if (posts.length && (NOTIFY === 'any' || missing.size || L.FORCE)) await L.postComment(issue, md);
  else console.log(posts.length ? 'New posts but no missing IDs (FORUM_NOTIFY=missing) — silent.' : 'No new post — silent.');
  await L.saveState(issue, 'forum', state);
})().catch((e) => { console.error(e); process.exit(1); });
