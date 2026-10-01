'use strict';
/**
 * scripts/digest/forum-watch.js — READ-ONLY watch of the relevant Homey community threads.
 * Public Discourse JSON (no login): detects posts newer than the last-seen post number per topic,
 * extracts enrichment leads (scripts/digest/enrich.js + leads.js) and cross-checks them against the
 * checkout — report only. ONE digest comment per run when new posts exist. Never posts on the forum.
 * Forum content is untrusted: only IDs, author and post links are echoed (never post bodies).
 *
 * Topics (FORUM_TOPICS, first = primary, checked every run; the others rotate oldest-checked first):
 *   140352 Universal Tuya Zigbee (this app, test thread) · 26439 Tuya Zigbee (JohanBendz app)
 *   89271 Tuya Zigbee device-request archive · 146735 Tuya Smart Life · 154077 Tuya Local
 *   21313 Tuya Cloud
 * Politeness (unchanged global limits): ≤ FORUM_MAX_REQUESTS (4) Discourse requests per run across
 * ALL topics, random 2–5 s between requests, descriptive User-Agent. One request per topic normally
 * (`/t/<id>/<lastSeen+1>.json` returns the window of new posts + metadata); a second only when more
 * than one window is new. On 429/403 → stop immediately, record back-off, skip FORUM_BACKOFF_HOURS.
 *
 * Env: FORUM_TOPICS · FORUM_TOPIC (legacy single topic) · FORUM_BASE · FORUM_MAX_NEW (60)
 *      FORUM_BOOTSTRAP (0) · FORUM_NOTIFY any|missing · FORUM_MAX_REQUESTS (4) · FORUM_BACKOFF_HOURS (20)
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const E = require('./enrich');
const LD = require('./leads');

const BASE = process.env.FORUM_BASE || 'https://community.homey.app';
const TOPICS = (process.env.FORUM_TOPICS || process.env.FORUM_TOPIC || '140352,26439,89271,146735,154077,21313').split(',').map((x) => x.trim()).filter((x) => /^\d+$/.test(x));
const MAX_NEW = Math.min(Number(process.env.FORUM_MAX_NEW || 60), 100);
const BOOT = Number(process.env.FORUM_BOOTSTRAP || 0);
const NOTIFY = process.env.FORUM_NOTIFY || 'any';
const DRIVERS = process.env.DRIVERS_DIR || 'drivers';
const MAX_REQ = Math.min(Number(process.env.FORUM_MAX_REQUESTS || 4), 4);
const BACKOFF_H = Number(process.env.FORUM_BACKOFF_HOURS || 20);
let reqUsed = 0;
async function forumGet(url) {
  if (reqUsed >= MAX_REQ) { const e = new Error('forum request budget exhausted'); e.budget = true; throw e; }
  if (reqUsed > 0) await L.jitter(2000, 5000); // 2–5 s random spacing between Discourse requests
  reqUsed++;
  return L.fetchJson(url);
}

const strip = (html) => String(html || '').replace(/<aside[\s\S]*?<\/aside>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

async function newPosts(topic, lastSeen) {
  if (lastSeen == null) { // baseline: metadata only
    const t = await forumGet(`${BASE}/t/${topic}.json`);
    const highest = t.highest_post_number || t.posts_count;
    if (BOOT <= 0) return { title: t.title, highest, posts: [] };
    lastSeen = highest - BOOT;
  }
  const t = await forumGet(`${BASE}/t/${topic}/${lastSeen + 1}.json`);
  const highest = t.highest_post_number || t.posts_count;
  const posts = (t.post_stream.posts || []).filter((p) => p.post_number > lastSeen);
  const want = Math.min(highest - lastSeen, MAX_NEW);
  if (posts.length < want && reqUsed < MAX_REQ) {
    const have = new Set(posts.map((p) => p.id));
    const stream = t.post_stream.stream || [];
    const ids = stream.slice(-Math.min(stream.length, want + 5)).filter((id) => !have.has(id)).slice(-20);
    if (ids.length) {
      const j = await forumGet(`${BASE}/t/${topic}/posts.json?${ids.map((id) => `post_ids[]=${id}`).join('&')}`);
      posts.push(...(j.post_stream.posts || []).filter((p) => p.post_number > lastSeen && !have.has(p.id)));
    }
  }
  return { title: t.title, highest, posts: posts.sort((a, b) => a.post_number - b.post_number) };
}

L.run(async () => {
  const { issue, prev } = await L.loadState('forum');
  if (prev && prev.blockedAt && Date.now() - Date.parse(prev.blockedAt) < BACKOFF_H * 3600e3) {
    console.log(`Discourse asked us to back off (${prev.blockedStatus}) at ${prev.blockedAt} — skipping until ${BACKOFF_H}h have passed.`);
    return;
  }
  const st = { topics: (prev && prev.topics) || {} };
  if (prev && prev.lastSeen != null && !st.topics['140352']) st.topics['140352'] = { lastSeen: prev.lastSeen, highest: prev.highest, at: prev.at }; // migrate v1
  const [primary, ...rest] = TOPICS;
  const order = [primary, ...rest.sort((a, b) => String((st.topics[a] || {}).at || '').localeCompare(String((st.topics[b] || {}).at || '')))];
  let idx = null;
  try { if (fs.existsSync(DRIVERS)) idx = E.buildIndex(path.resolve(DRIVERS, '..')); } catch (e) { L.log(`index failed: ${e.message}`); }
  const sections = []; const missing = new Set(); let totalNew = 0;
  for (const TOPIC of order) {
    if (reqUsed >= MAX_REQ) break;
    const ts = st.topics[TOPIC] || {};
    const lastSeen = ts.lastSeen ?? null;
    let res;
    try { res = await newPosts(TOPIC, lastSeen); } catch (e) {
      if (e.budget) break;
      if (e.status === 429 || e.status === 403) {
        console.log(`::warning::Discourse ${e.status} — stopping, back-off recorded (${BACKOFF_H}h).`);
        await L.saveState(issue, 'forum', { ...st, blockedAt: new Date().toISOString(), blockedStatus: e.status });
        return;
      }
      L.log(`topic ${TOPIC}: ${e.message}`); st.topics[TOPIC] = { ...ts, at: new Date().toISOString(), error: String(e.message).slice(0, 80) }; continue;
    }
    const { title, highest, posts } = res;
    st.topics[TOPIC] = { lastSeen: posts.length ? Math.max(lastSeen || 0, ...posts.map((p) => p.post_number)) : (lastSeen ?? highest), highest, title: String(title || '').slice(0, 80), at: new Date().toISOString() };
    if (lastSeen == null && BOOT <= 0) { console.log(`topic ${TOPIC}: baseline lastSeen=${highest} (no comment).`); continue; }
    const rows = [];
    for (const p of posts) {
      // Feedback loop: text + ≤3 CDN screenshots (local OCR, heuristic) + linked external device pages.
      const imgs = [...String(p.cooked).matchAll(/<img[^>]+src="([^"]+\/uploads\/[^"]+\.(?:png|jpe?g|webp))"/gi)].map((m) => (m[1].startsWith('//') ? 'https:' + m[1] : m[1].startsWith('/') ? BASE + m[1] : m[1]));
      try { await LD.recordDeep('forum', `${BASE}/t/${TOPIC}/${p.post_number}`, strip(p.cooked) + '\n' + imgs.join('\n'), { idx }); } catch (e) { L.log(`leads: ${e.message}`); }
      const ex = E.extract(strip(p.cooked));
      if (E.isEmpty(ex) && !Object.keys(ex.txrx).length && !ex.refMention) { rows.push(`- [#${p.post_number}](${BASE}/t/${TOPIC}/${p.post_number}) ${L.esc(p.username)} · ${L.paris(p.created_at)} — _pas d'identifiant technique_`); continue; }
      let leads;
      if (idx) { const c = E.check(ex, idx); leads = E.renderLeads(c); E.unmappedLeads(c).forEach((u) => missing.add(u)); }
      else leads = [ex.mfr.join(', '), ex.pid.join(', '), ex.dp.length ? 'DP ' + ex.dp.join(',') : ''].filter(Boolean).join(' · ');
      rows.push(`- [#${p.post_number}](${BASE}/t/${TOPIC}/${p.post_number}) ${L.esc(p.username)} · ${L.paris(p.created_at)} — ${leads}`);
    }
    totalNew += posts.length;
    if (posts.length) sections.push(`### Topic ${TOPIC} — ${L.esc(title)}\n**${posts.length}** nouveau(x) post(s) depuis #${lastSeen} (dernier : #${highest}).\n\n${rows.join('\n')}`);
  }
  const md = `## 💬 Forum watch — ${order.length} topics (${reqUsed}/${MAX_REQ} requêtes ce passage)\n\n` +
    (missing.size ? `🧭 **Pistes d'enrichissement (non mappées sur master)** : ${[...missing].slice(0, 40).map((m) => '`' + m + '`').join(', ')}\n\n` : idx && totalNew ? 'Tous les identifiants cités sont déjà connus ✅\n\n' : '') +
    (sections.length ? `${sections.join('\n\n')}\n\n${E.LEGEND}` : '_Aucun nouveau post._') +
    `\n\n<sub>daily-digest.yml (forum) · lecture seule, aucun post sur le forum · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  if (totalNew && (NOTIFY === 'any' || missing.size || L.FORCE)) await L.postComment(issue, md);
  else console.log(totalNew ? 'New posts but no missing IDs (FORUM_NOTIFY=missing) — silent.' : 'No new post — silent.');
  await L.saveState(issue, 'forum', st);
});
