'use strict';
/**
 * scripts/digest/quirks-scan.js — feeds the firmware-quirk dataset (see quirks.js). Report-only.
 * Env: QUIRKS_DB · QUIRKS_LEADS_DIR (digest-leads) · QUIRKS_GH_MAX (4) · QUIRKS_DISCOURSE_MAX (1)
 *      QUIRKS_RECHECK_DAYS (30) · DIGEST_MAX_API_CALLS
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./lib');
const Q = require('./quirks');

const LEADS_DIR = process.env.QUIRKS_LEADS_DIR || 'digest-leads';
const GH_MAX = Math.min(Number(process.env.QUIRKS_GH_MAX || 4), 6);
const DISC_MAX = Math.min(Number(process.env.QUIRKS_DISCOURSE_MAX || 1), 2);
const RECHECK = Number(process.env.QUIRKS_RECHECK_DAYS || 30) * 864e5;
// Public Zigbee projects whose trackers document device behaviour (searched together, 1 call/pair).
const TRACKERS = (process.env.QUIRKS_TRACKERS || 'Koenkk/zigbee2mqtt,Koenkk/zigbee-herdsman-converters,zigpy/zha-device-handlers,dresden-elektronik/deconz-rest-plugin,arendst/Tasmota,ioBroker/ioBroker.zigbee,home-assistant/core,JohanBendz/com.tuya.zigbee').split(',');
// Public Discourse forums of other home-automation communities (multilingual), one per run, rotating.
const FORUMS = (process.env.QUIRKS_FORUMS || 'https://community.home-assistant.io,https://community.hubitat.com,https://community.smartthings.com,https://community.openhab.org,https://community.jeedom.com').split(',');
const UA = L.UA || 'dlnraja-com.tuya.zigbee-digest/1.0 (+https://github.com/dlnraja/com.tuya.zigbee)';

function leadRecords() {
  const out = [];
  const walk = (d) => { let e = []; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const x of e) { const p = path.join(d, x.name); if (x.isDirectory()) walk(p); else if (x.name.endsWith('.json') && x.name !== 'quirks.json') { try { out.push(...(JSON.parse(fs.readFileSync(p, 'utf8')).records || [])); } catch { /* skip */ } } } };
  walk(LEADS_DIR);
  return out;
}

