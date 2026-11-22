'use strict';

/**
 * P2675 — Curated fingerprints ← sacred-keep complementary enrich
 *
 * WHY: P2674 skips broad lib/tuya/fingerprints.json (~0.9MB) under Homey heap
 *      pressure. Curated data/fingerprints.json must carry max sacred-couple
 *      coverage so boot still routes correctly without inventing pids.
 * HOW: Union publish-sacred-keep-couples into curated (ComplementaryMerge);
 *      add case variants (lower/UPPER) without wiping entries.
 * WHO: Homey runtime BOTH tracks (reliability).
 * WHEN: enrich cron / agent deep-coverage / before publish after P2674.
 * AGAINST: empty curated under pressure → Unknown / wrong driver after OOM harden.
 *
 * Usage:
 *   node tools/ci/p2675-curated-fingerprint-sacred-enrich.js           # dry-run
 *   node tools/ci/p2675-curated-fingerprint-sacred-enrich.js --apply
 *   node tools/ci/p2675-curated-fingerprint-sacred-enrich.js --check
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CURATED = path.join(ROOT, 'data', 'fingerprints.json');
const KEEP = path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json');
const MAX_CURATED_BYTES = 200 * 1024; // leave headroom under P2674 256KB pressure gate

const { unionStrings } = require('../../lib/enrichment/ComplementaryMerge');

function caseVariants(mfr) {
  const s = String(mfr || '');
  if (!s) return [];
  const out = [s];
  const low = s.toLowerCase();
  const up = s.toUpperCase();
  if (low !== s) out.push(low);
  if (up !== s && up !== low) out.push(up);
  return out;
}

function buildFromKeep(keep) {
  const byMfr = {};
  for (const c of keep.couples || []) {
    if (!c || !c.mfr || !c.pid || !c.driverId) continue;
    const mfr = String(c.mfr);
    if (!byMfr[mfr]) {
      byMfr[mfr] = {
        driverId: c.driverId,
        type: c.driverId,
        powerSource: c.powerSource || null,
        modelIds: [],
      };
    }
    byMfr[mfr].modelIds = unionStrings(byMfr[mfr].modelIds, [c.pid]);
    if (!byMfr[mfr].driverId) byMfr[mfr].driverId = c.driverId;
  }
  return byMfr;
}

/** Case-insensitive key already in `out`, or null. */
function existingKey(out, mfr) {
  const n = String(mfr || '').toLowerCase();
  if (!n) return null;
  for (const k of Object.keys(out)) {
    if (k.toLowerCase() === n) return k;
  }
  return null;
}

/**
 * Prefer the mixed-case Tuya spelling when collapsing duplicate case keys.
 */
function preferredKey(keys) {
  const mixed = keys.find((k) => k !== k.toLowerCase() && k !== k.toUpperCase());
  return mixed || keys[0];
}

function copyFp(fp) {
  const next = { ...fp };
  next.modelIds = [...(fp.modelIds || [])];
  if (!next.type) next.type = next.driverId;
  if (!('powerSource' in next)) next.powerSource = null;
  return next;
}

function unionEntry(base, incoming) {
  const next = copyFp(base);
  next.modelIds = unionStrings(next.modelIds, incoming.modelIds);
  if (!next.driverId) next.driverId = incoming.driverId;
  if (!next.type) next.type = incoming.type || incoming.driverId;
  const rank = { battery: 3, mains: 2, unknown: 1 };
  if ((rank[incoming.powerSource] || 0) > (rank[next.powerSource] || 0)) {
    next.powerSource = incoming.powerSource;
  }
  if (incoming.dps && typeof incoming.dps === 'object') {
    next.dps = { ...(next.dps || {}), ...incoming.dps };
  }
  for (const k of Object.keys(incoming)) {
    if (k === 'driverId' || k === 'type' || k === 'powerSource' || k === 'modelIds' || k === 'dps') continue;
    if (next[k] == null && incoming[k] != null) next[k] = incoming[k];
  }
  return next;
}

/**
 * WHY(P2675): DeviceFingerprintDB already looks up via a lowercase index, so
 * storing lower/UPPER copies of every mfr (caseVariants) tripled the file.
 * P2607 re-added 86 sacred-keep couples; a pretty-printed 3-way case expand
 * then measured 231019 bytes and failed the 200KB pressure budget. Collapse
 * to one key per mfr and write compact JSON. Coverage stays case-insensitive.
 */
function mergeCurated(curated, fromKeep) {
  const groups = new Map();
  for (const [mfr, fp] of Object.entries(curated || {})) {
    const n = String(mfr || '').toLowerCase();
    if (!n) continue;
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push([mfr, fp]);
  }
  const out = {};
  for (const items of groups.values()) {
    const key = preferredKey(items.map((x) => x[0]));
    let entry = copyFp(items[0][1]);
    for (let i = 1; i < items.length; i++) entry = unionEntry(entry, items[i][1]);
    out[key] = entry;
  }
  let added = 0;
  let updated = 0;
  for (const [mfr, fp] of Object.entries(fromKeep)) {
    const hit = existingKey(out, mfr);
    if (!hit) {
      out[mfr] = copyFp(fp);
      added += 1;
      continue;
    }
    const before = JSON.stringify(out[hit].modelIds || []);
    out[hit] = unionEntry(out[hit], fp);
    if (JSON.stringify(out[hit].modelIds) !== before) updated += 1;
  }
  return { out, added, updated };
}

function main() {
  const apply = process.argv.includes('--apply');
  const check = process.argv.includes('--check');

  const keep = JSON.parse(fs.readFileSync(KEEP, 'utf8'));
  const curated = JSON.parse(fs.readFileSync(CURATED, 'utf8'));
  const fromKeep = buildFromKeep(keep);
  const { out, added, updated } = mergeCurated(curated, fromKeep);
  const json = `${JSON.stringify(out)}\n`;
  const bytes = Buffer.byteLength(json);

  const summary = {
    sacredCouples: (keep.couples || []).length,
    curatedBefore: Object.keys(curated).length,
    curatedAfter: Object.keys(out).length,
    added,
    updated,
    bytes,
    maxBytes: MAX_CURATED_BYTES,
  };

  if (bytes > MAX_CURATED_BYTES) {
    console.error('[P2675] FAIL curated would exceed pressure budget', summary);
    process.exit(1);
  }

  // Contre quoi: every sacred-keep mfr must resolve in curated after merge
  const missing = [];
  for (const c of keep.couples || []) {
    if (!c?.mfr) continue;
    const key = existingKey(out, c.mfr);
    const entry = key ? out[key] : null;
    const hit = !!(entry && (entry.driverId === c.driverId
      || (entry.modelIds || []).map((x) => String(x).toLowerCase()).includes(String(c.pid).toLowerCase())));
    if (!hit && !entry) missing.push(`${c.mfr}+${c.pid}`);
  }

  if (check) {
    if (missing.length) {
      console.error('[P2675] FAIL missing curated coverage', missing.slice(0, 20));
      process.exit(1);
    }
    if (Object.keys(curated).length < 100) {
      console.error('[P2675] FAIL curated too thin for pressure boot', Object.keys(curated).length);
      process.exit(1);
    }
    console.log('[P2675] OK', summary);
    process.exit(0);
  }

  console.log('[P2675]', apply ? 'APPLY' : 'DRY-RUN', summary);
  if (missing.length) console.log('[P2675] would cover previously missing', missing.length);

  if (apply) {
    fs.writeFileSync(CURATED, json);
    console.log('[P2675] wrote', CURATED);
  }
}

main();
