'use strict';
/**
 * scripts/digest/lookup.js — free "smart search" for UNMAPPED mfr/pid leads. Report-only.
 * Order (cheapest first, reuse existing repo data):
 *   1. data/z2m_herdsman_cache.json  (existing Z2M snapshot: vendor/model/DPs per mfr)
 *   2. scripts/sync/data/blakadder.json (refreshed daily by the existing blakadder-fetch.yml)
 *   3. GitHub code search on Koenkk/zigbee-herdsman-converters + zigpy/zha-device-handlers,
 *      HARD budget (LOOKUP_CODE_SEARCH_MAX, default 5 per run) spaced ≥ 7 s (limit is 10/min).
 *      Any 403/422/429 → stop online search for the rest of the run (no retry storm).
 * Always attaches a plain web-search link (no API call) so a human can follow up.
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const MAX_CS = Math.min(Number(process.env.LOOKUP_CODE_SEARCH_MAX || 5), 5);
let csUsed = 0; let csBlocked = false; let lastCs = 0;

let Z2M = null; let BLAK = null;
function loadOffline(root) {
  if (Z2M === null) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(root, 'data', 'z2m_herdsman_cache.json'), 'utf8'));
      const byMfr = {};
      for (const [m, ids] of Object.entries(j.byMfr || {})) byMfr[m.toLowerCase()] = [].concat(ids).map((i) => j.devices[i]).filter(Boolean);
      const byModel = {};
      for (const d of j.devices || []) for (const mid of d.modelIds || []) (byModel[String(mid).toUpperCase()] = byModel[String(mid).toUpperCase()] || []).push(d);
      Z2M = { byMfr, byModel, fetched: j._meta && j._meta.fetched };
    } catch (_) { Z2M = { byMfr: {}, byModel: {} }; }
  }
  if (BLAK === null) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'sync', 'data', 'blakadder.json'), 'utf8'));
      const byMfr = {};
      for (const f of [...(j.fingerprints || []), ...(j.genericMfrs || [])]) (byMfr[String(f.mfr).toLowerCase()] = byMfr[String(f.mfr).toLowerCase()] || []).push(f);
      BLAK = { byMfr, pids: new Set((j.tsProductIds || []).map((p) => String(p).toUpperCase())), date: j.date };
    } catch (_) { BLAK = { byMfr: {}, pids: new Set() }; }
  }
}

const webSearch = (q, repo) => `https://github.com/search?q=${encodeURIComponent(`repo:${repo} "${q}"`)}&type=code`;

async function codeSearch(q, repo) {
  if (csBlocked || csUsed >= MAX_CS) return null;
  const wait = lastCs + 7000 - Date.now();
  if (wait > 0) await L.sleep(wait);
  csUsed++; lastCs = Date.now();
  try {
    const r = await L.gh(`/search/code?q=${encodeURIComponent(`"${q}" repo:${repo}`)}&per_page=3`);
    return (r.items || []).map((i) => ({ path: i.path, url: i.html_url }));
  } catch (e) {
    csBlocked = true; // 403/422 (token cannot code-search) or rate limit: stop online lookups this run
    L.log(`code search disabled for this run: ${e.message.slice(0, 120)}`);
    return null;
  }
}

/** Returns markdown lines for one unmapped lead ("mfr:_tze..." or "pid:TS0xxx"). */
async function lookup(lead, root = process.cwd()) {
  loadOffline(root);
  const [kind, val] = lead.split(/:(.+)/);
  const out = [];
  if (kind === 'mfr') {
    for (const d of (Z2M.byMfr[val] || []).slice(0, 2)) {
      const dps = (d.dps || []).slice(0, 10).map((x) => `${x.id}:${L.esc(x.name)}`).join(', ');
      out.push(`Z2M (cache ${String(Z2M.fetched || '').slice(0, 10)}) : ${L.esc(d.vendor)} ${L.esc(d.model)} — ${L.esc(d.description)} · pid ${(d.modelIds || []).filter((m) => /^[\w.-]+$/.test(m)).join('/') || '?'}${dps ? ` · DP ${dps}` : ''}${(d.exposes || []).length ? ` · exposes ${d.exposes.slice(0, 6).join(',')}` : ''}`);
    }
    for (const b of (BLAK.byMfr[val] || []).slice(0, 2)) out.push(`Blakadder : ${L.esc(b.vendor)} ${L.esc(b.model)} (${L.esc(b.category)}${b.productId ? ', ' + b.productId : ''}${b.compatibility ? ', ' + b.compatibility.join('/') : ''})`);
    if (!out.length) {
      for (const repo of ['Koenkk/zigbee-herdsman-converters', 'zigpy/zha-device-handlers']) {
        const hits = await codeSearch(val, repo);
        if (hits && hits.length) out.push(`${repo.split('/')[1]} : ${hits.map((h) => `[${L.esc(h.path)}](${h.url})`).join(', ')}`);
        else if (hits) out.push(`${repo.split('/')[1]} : aucune occurrence`);
      }
    }
    out.push(`🔎 [Z2M](${webSearch(val, 'Koenkk/zigbee-herdsman-converters')}) · [ZHA](${webSearch(val, 'zigpy/zha-device-handlers')})`);
  } else if (kind === 'pid') {
    const z = (Z2M.byModel[val] || []).length;
    out.push(`Z2M cache : ${z} device(s) avec ce modelId${BLAK.pids.has(val) ? ' · Blakadder : connu' : ''} · 🔎 [Z2M](${webSearch(val, 'Koenkk/zigbee-herdsman-converters')})`);
  }
  return out;
}

module.exports = { lookup, stats: () => ({ codeSearchUsed: csUsed, codeSearchBlocked: csBlocked }) };
