#!/usr/bin/env node
'use strict';
// Spec 002 gate: (a) no non-native cluster listed in driver endpoint clusters (pairing manifest),
// (b) a case-insensitive mfr+pid couple lives on one driver only.
// Existing violations are frozen in data/native-matrix-baseline.json (shrink-only); new ones fail.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const BASE = path.join(ROOT, 'data', 'native-matrix-baseline.json');
const NON_NATIVE = new Set([0xEF00, 0xEF01, 0xE000, 0xE001]);
// Non-native set mirrors data/native-matrix.json rules (scripts/gen/native-matrix.js).
const isNonNative = (c) => NON_NATIVE.has(c) || (c >= 0xFC00 && c <= 0xFFFF) || (c >= 0xE000 && c <= 0xE002);
// Brand-style manufacturer names (HOBEIAN, eWeLink, …) intentionally span several drivers and are
// split at runtime (P2671 doctrine); only Tuya-style `_T…_` identities are checked for couples.
const isTuyaStyle = (m) => m.startsWith('_');

function scan() {
  const dir = path.join(ROOT, 'drivers');
  const mandatory = [];
  const couples = new Map();
  for (const id of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    const z = j.zigbee || {};
    for (const [ep, def] of Object.entries(z.endpoints || {})) {
      for (const c of (def && def.clusters) || []) {
        const n = Number(c);
        if (Number.isFinite(n) && isNonNative(n)) mandatory.push(`${id}:ep${ep}:0x${n.toString(16).toUpperCase()}`);
      }
    }
    const m = [].concat(z.manufacturerName || []).map((s) => String(s).toLowerCase());
    const p = [].concat(z.productId || []).map((s) => String(s).toLowerCase());
    for (const a of new Set(m.filter(isTuyaStyle))) for (const b of new Set(p)) {
      const k = `${a}|${b}`;
      if (!couples.has(k)) couples.set(k, new Set());
      couples.get(k).add(id);
    }
  }
  const dual = [];
  for (const [k, s] of couples) if (s.size > 1) dual.push(`${k}=>${[...s].sort().join(',')}`);
  return { mandatory: [...new Set(mandatory)].sort(), dual: dual.sort() };
}

const cur = scan();
if (process.argv.includes('--write-baseline')) {
  fs.writeFileSync(BASE, JSON.stringify({ note: 'Spec 002 frozen violations (shrink-only). Regenerate with --write-baseline only when removing entries.', ...cur }, null, 1) + '\n');
  console.log(`baseline written: mandatory=${cur.mandatory.length} dual=${cur.dual.length}`);
  process.exit(0);
}
const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : { mandatory: [], dual: [] };
const bm = new Set(base.mandatory), bd = new Set(base.dual);
const newM = cur.mandatory.filter((x) => !bm.has(x));
// Reviewed exceptions (user decision 2026-10-04): exact-pair placements where the old driver keeps the
// couple (never remove). Each entry needs couple, drivers, reason, source and date; it only covers that
// exact driver set, so spreading the couple to a further driver fails again.
const ALLOW = path.join(ROOT, 'data', 'native-matrix-reviewed-duals.json');
const reviewed = new Map();
const reviewedMfr = new Set();
if (fs.existsSync(ALLOW)) {
  for (const e of JSON.parse(fs.readFileSync(ALLOW, 'utf8')).entries || []) {
    const ok = e && e.couple && Array.isArray(e.drivers) && e.reason && e.source && e.date;
    if (!ok) { console.error(`[native-matrix-gate] invalid reviewed entry: ${JSON.stringify(e)}`); process.exit(1); }
    reviewed.set(`${String(e.couple).toLowerCase()}=>${[...e.drivers].sort().join(',')}`, e);
    // Homey matches manufacturerName and productId independently, so a driver with many productIds
    // produces extra mfr|pid combinations for the same manufacturer. They are covered only for the same
    // manufacturer and the exact same driver set as the reviewed couple.
    reviewedMfr.add(`${String(e.couple).toLowerCase().split('|')[0]}=>${[...e.drivers].sort().join(',')}`);
  }
}
function isReviewed(x) {
  if (reviewed.has(x)) { return true; }
  const [k, drv] = x.split('=>');
  return reviewedMfr.has(`${k.split('|')[0]}=>${drv}`);
}
const newD = cur.dual.filter((x) => !bd.has(x) && !isReviewed(x));
const reviewedHits = cur.dual.filter((x) => !bd.has(x) && isReviewed(x)).length;
const gone = base.mandatory.length + base.dual.length - (cur.mandatory.length - newM.length) - (cur.dual.length - newD.length - reviewedHits);
console.log(`[native-matrix-gate] mandatory non-native=${cur.mandatory.length} (baseline ${bm.size}), dual couples=${cur.dual.length} (baseline ${bd.size}), resolved since baseline=${gone}, reviewed exceptions in use=${reviewedHits}`);
if (newM.length || newD.length) {
  for (const x of newM) console.error(`NEW mandatory non-native cluster: ${x}`);
  for (const x of newD) console.error(`NEW dual couple: ${x}`);
  process.exit(1);
}
console.log('[native-matrix-gate] OK');
