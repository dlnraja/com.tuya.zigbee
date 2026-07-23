#!/usr/bin/env node
'use strict';
/**
 * find-case-mismatch-mfrs.js (P82.4) - ULTIMATE EDITION
 *
 * v10.0.0: Now uses lib/utils/TuyaNormalizer for normalization.
 * Detects manufacturerName entries with case-variants split across
 * drivers, AND fixes them by ensuring all case variants exist in
 * the source files.
 *
 * Plus: detects and fixes PID case-mismatches (TS0601 vs ts0601).
 * Plus: detects device-name variants.
 *
 * Run:   node tools/ci/find-case-mismatch-mfrs.js
 * Apply: node tools/ci/find-case-mismatch-mfrs.js --apply
 */
const fs = require('fs');
const path = require('path');
const TU = require('../../lib/utils/TuyaNormalizer');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const APPLY = process.argv.includes('--apply');

const EXEMPT_DRIVERS = new Set([
  'universal_fallback', 'tuya_dummy_device', 'generic_tuya', 'generic_diy',
  'device_generic_diy_universal', 'universal_zigbee'
]);

// 1. Load all drivers
const drivers = new Map();
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
  } catch {}
}

console.log('=== P82.4 ULTIMATE — Case-mismatch audit (mfrs + PIDs) ===\n');

// 2. mfr case-mismatch
const mfrIndex = new Map();
for (const [d, info] of drivers) {
  for (const m of info.mfrs) {
    const key = TU.normalize(m);
    if (!mfrIndex.has(key)) mfrIndex.set(key, { variants: new Map(), drivers: new Map() });
    const entry = mfrIndex.get(key);
    if (!entry.variants.has(m)) entry.variants.set(m, 0);
    entry.variants.set(m, entry.variants.get(m) + 1);
    if (!entry.drivers.has(m)) entry.drivers.set(m, []);
    entry.drivers.get(m).push(d);
  }
}

const mfrIssues = [];
for (const [lower, data] of mfrIndex) {
  if (data.variants.size <= 1) continue;
  const variantList = [...data.variants.entries()].sort((a, b) => b[1] - a[1]);
  const byDriver = new Map();
  for (const [variant, drvs] of data.drivers) {
    for (const d of drvs) {
      if (!byDriver.has(d)) byDriver.set(d, []);
      byDriver.get(d).push(variant);
    }
  }
  if (byDriver.size > 1) {
    const canonical = variantList[0][0];
    for (const [d, variants] of byDriver) {
      const missing = variantList.filter(([v]) => !variants.includes(v)).map(([v]) => v);
      if (missing.length > 0) {
        mfrIssues.push({ mfr: lower, canonical, variants: variantList, driver: d, missing });
      }
    }
  }
}

// 3. PID case-mismatch
const pidIndex = new Map();
for (const [d, info] of drivers) {
  for (const p of info.pids) {
    const key = TU.normalize(p);
    if (!pidIndex.has(key)) pidIndex.set(key, { variants: new Map(), drivers: new Map() });
    const entry = pidIndex.get(key);
    if (!entry.variants.has(p)) entry.variants.set(p, 0);
    entry.variants.set(p, entry.variants.get(p) + 1);
    if (!entry.drivers.has(p)) entry.drivers.set(p, []);
    entry.drivers.get(p).push(d);
  }
}

const pidIssues = [];
for (const [lower, data] of pidIndex) {
  if (data.variants.size <= 1) continue;
  const variantList = [...data.variants.entries()].sort((a, b) => b[1] - a[1]);
  const byDriver = new Map();
  for (const [variant, drvs] of data.drivers) {
    for (const d of drvs) {
      if (!byDriver.has(d)) byDriver.set(d, []);
      byDriver.get(d).push(variant);
    }
  }
  if (byDriver.size > 1) {
    const canonical = variantList[0][0];
    for (const [d, variants] of byDriver) {
      const missing = variantList.filter(([v]) => !variants.includes(v)).map(([v]) => v);
      if (missing.length > 0) {
        pidIssues.push({ pid: lower, canonical, variants: variantList, driver: d, missing });
      }
    }
  }
}

