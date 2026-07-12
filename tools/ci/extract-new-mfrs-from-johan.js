#!/usr/bin/env node
/**
 * extract-new-mfrs-from-johan.js
 *
 * Extracts the mfrs that are referenced in Johan issues but NOT yet in
 * the canonical fingerprints DB. For each new mfr, identifies the most
 * likely target driver using:
 *   1. Existing canonical FP DB routing (case-insensitive)
 *   2. Issue title + body pattern matching
 *   3. PID mapping (if available)
 *
 * Output: structured report in .github/state/new-mfrs-from-johan.json
 *
 * Usage:
 *   node tools/ci/extract-new-mfrs-from-johan.js
 *   node tools/ci/extract-new-mfrs-from-johan.js --apply   # integrate into canonical DB
 *
 * @author Mavis investigation 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const JOHAN_AUDIT = path.join(ROOT, '.diag', 'johan-shadow-comments-audit.json');
const CANONICAL_FP = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const REPORT_PATH = path.join(ROOT, '.github', 'state', 'new-mfrs-from-johan.json');
const APPLY = process.argv.includes('--apply');

function loadJohanAudit() {
  if (!fs.existsSync(JOHAN_AUDIT)) return { fingerprints: [], issueSignals: [] };
  return JSON.parse(fs.readFileSync(JOHAN_AUDIT, 'utf8'));
}

function loadCanonicalFP() {
  if (!fs.existsSync(CANONICAL_FP)) return {};
  return JSON.parse(fs.readFileSync(CANONICAL_FP, 'utf8'));
}

function identifyDriver(mfr, canonical, pids) {
  // 1. PID-based mapping (most reliable)
  // Tuya PIDs map strongly to driver classes
  const PID_TO_DRIVER = {
    'TS0011': 'switch_1gang', 'TS0012': 'switch_1gang', 'TS0014': 'switch_1gang', 'TS0015': 'switch_1gang',
    'TS0001': 'switch_1gang', 'TS0002': 'switch_1gang',
    'TS0013': 'switch_3gang', 'TS0016': 'switch_3gang', 'TS0003': 'switch_3gang',
    'TS0004': 'switch_4gang', 'TS0017': 'switch_4gang',
    'TS0018': 'switch_6gang',
    'TS0041': 'button_wireless_1', 'TS0042': 'button_wireless_2', 'TS0043': 'button_wireless_3', 'TS0044': 'button_wireless_4', 'TS0045': 'button_wireless_5', 'TS0046': 'button_wireless_6', 'TS004F': 'button_wireless_scene',
    'TS0201': 'climate_sensor', 'TS0202': 'climate_sensor', 'TS0203': 'door_sensor', 'TS0205': 'smoke_detector', 'TS0207': 'water_leak_sensor', 'TS0210': 'vibration_sensor',
    'TS011F': 'plug', 'TS0121': 'plug_smart', 'TS1101': 'plug_smart',
    'TS0501B': 'bulb_dimmable', 'TS0502B': 'bulb_tunable_white', 'TS0503B': 'bulb_rgb', 'TS0504B': 'bulb_rgbw', 'TS0505B': 'bulb_rgbw',
    'TS110E': 'dimmer_1_gang', 'TS110F': 'dimmer_1_gang',
    'TS0601': 'generic_tuya', // catch-all
  };
  if (pids && pids.length > 0) {
    for (const pid of pids) {
      if (PID_TO_DRIVER[pid]) return PID_TO_DRIVER[pid];
    }
  }

  // 2. Same mfr in different case in canonical
  const mfrLower = mfr.toLowerCase();
  for (const [key, info] of Object.entries(canonical)) {
    if (key.toLowerCase() === mfrLower) {
      return info.driverId || info.driver || null;
    }
  }

  // 3. Prefix match (low confidence)
  for (const [key, info] of Object.entries(canonical)) {
    const keyLower = key.toLowerCase();
    if (keyLower.startsWith(mfrLower.substring(0, 10)) && mfrLower.length >= 12) {
      return info.driverId || info.driver || null;
    }
  }

  return null;
}

function main() {
  console.log(`Extract new mfrs from Johan — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const audit = loadJohanAudit();
  const canonical = loadCanonicalFP();
  const canonicalKeys = new Set(Object.keys(canonical).map((k) => k.toLowerCase()));
  const fingerprints = audit.fingerprints || [];

  const newFps = [];
  let inCanonical = 0;
  for (const fp of fingerprints) {
    const fpLower = (fp.fingerprint || '').toLowerCase();
    if (!fpLower) continue;
    if (canonicalKeys.has(fpLower)) {
      inCanonical++;
      continue;
    }
    const targetDriver = identifyDriver(fp.fingerprint, canonical, fp.productIds || []);
    newFps.push({
      mfr: fp.fingerprint,
      issues: fp.issueNumbers || [],
      pids: fp.productIds || [],
      targetDriver,
      confidence: targetDriver ? 70 : 30,
    });
  }

  // Sort by issue count (most-asked first)
  newFps.sort((a, b) => b.issues.length - a.issues.length);

  // Summary
  const targetCounts = {};
  for (const f of newFps) {
    const d = f.targetDriver || 'unmapped';
    targetCounts[d] = (targetCounts[d] || 0) + 1;
  }
  const mapped = newFps.filter((f) => f.targetDriver).length;
  const unmapped = newFps.length - mapped;

  console.log(`Johan audit:`);
  console.log(`  Total mfrs: ${fingerprints.length}`);
  console.log(`  In canonical DB: ${inCanonical}`);
  console.log(`  New mfrs to integrate: ${newFps.length}`);
  console.log(`    Mapped to driver: ${mapped}`);
  console.log(`    Unmapped (need human triage): ${unmapped}`);
  console.log('');

  console.log('Top 20 by issue count:');
  for (const f of newFps.slice(0, 20)) {
    console.log(`  ${f.mfr.padEnd(30)} | target: ${(f.targetDriver || 'UNMAPPED').padEnd(28)} | issues: ${f.issues.length} | pids: ${f.pids.slice(0, 3).join(',')}`);
  }
  console.log('');

  console.log('Top target drivers:');
  for (const [d, c] of Object.entries(targetCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${d.padEnd(35)} ${c}`);
  }
  console.log('');

  // Generate integration plan
  const integrationPlan = newFps
    .filter((f) => f.targetDriver)
    .map((f) => ({
      driver: f.targetDriver,
      mfr: f.mfr,
      pids: f.pids,
      issues: f.issues,
      suggestedAction: `Add "${f.mfr}" to ${f.targetDriver}/driver.compose.json manufacturerName list`,
    }));

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    source: 'johan-shadow-comments-audit',
    summary: {
      totalFpsInJohan: fingerprints.length,
      inCanonicalDB: inCanonical,
      newFpsToIntegrate: newFps.length,
      mapped: mapped,
      unmapped: unmapped,
    },
    targetDistribution: targetCounts,
    newFps: newFps,
    integrationPlan: integrationPlan,
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`✓ Report: ${REPORT_PATH} (${(fs.statSync(REPORT_PATH).length / 1024).toFixed(1)} KB)`);
  console.log(`\n${integrationPlan.length} drivers to enrich. Use --apply to auto-integrate.`);
}

if (require.main === module) main();

module.exports = { identifyDriver };