L.run(async () => {
  const { issue, prev } = await L.loadState('quirks');
  const st = prev || { forumIdx: 0, reported: [] };
  const db = Q.load();
  const events = [];
  // 1) own sources (already classified in leads.js)
  const recs = leadRecords();
  const queue = new Map();
  for (const r of recs) {
    const qs = (r.signals && r.signals.quirks) || [];
    const pairs = (r.couples && r.couples.length) ? r.couples : (r.mfr && r.mfr.length === 1 ? [{ mfr: r.mfr[0], pid: (r.pid && r.pid.length === 1) ? r.pid[0] : '?' }] : []);
    for (const c of pairs) {
      if (qs.length) events.push(...Q.addEvidence(db, c.mfr, c.pid, qs, r.ref, r.source));
      queue.set(`${c.mfr.toLowerCase()}|${String(c.pid).toUpperCase()}`, c);
    }
  }
  // stale pairs from the dataset (recheck), newest leads first
  for (const [k, v] of Object.entries(db.pairs)) if (!queue.has(k) && (!v.checkedAt || Date.now() - Date.parse(v.checkedAt) > RECHECK)) { const [mfr, pid] = k.split('|'); queue.set(k, { mfr, pid }); }
  const todo = [...queue.entries()].filter(([k]) => { const v = db.pairs[k]; return !v || !v.checkedAt || Date.now() - Date.parse(v.checkedAt) > RECHECK; }).slice(0, GH_MAX);
  // 2) external trackers via GitHub issue search (search pool: 30/min; ≥3 s apart)
  let gh = 0;
  for (const [k, c] of todo) {
    if (gh) await L.sleep(3000 + Math.floor(Math.random() * 2000));
    gh++;
    const q = `"${c.mfr}" ${TRACKERS.map((r) => `repo:${r}`).join(' ')}`;
    let res;
    try { res = await L.gh(`/search/issues?q=${encodeURIComponent(q)}&per_page=10&sort=updated`); } catch (e) { if (e.name === 'StopDigest') throw e; L.log(`search ${c.mfr}: ${e.message.slice(0, 80)}`); continue; }
    for (const it of (res.items || [])) {
      const text = `${it.title}\n${it.body || ''}`;
      if (c.pid !== '?' && !text.toUpperCase().includes(String(c.pid).toUpperCase()) && !text.toLowerCase().includes(c.mfr.toLowerCase())) continue;
      const qs = Q.classify(text);
      if (qs.length) events.push(...Q.addEvidence(db, c.mfr, c.pid, qs, it.html_url, 'ext-tracker'));
    }
    (db.pairs[k] || (db.pairs[k] = { quirks: {} })).checkedAt = new Date().toISOString();
  }
  // 3) one rotating community forum (Discourse search), first pair of the batch only
  for (let i = 0; i < DISC_MAX && todo.length; i++) {
    const base = FORUMS[(st.forumIdx || 0) % FORUMS.length]; st.forumIdx = ((st.forumIdx || 0) + 1) % FORUMS.length;
    const [, c] = todo[i];
    await L.sleep(3000 + Math.floor(Math.random() * 3000));
    try {
      const res = await fetch(`${base}/search.json?q=${encodeURIComponent(c.mfr)}`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      if (res.status === 429 || res.status === 403) { L.log(`${base}: ${res.status} — skipped`); continue; }
      const j = res.ok ? await res.json() : {};
      for (const p of (j.posts || []).slice(0, 15)) {
        const qs = Q.classify(p.blurb);
        if (qs.length) events.push(...Q.addEvidence(db, c.mfr, c.pid, qs, `${base}/t/${p.topic_id}/${p.post_number}`, 'ext-forum'));
      }
    } catch (e) { L.log(`${base}: ${e.message.slice(0, 80)}`); }
  }
  Q.save(db);
  const fresh = events.filter((e) => e.isNew || e.becameConfirmed);
  fs.mkdirSync(LEADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(LEADS_DIR, 'quirks.json'), JSON.stringify({ at: new Date().toISOString(), events: fresh, searched: gh, pairs: Object.keys(db.pairs).length }, null, 1));
  const reported = new Set(st.reported || []);
  const h8 = (e) => crypto.createHash('sha1').update(`${e.key}#${e.quirk}#${e.becameConfirmed ? 'c' : 'n'}`).digest('hex').slice(0, 8);
  const toReport = fresh.filter((e) => !reported.has(h8(e)));
  toReport.forEach((e) => reported.add(h8(e)));
  st.reported = [...reported].slice(-600); // issue body ≤ 65 536 chars st.at = new Date().toISOString();
  const line = (e) => { const q = db.pairs[e.key].quirks[e.quirk]; return `- \`${e.key.replace('|', ' + ')}\` — **${e.quirk}** · ${q.sources.length} source(s) · ${q.heuristic ? '🟡 heuristique (1 source)' : '🟢 confirmé (≥2 sources indépendantes)'}`; };
  const md = `## 🧩 Quirks firmware — ${toReport.length} nouveauté(s)\n\n${gh} recherche(s) de recoupement externe ce passage · ${Object.keys(db.pairs).length} couple(s) suivis.\n\n${toReport.slice(0, 30).map(line).join('\n')}\n\n<sub>Rapport seul — aucune modification de driver. Sources détaillées dans l'artefact digest-leads (quirks.json). daily-digest.yml (inspiration/quirks) · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  if (toReport.length && prev) await L.postComment(issue, md); // first run = silent baseline
  await L.saveState(issue, 'quirks', st);
});
