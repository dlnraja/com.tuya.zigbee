#!/usr/bin/env node
'use strict';
/**
 * enrich-orphan-drivers.js (P80.3) — v4: cross-orphan safe
 *
 * For each orphan zigbee driver (has PIDs, no mfrs), find mfrs that:
 *   1) Match the driver's class via Blakader category
 *   2) Are NOT in any existing (non-exempt) driver
 *   3) Are NOT wanted by another orphan driver of the same PID
 *      (if 2 orphans want the same mfr, neither gets it)
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

// 1. Load drivers + global mfr index
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

// 2. Build pid -> [{mfr, cats}] from sources
const pidToMfrs = new Map();
if (fs.existsSync(BLK_PID)) {
  const blk = JSON.parse(fs.readFileSync(BLK_PID, 'utf8'));
  for (const k of Object.keys(blk)) {
    const e = blk[k];
    if (!pidToMfrs.has(e.pid)) pidToMfrs.set(e.pid, []);
    pidToMfrs.get(e.pid).push({ mfr: e.mfr, cats: e.categories || ['misc'] });
  }
}
if (fs.existsSync(JOHAN_DEV)) {
  const jd = JSON.parse(fs.readFileSync(JOHAN_DEV, 'utf8'));
  for (const d of jd) {
    for (const pid of (d.pids || [])) {
      for (const mfr of (d.mfrs || [])) {
        if (!pidToMfrs.has(pid)) pidToMfrs.set(pid, []);
        if (!pidToMfrs.get(pid).some(x => x.mfr === mfr)) {
          pidToMfrs.get(pid).push({ mfr, cats: [] });
        }
      }
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
    for (const p of pids) {
      if (!pidToMfrs.has(p)) pidToMfrs.set(p, []);
      for (const m of mfrs) {
        if (!pidToMfrs.get(p).some(x => x.mfr === m)) {
          pidToMfrs.get(p).push({ mfr: m, cats: [] });
        }
      }
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

// 4. For each orphan, compute initial candidates (cands + class match)
const orphanInitial = new Map(); // driver -> Set<mfr>
for (const o of orphans) {
  const allowedCats = CLASS_TO_CATS[o.class] || ['misc'];
  const cands = new Set();
  for (const pid of o.pids) {
    const ms = pidToMfrs.get(pid);
    if (!ms) continue;
    for (const e of ms) {
      const catMatch = e.cats.length === 0 || e.cats.some(c => allowedCats.includes(c));
      if (!catMatch) continue;
      cands.add(e.mfr);
    }
  }
  orphanInitial.set(o.driver, cands);
}

// 5. Build mfr -> [orphan drivers] index to detect cross-orphan conflicts
const mfrToOrphans = new Map();
for (const [drv, cands] of orphanInitial) {
  for (const m of cands) {
    if (!mfrToOrphans.has(m)) mfrToOrphans.set(m, []);
    mfrToOrphans.get(m).push(drv);
  }
}

// 6. For each orphan, filter:
//    a) mfr must NOT be in any existing (non-exempt) driver
//    b) mfr must NOT be wanted by another orphan (cross-orphan collision)
const proposals = [];
for (const o of orphans) {
  const cands = orphanInitial.get(o.driver);
  const unique = [];
  for (const m of cands) {
    const otherDrivers = (globalMfrIndex.get(m) || []).filter(d => d !== o.driver);
    const realDupes = otherDrivers.filter(d => !EXEMPT_DRIVERS.has(d));
    if (realDupes.length > 0) continue; // existing driver has it
    // Cross-orphan conflict: another orphan wants the same mfr
    const competingOrphans = (mfrToOrphans.get(m) || []).filter(d => d !== o.driver);
    if (competingOrphans.length > 0) continue;
    unique.push(m);
  }
  proposals.push({ driver: o.driver, class: o.class, pids: o.pids, candidates: unique, candsTotal: cands.size });
}

console.log('\n=== P80.3 — Orphan driver enrichment (v4 cross-orphan safe) ===\n');
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
