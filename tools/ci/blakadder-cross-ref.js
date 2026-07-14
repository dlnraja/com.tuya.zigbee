#!/usr/bin/env node
/**
 * blakadder-cross-ref.js — P53
 *
 * Cross-reference the Blakadder database (2693 devices) against our existing
 * knowledge: mfs_db, Johan issues, Gmail diagnostics, our drivers.
 *
 * Goals:
 *   1. Identify Blakadder mfrs already in mfs_db (high-confidence redundancy)
 *   2. Identify Blakadder mfrs NOT in mfs_db (new candidates)
 *   3. Identify Blakadder vendors with NO driver in our app
 *   4. Identify Blakadder devices with TSxxxx PIDs that have NO driver
 *   5. Quantify coverage: % of Blakadder covered by our drivers
 *
 * Inputs (all optional, gracefully degrade):
 *   - scripts/sync/data/blakadder.json    (from crawl-blakadder.js)
 *   - data/mfs_db.json                    (our master FP DB)
 *   - .github/state/johan-dump/devices.json
 *   - .github/state/gmail/state.json
 *   - drivers/<name>/driver.compose.json (our drivers)
 *
 * Outputs:
 *   - .github/state/blakadder/cross-ref-report.json
 *   - .github/state/blakadder/coverage.json
 *
 * Run: node tools/ci/blakadder-cross-ref.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'blakadder');

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return fallback; }
}

function normalizeMfr(s) {
  if (!s) return null;
  return String(s).toLowerCase().trim();
}

function main() {
  console.log('=== Blakadder cross-reference ===');
  try {
    return _main();
  } catch (e) {
    console.error('FATAL:', e.stack || e.message);
    process.exit(1);
  }
}

function _main() {
  // ── Load sources ────────────────────────────────────────────────────
  const blakadderPath = path.join(ROOT, 'scripts', 'sync', 'data', 'blakadder.json');
  const blakadder = loadJson(blakadderPath, null);
  if (!blakadder) {
    console.error('FATAL: scripts/sync/data/blakadder.json missing — run crawl-blakadder.js first');
    process.exit(1);
  }
  console.log('Blakadder:', blakadder.totalDevices, 'devices,', blakadder.totalTuyaFingerprints, 'Tuya FPs');

  const mfsPath = path.join(ROOT, 'data', 'mfs_db.json');
  const mfs = loadJson(mfsPath, null);
  if (!mfs) {
    console.error('FATAL: data/mfs_db.json missing');
    process.exit(1);
  }
  // mfs_db structure: { devices: { mfrId: { ... } }, driverMapping: { ... } }
  const mfsMfrs = new Set(Object.keys(mfs.devices || {}).map(normalizeMfr).filter(Boolean));
  console.log('mfs_db  :', mfsMfrs.size, 'unique mfrs');

  const johanPath = path.join(ROOT, '.github', 'state', 'johan-dump', 'devices.json');
  const johan = loadJson(johanPath, []);
  const johanMfrs = new Set();
  for (const j of johan) {
    for (const m of (j.mfrs || [])) johanMfrs.add(normalizeMfr(m));
  }
  console.log('Johan   :', johanMfrs.size, 'unique mfrs');

  const gmailPath = path.join(ROOT, '.github', 'state', 'gmail', 'state.json');
  const gmail = loadJson(gmailPath, null);
  const gmailMfrs = new Set();
  if (gmail && gmail.mfrs) {
    for (const m of gmail.mfrs) gmailMfrs.add(normalizeMfr(m));
  }
  console.log('Gmail   :', gmailMfrs.size, 'unique mfrs');

  // Driver mfrs
  const driversDir = path.join(ROOT, 'drivers');
  const driverMfrs = new Set();
  const driverMfrMap = new Map(); // mfr -> [driverNames]
  if (fs.existsSync(driversDir)) {
    const driverFolders = fs.readdirSync(driversDir);
    for (const folder of driverFolders) {
      const fp = path.join(driversDir, folder, 'driver.compose.json');
      const dc = loadJson(fp, null);
      if (!dc) continue;
      const mfrs = dc.zigbee?.manufacturerName || [];
      const list = Array.isArray(mfrs) ? mfrs : [mfrs];
      for (const m of list) {
        const k = normalizeMfr(m);
        if (k) {
          driverMfrs.add(k);
          if (!driverMfrMap.has(k)) driverMfrMap.set(k, []);
          driverMfrMap.get(k).push(folder);
        }
      }
    }
  }
  console.log('Drivers :', driverMfrs.size, 'unique mfrs across', driverMfrMap.size > 0 ? 'all drivers' : '?');

  // ── Cross-reference ─────────────────────────────────────────────────
  const inMfs = [];
  const inJohan = [];
  const inGmail = [];
  const inDriver = [];
  const blakadderOnly = []; // new — not in any of our sources
  const redundantlyConfirmed = []; // in 2+ sources

  const fpList = blakadder.fingerprints || [];
  for (const fp of fpList) {
    const m = normalizeMfr(fp.mfr);
    if (!m) continue;
    const sources = [];
    if (mfsMfrs.has(m)) sources.push('mfs_db');
    if (johanMfrs.has(m)) sources.push('johan');
    if (gmailMfrs.has(m)) sources.push('gmail');
    if (driverMfrs.has(m)) sources.push('driver');

    if (sources.includes('mfs_db')) inMfs.push(fp);
    if (sources.includes('johan')) inJohan.push(fp);
    if (sources.includes('gmail')) inGmail.push(fp);
    if (sources.includes('driver')) inDriver.push(fp);
    if (sources.length === 0) blakadderOnly.push({ ...fp, sources: ['blakadder'] });
    if (sources.length >= 2) redundantlyConfirmed.push({ ...fp, sources });
  }

  // ── Vendor gap analysis ─────────────────────────────────────────────
  const vendorInDriver = new Map(); // vendor -> count of FPs in driver
  const vendorInBlakadder = new Map();
  for (const fp of fpList) {
    const v = fp.vendor || 'Unknown';
    vendorInBlakadder.set(v, (vendorInBlakadder.get(v) || 0) + 1);
    if (driverMfrs.has(normalizeMfr(fp.mfr))) {
      vendorInDriver.set(v, (vendorInDriver.get(v) || 0) + 1);
    }
  }
  const vendorGaps = [];
  for (const [vendor, total] of vendorInBlakadder.entries()) {
    const covered = vendorInDriver.get(vendor) || 0;
    const ratio = total > 0 ? covered / total : 0;
    if (total >= 3 && ratio < 0.5) {
      vendorGaps.push({ vendor, totalFp: total, coveredFp: covered, coverage: (ratio * 100).toFixed(1) + '%' });
    }
  }
  vendorGaps.sort((a, b) => b.totalFp - a.totalFp);

  // ── TS PID gap analysis ─────────────────────────────────────────────
  const tsPids = blakadder.tsProductIds || [];
  const tsPidDriverMap = new Map(); // pid -> Set of driver names
  if (fs.existsSync(driversDir)) {
    for (const folder of fs.readdirSync(driversDir)) {
      const fp = path.join(driversDir, folder, 'driver.compose.json');
      const dc = loadJson(fp, null);
      if (!dc) continue;
      const pids = dc.zigbee?.productId || [];
      const list = Array.isArray(pids) ? pids : [pids];
      for (const p of list) {
        if (!p) continue;
        if (!tsPidDriverMap.has(p)) tsPidDriverMap.set(p, new Set());
        tsPidDriverMap.get(p).add(folder);
      }
    }
  }
  const tsPidGaps = [];
  for (const pid of tsPids) {
    if (!tsPidDriverMap.has(pid)) {
      // Find the Blakadder devices using this PID
      const devs = fpList.filter(f => f.productId === pid || safeIncludes(f.zigbeeModels, pid));
      tsPidGaps.push({ pid, count: devs.length, sampleVendors: [...new Set(devs.map(d => d.vendor))].slice(0, 5) });
    }
  }

  // ── Coverage summary ────────────────────────────────────────────────
  const total = fpList.length;
  const coverage = {
    totalBlakadderFingerprints: total,
    inMfsDb: inMfs.length,
    inJohan: inJohan.length,
    inGmail: inGmail.length,
    inDrivers: inDriver.length,
    blakadderOnly: blakadderOnly.length,
    redundantlyConfirmed: redundantlyConfirmed.length,
    coveragePct: {
      mfsDb: pct(inMfs.length, total),
      drivers: pct(inDriver.length, total),
      johan: pct(inJohan.length, total),
      gmail: pct(inGmail.length, total),
    },
  };

  // ── Driver suggestion for blakadder-only FPs ───────────────────────
  const suggestionMap = {
    'bulb': ['bulb_1gang', 'bulb_color', 'bulb_tunable'],
    'light': ['light_strip', 'light_1channel', 'light_2channel'],
    'dimmer': ['dimmer_1gang', 'dimmer_wall'],
    'switch': ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang', 'generic_switch'],
    'plug': ['plug_smart', 'plug_energy', 'plug_outdoor'],
    'sensor': ['climate_sensor', 'motion_sensor', 'door_window_sensor', 'water_leak_sensor', 'soil_sensor', 'air_quality'],
    'remote': ['button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_4', 'wireless_switch'],
    'hvac': ['thermostat', 'radiator_valve', 'climate_sensor', 'thermostatic_radiator_valve'],
    'cover': ['curtain', 'blind', 'garage_door'],
    'lock': ['lock_smart'],
    'router': ['router_zigbee'],
  };
  for (const fp of blakadderOnly) {
    const drivers = suggestionMap[fp.category] || ['generic_tuya'];
    fp.suggestedDrivers = drivers;
  }

  // ── Build the report ────────────────────────────────────────────────
  const report = {
    meta: { generatedAt: new Date().toISOString(), blakadderDate: blakadder.date },
    coverage,
    newCandidates: {
      count: blakadderOnly.length,
      byCategory: groupBy(blakadderOnly, 'category'),
      top: blakadderOnly.slice(0, 50),
    },
    vendorGaps: vendorGaps.slice(0, 30),
    tsPidGaps: tsPidGaps.slice(0, 30),
    redundantlyConfirmed: {
      count: redundantlyConfirmed.length,
      top: redundantlyConfirmed.slice(0, 30),
    },
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, 'cross-ref-report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'coverage.json'), JSON.stringify(coverage, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'blakadder-only.json'), JSON.stringify(blakadderOnly, null, 2));

  // ── Print summary ───────────────────────────────────────────────────
  console.log('\n=== COVERAGE ===');
  console.log('Total Blakadder FPs  :', total);
  console.log('In mfs_db            :', coverage.inMfsDb, '(' + coverage.coveragePct.mfsDb + '%)');
  console.log('In Johan issues      :', coverage.inJohan, '(' + coverage.coveragePct.johan + '%)');
  console.log('In Gmail             :', coverage.inGmail, '(' + coverage.coveragePct.gmail + '%)');
  console.log('In any driver        :', coverage.inDrivers, '(' + coverage.coveragePct.drivers + '%)');
  console.log('Blakadder only (new) :', coverage.blakadderOnly);
  console.log('Confirmed by 2+ srcs :', coverage.redundantlyConfirmed);

  console.log('\n=== TOP VENDOR GAPS ===');
  for (const v of vendorGaps.slice(0, 10)) {
    console.log('  ' + v.vendor.padEnd(28) + ' ' + v.coveredFp + '/' + v.totalFp + ' (' + v.coverage + ')');
  }

  console.log('\n=== TOP TS PID GAPS ===');
  for (const t of tsPidGaps.slice(0, 10)) {
    console.log('  ' + t.pid.padEnd(10) + ' ' + t.count + ' devices, vendors: ' + (t.sampleVendors || []).join(', '));
  }

  console.log('\n=== NEW CANDIDATES (top 20) ===');
  for (const fp of blakadderOnly.slice(0, 20)) {
    const sugg = (fp.suggestedDrivers || []).join('|');
    console.log('  ' + fp.mfr.padEnd(28) + ' ' + (fp.vendor || '?').padEnd(20) + ' ' + (fp.model || '?').padEnd(28) + ' → ' + sugg);
  }

  console.log('\nReport:', path.join(STATE_DIR, 'cross-ref-report.json'));
}

function safeIncludes(arr, x) {
  if (!Array.isArray(arr)) return false;
  return arr.includes(x);
}

function groupBy(arr, key) {
  const out = {};
  for (const x of arr) {
    const k = x[key] || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function pct(n, d) { return d > 0 ? ((n / d) * 100).toFixed(1) : '0.0'; }

main();
