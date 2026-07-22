#!/usr/bin/env node
'use strict';
/**
 * enrich-orphan-drivers.js (P80.5) — v7 variants-aware variant of v4
 *
 * V4 was good (135 mfrs, 0 collisions) but didn't account for:
 *   - mfrs that cover MULTIPLE PIDs (e.g. _tz3000_xxx → [TS0601, TS0203])
 *   - mfrs that have VARIANTS (mfs_db.variants like _tzn3000_)
 *
 * V7 fix: when a mfr from mfs_db lists multiple modelIds, treat the mfr as
 * valid for ANY of the driver's PIDs that intersect with those modelIds.
 *
 * Keep v4's strong cross-orphan safety filter (no Sacred Couple collisions).
 *
 * Run:   node tools/ci/enrich-orphan-drivers.js
 * Apply: node tools/ci/enrich-orphan-drivers.js --apply
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const BLK_PID = path.join(ROOT, '.github', 'state', 'blakadder', 'mfr-pid.json');
const JOHAN_DEV = path.join(ROOT, '.github', 'state', 'johan-dump', 'devices.json');
const JOHAN_ISS = path.join(ROOT, '.github', 'state', 'johan-dump', 'issues.json');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');

const APPLY = process.argv.includes('--apply');

const EXEMPT_DRIVERS = new Set([
  'universal_fallback', 'tuya_dummy_device', 'generic_tuya', 'generic_diy',
  'device_generic_diy_universal', 'universal_zigbee'
]);

const CLASS_TO_CATS = {
  'thermostat': ['hvac'], 'heater': ['hvac'], 'fan': ['hvac', 'plug'],
  'humidifier': ['hvac'], 'dehumidifier': ['hvac'],
  'windowcoverings': ['cover'], 'curtain': ['cover'],
  'sensor': ['sensor'],
  'light': ['light', 'dimmer'],
  'socket': ['plug', 'switch', 'dimmer'],
  'button': ['switch', 'remote'],
  'remote': ['remote'],
  'doorbell': ['switch', 'sensor', 'misc'],
  'door': ['lock', 'misc'], 'garagedoor': ['misc', 'switch'],
  'lock': ['lock', 'misc'], 'camera': ['misc'], 'speaker': ['misc'],
  'vacuumcleaner': ['misc'],
  'other': ['misc', 'sensor', 'switch']
};

// 1. Load drivers
const drivers = new Map();
const globalMfrIndex = new Map();
for (const d of fs.readdirSync(DRIVERS)) {
  const cf = path.join(DRIVERS, d, 'driver.compose.json');
  if (!fs.existsSync(cf)) continue;
  try {
    const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
    const mfrs = j.zigbee?.manufacturerName || [];
    const pids = j.zigbee?.productId || [];
    drivers.set(d, {
      class: j.class || 'other',
      mfrs: new Set(mfrs),
      pids: new Set(pids),
      compose: j,
      path: cf
    });
    for (const m of mfrs) {
      if (!globalMfrIndex.has(m)) globalMfrIndex.set(m, []);
      globalMfrIndex.get(m).push(d);
    }
  } catch {}
}

// 2. Build mfr -> {pids:Set, cats:Set, realKey:String, source} from sources
const mfrData = new Map();
const addMfr = (mfr, pid, cats, src) => {
  if (!mfr) return;
  if (!mfrData.has(mfr)) mfrData.set(mfr, { pids: new Set(), cats: new Set(), sources: new Set() });
  const d = mfrData.get(mfr);
  if (pid) d.pids.add(pid);
  if (cats) for (const c of cats) d.cats.add(c);
  if (src) d.sources.add(src);
};

if (fs.existsSync(BLK_PID)) {
  const blk = JSON.parse(fs.readFileSync(BLK_PID, 'utf8'));
  for (const k of Object.keys(blk)) {
    const e = blk[k];
    addMfr(e.mfr, e.pid, e.categories, 'blakadder');
  }
}
if (fs.existsSync(JOHAN_DEV)) {
  const jd = JSON.parse(fs.readFileSync(JOHAN_DEV, 'utf8'));
  for (const d of jd) {
    for (const pid of (d.pids || [])) {
      for (const mfr of (d.mfrs || [])) addMfr(mfr, pid, null, 'johan-dev');
    }
  }
}
if (fs.existsSync(JOHAN_ISS)) {
  const ji = JSON.parse(fs.readFileSync(JOHAN_ISS, 'utf8'));
  const pidRe = /\b(TS[0-9]{4}[A-Za-z_]*|TY[0-9]{4}[A-Za-z_]*|RH[0-9]{4}[A-Za-z_]*|ZBMINI[A-Za-z0-9_]*|BASICZBR3|01MINIZB|S31ZB|S26R2ZB|CK-TLSR8656-SS5-01\([0-9]+\)|SNTZ003|ZG-[0-9]+Z[a-zA-Z0-9_]*)\b/g;
  const mfrRe = /_T[YZ][A-Z0-9]{0,4}_[a-zA-Z0-9_]+/g;
  for (const i of ji) {
    const body = i.body || '';
    const mfrs = [...new Set([...body.matchAll(mfrRe)].map(m => m[0]))];
    const pids = [...new Set([...body.matchAll(pidRe)].map(m => m[0]))];
    for (const m of mfrs) for (const p of pids) addMfr(m, p, null, 'johan-iss');
  }
}
// mfs_db: register the primary mfr + each variant as a separate mfr entry
// but use the model's "category" as a class hint (we use this as additional cat info)
if (fs.existsSync(MFS_DB)) {
  const mfs = JSON.parse(fs.readFileSync(MFS_DB, 'utf8'));
  const devs = mfs.devices || {};
  for (const k of Object.keys(devs)) {
    const dev = devs[k];
    if (!dev.modelIds) continue;
    // Determine cat from deviceType
    const dt = dev.deviceType || '';
    const hint = dev.driverHint || '';
    const cats = [];
    if (dt === 'thermostat' || hint.includes('radiator') || hint.includes('thermostat')) cats.push('hvac');
    if (dt === 'sensor' || hint.includes('sensor') || hint.includes('leak') || hint.includes('motion')) cats.push('sensor');
    if (dt === 'light' || hint.includes('bulb') || hint.includes('light') || hint.includes('led')) cats.push('light', 'dimmer');
    if (dt === 'switch' || dt === 'plug' || hint.includes('plug') || hint.includes('switch') || hint.includes('dimmer') || hint.includes('socket')) cats.push('plug', 'switch', 'dimmer');
    if (dt === 'cover' || dt === 'curtain' || hint.includes('curtain')) cats.push('cover');
    if (dt === 'lock' || hint.includes('lock')) cats.push('lock', 'misc');
    if (dt === 'fan' || hint.includes('fan') || hint.includes('purifier') || hint.includes('air')) cats.push('hvac');
    if (cats.length === 0) cats.push('misc', 'sensor', 'switch');
    // Primary mfr
    for (const pid of dev.modelIds) addMfr(k, pid, cats, 'mfs-db');
    // Each variant
    for (const v of (dev.variants || [])) {
      for (const pid of dev.modelIds) addMfr(v, pid, cats, 'mfs-db-variant');
    }
  }
}

// 3. Find orphan zigbee drivers
const orphans = [];
for (const [d, info] of drivers) {
  if (info.mfrs.size > 0) continue;
  if (info.pids.size === 0) continue;
  orphans.push({ driver: d, class: info.class, pids: [...info.pids] });
}
console.log(`Orphan zigbee drivers (have PIDs, no mfrs): ${orphans.length}`);

// 4. For each orphan: candidates = mfrs that have at least one matching PID
// AND (no cats known OR cat match class)
const orphanCands = new Map();
for (const o of orphans) {
  const allowedCats = CLASS_TO_CATS[o.class] || ['misc'];
  const cands = new Set();
  for (const [mfr, data] of mfrData) {
    if (data.cats.size > 0) {
      const catMatch = [...data.cats].some(c => allowedCats.includes(c));
      if (!catMatch) continue;
    }
    // PID match: mfr covers at least one of driver's PIDs
    const pidMatch = o.pids.some(p => data.pids.has(p));
    if (!pidMatch) continue;
    cands.add(mfr);
  }
  orphanCands.set(o.driver, cands);
}

// 5. Build mfr -> [orphans] for cross-orphan detection
const mfrToOrphans = new Map();
for (const [drv, cands] of orphanCands) {
  for (const m of cands) {
    if (!mfrToOrphans.has(m)) mfrToOrphans.set(m, []);
    mfrToOrphans.get(m).push(drv);
  }
}

// 6. Filter: not in any existing non-exempt driver + no cross-orphan
const proposals = [];
for (const o of orphans) {
  const cands = orphanCands.get(o.driver);
  const unique = [];
  for (const m of cands) {
    const otherDrivers = (globalMfrIndex.get(m) || []).filter(d => d !== o.driver);
    const realDupes = otherDrivers.filter(d => !EXEMPT_DRIVERS.has(d));
    if (realDupes.length > 0) continue;
    const competingOrphans = (mfrToOrphans.get(m) || []).filter(d => d !== o.driver);
    if (competingOrphans.length > 0) continue;
    unique.push(m);
  }
  proposals.push({ driver: o.driver, class: o.class, pids: o.pids, candidates: unique, candsTotal: cands.size });
}

console.log('\n=== P80.5 — Orphan driver enrichment (v7 variants-aware) ===\n');
let totalToAdd = 0;
for (const p of proposals) {
  if (p.candidates.length === 0) {
    console.log(`[SKIP] ${p.driver} [${p.class}]: no unique mfrs (cands: ${p.candsTotal})`);
    continue;
  }
  console.log(`[CAND] ${p.driver} [${p.class}]: +${p.candidates.length} mfrs (cands: ${p.candsTotal})`);
  for (const m of p.candidates.slice(0, 5)) console.log(`        + ${m}`);
  if (p.candidates.length > 5) console.log(`        ... and ${p.candidates.length - 5} more`);
  totalToAdd += p.candidates.length;
}
console.log(`\nTotal candidate mfrs: ${totalToAdd}`);

if (!APPLY) {
  console.log('\n=== PREVIEW MODE ===');
  process.exit(0);
}

let totalApplied = 0;
for (const p of proposals) {
  if (p.candidates.length === 0) continue;
  const info = drivers.get(p.driver);
  const j = info.compose;
  if (!j.zigbee) j.zigbee = {};
  if (!Array.isArray(j.zigbee.manufacturerName)) j.zigbee.manufacturerName = [];
  const existing = new Set(j.zigbee.manufacturerName);
  let added = 0;
  for (const m of p.candidates) {
    if (existing.has(m)) continue;
    j.zigbee.manufacturerName.push(m);
    existing.add(m);
    added++;
  }
  if (added > 0) {
    j.zigbee.manufacturerName.sort();
    fs.writeFileSync(info.path, JSON.stringify(j, null, 2) + '\n');
    console.log(`  [APPLIED] ${p.driver}: +${added} mfrs`);
    totalApplied += added;
  }
}
console.log(`\nTotal mfrs applied: ${totalApplied}`);