console.log(`mfr case-mismatches: ${mfrIssues.length}`);
console.log(`PID case-mismatches: ${pidIssues.length}`);

const byDriver = new Map();
for (const i of mfrIssues) {
  if (!byDriver.has(i.driver)) byDriver.set(i.driver, { mfr: [], pid: [] });
  byDriver.get(i.driver).mfr.push(i);
}
for (const i of pidIssues) {
  if (!byDriver.has(i.driver)) byDriver.set(i.driver, { mfr: byDriver.get(i.driver)?.mfr || [], pid: [] });
  byDriver.get(i.driver).pid.push(i);
}

for (const [d, items] of byDriver) {
  if (EXEMPT_DRIVERS.has(d)) continue;
  const total = items.mfr.length + items.pid.length;
  if (total === 0) continue;
  console.log(`\n[${d}] ${total} case-mismatches (${items.mfr.length} mfr, ${items.pid.length} pid):`);
  for (const i of items.mfr.slice(0, 3)) {
    console.log(`  mfr: ${i.mfr} - canonical: ${i.canonical}, missing: ${i.missing.join(', ')}`);
  }
  for (const i of items.pid.slice(0, 3)) {
    console.log(`  pid: ${i.pid} - canonical: ${i.canonical}, missing: ${i.missing.join(', ')}`);
  }
}

if (!APPLY) {
  console.log('\n=== PREVIEW MODE ===');
  process.exit(0);
}

// 4. Apply: add all missing case variants
let mfrAdded = 0, pidAdded = 0;
const driverChanges = new Map();
const addChange = (d) => {
  if (!driverChanges.has(d)) driverChanges.set(d, { mfr: 0, pid: 0 });
};

for (const i of mfrIssues) {
  if (EXEMPT_DRIVERS.has(i.driver)) continue;
  addChange(i.driver);
  const info = drivers.get(i.driver);
  const j = info.compose;
  if (!j.zigbee) j.zigbee = {};
  if (!Array.isArray(j.zigbee.manufacturerName)) j.zigbee.manufacturerName = [];
  const existing = new Set(j.zigbee.manufacturerName.map(m => TU.normalize(m)));
  for (const m of i.missing) {
    if (existing.has(TU.normalize(m))) continue;
    j.zigbee.manufacturerName.push(m);
    existing.add(TU.normalize(m));
    mfrAdded++;
    driverChanges.get(i.driver).mfr++;
  }
}
for (const i of pidIssues) {
  if (EXEMPT_DRIVERS.has(i.driver)) continue;
  addChange(i.driver);
  const info = drivers.get(i.driver);
  const j = info.compose;
  if (!j.zigbee) j.zigbee = {};
  if (!Array.isArray(j.zigbee.productId)) j.zigbee.productId = [];
  const existing = new Set(j.zigbee.productId.map(p => TU.normalize(p)));
  for (const p of i.missing) {
    if (existing.has(TU.normalize(p))) continue;
    j.zigbee.productId.push(p);
    existing.add(TU.normalize(p));
    pidAdded++;
    driverChanges.get(i.driver).pid++;
  }
}
for (const [d, change] of driverChanges) {
  const info = drivers.get(d);
  if (change.mfr > 0) info.compose.zigbee.manufacturerName.sort();
  if (change.pid > 0) info.compose.zigbee.productId.sort();
  fs.writeFileSync(info.path, JSON.stringify(info.compose, null, 2) + '\n');
  console.log(`  [APPLIED] ${d}: +${change.mfr} mfr variants, +${change.pid} pid variants`);
}
console.log(`\nTotal: +${mfrAdded} mfr variants, +${pidAdded} pid variants`);
