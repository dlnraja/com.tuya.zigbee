#!/usr/bin/env node
/**
 * integrate-new-mfrs.js
 *
 * APPLIES the 96 mapped mfrs from Johan to:
 *   1. The canonical fingerprint DB (lib/tuya/fingerprints.json)
 *   2. The target driver's driver.compose.json (manufacturerName)
 *
 * Source: .github/state/new-mfrs-from-johan.json
 *
 * SAFETY:
 *   - Default mode: DRY-RUN (prints what would be done)
 *   - --apply mode: actually modifies files
 *   - --revert mode: restore from .bak file
 *   - Backup created automatically before any modification
 *   - Skip if mfr already exists in canonical DB
 *   - Skip if mfr already exists in target driver
 *
 * Usage:
 *   node tools/ci/integrate-new-mfrs.js
 *   node tools/ci/integrate-new-mfrs.js --apply
 *   node tools/ci/integrate-new-mfrs.js --revert
 *
 * @author Mavis investigation 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const NEW_MFRS_FILE = path.join(ROOT, '.github', 'state', 'new-mfrs-from-johan.json');
const CANONICAL_FP = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORT_PATH = path.join(ROOT, '.github', 'state', 'integrate-new-mfrs-report.json');

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function saveJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

function backupFile(file) {
  const bakFile = file + '.bak.' + Date.now();
  fs.copyFileSync(file, bakFile);
  return bakFile;
}

/**
 * Get the type/powerSource/pids from an existing FP of the same driver.
 * Returns the metadata template.
 */
function getMetadataTemplate(canonical, driverId) {
  for (const [, info] of Object.entries(canonical)) {
    if (info && info.driverId === driverId) {
      return {
        type: info.type || null,
        powerSource: info.powerSource || null,
        modelIds: info.modelIds || [],
      };
    }
  }
  return { type: null, powerSource: null, modelIds: [] };
}

/**
 * Add a mfr to the canonical DB.
 */
function addToCanonical(canonical, mfr, driverId, pids) {
  if (canonical[mfr]) return { added: false, reason: 'already exists' };
  const template = getMetadataTemplate(canonical, driverId);
  canonical[mfr] = {
    driverId,
    type: template.type,
    powerSource: template.powerSource,
    modelIds: pids && pids.length > 0 ? pids : template.modelIds,
  };
  return { added: true };
}

/**
 * Add a mfr to a driver's driver.compose.json.
 */
function addToDriver(driverId, mfr) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return { added: false, reason: 'compose not found' };
  const j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  if (!j.zigbee) j.zigbee = {};
  if (!Array.isArray(j.zigbee.manufacturerName)) j.zigbee.manufacturerName = [];
  if (j.zigbee.manufacturerName.includes(mfr)) return { added: false, reason: 'already in driver' };
  j.zigbee.manufacturerName.push(mfr);
  return { added: true, json: j, path: composePath };
}

function main() {
  console.log(`Integrate new mfrs from Johan — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}${REVERT ? ' (REVERT)' : ''}\n`);

  const newMfrsReport = loadJSON(NEW_MFRS_FILE);
  if (!newMfrsReport) {
    console.error(`No report at ${NEW_MFRS_FILE}. Run extract-new-mfrs-from-johan.js first.`);
    process.exit(1);
  }

  // Filter only the mapped mfrs (skip UNMAPPED and noise)
  const integrationPlan = newMfrsReport.integrationPlan || [];
  console.log(`Integration plan: ${integrationPlan.length} mfrs across ${new Set(integrationPlan.map((m) => m.driver)).size} drivers`);

  // Group by driver
  const byDriver = {};
  for (const item of integrationPlan) {
    if (!byDriver[item.driver]) byDriver[item.driver] = [];
    byDriver[item.driver].push(item);
  }

  console.log('Distribution by driver:');
  for (const [d, items] of Object.entries(byDriver).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${d.padEnd(30)} ${items.length} mfrs`);
  }
  console.log('');

  if (REVERT) {
    // Find the most recent .bak files
    console.log('Reverting: looking for .bak files...');
    let reverted = 0;
    const canonicalBak = fs.readdirSync(path.dirname(CANONICAL_FP))
      .filter((f) => f.startsWith(path.basename(CANONICAL_FP) + '.bak.'))
      .sort()
      .reverse();
    if (canonicalBak[0]) {
      fs.copyFileSync(path.join(path.dirname(CANONICAL_FP), canonicalBak[0]), CANONICAL_FP);
      console.log(`  Reverted ${path.basename(CANONICAL_FP)} from ${canonicalBak[0]}`);
      reverted++;
    }
    for (const driverId of Object.keys(byDriver)) {
      const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
      const driverBaks = fs.readdirSync(path.dirname(composePath))
        .filter((f) => f.startsWith(path.basename(composePath) + '.bak.'))
        .sort()
        .reverse();
      if (driverBaks[0]) {
        fs.copyFileSync(path.join(path.dirname(composePath), driverBaks[0]), composePath);
        console.log(`  Reverted ${driverId} from ${driverBaks[0]}`);
        reverted++;
      }
    }
    console.log(`\nReverted ${reverted} files.`);
    return;
  }

  // === INTEGRATION ===
  const canonical = loadJSON(CANONICAL_FP) || {};
  const canonicalBackup = APPLY ? backupFile(CANONICAL_FP) : null;

  let canonicalAdded = 0;
  let canonicalSkipped = 0;
  const results = {
    timestamp: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    sourceReport: NEW_MFRS_FILE,
    canonical: { added: 0, skipped: 0, before: Object.keys(canonical).length, after: 0 },
    drivers: {},
  };

  for (const item of integrationPlan) {
    // 1. Add to canonical DB
    const r1 = addToCanonical(canonical, item.mfr, item.driver, item.pids);
    if (r1.added) canonicalAdded++;
    else canonicalSkipped++;

    // 2. Add to target driver
    const r2 = addToDriver(item.driver, item.mfr);
    if (!results.drivers[item.driver]) {
      results.drivers[item.driver] = { added: 0, skipped: 0, mfrs: [] };
    }
    if (r2.added) {
      results.drivers[item.driver].added++;
      results.drivers[item.driver].mfrs.push(item.mfr);
      if (APPLY) {
        fs.writeFileSync(r2.path, JSON.stringify(r2.json, null, 2), 'utf8');
      }
    } else {
      results.drivers[item.driver].skipped++;
    }
  }

  results.canonical.added = canonicalAdded;
  results.canonical.skipped = canonicalSkipped;
  results.canonical.after = Object.keys(canonical).length;

  if (APPLY) {
    saveJSON(CANONICAL_FP, canonical);
  }

  // === SUMMARY ===
  console.log(`Canonical DB: ${results.canonical.added} added, ${results.canonical.skipped} skipped (total: ${results.canonical.before} → ${results.canonical.after})`);
  console.log(`Drivers modified: ${Object.keys(results.drivers).filter((d) => results.drivers[d].added > 0).length}`);
  console.log('');
  console.log('Per-driver results (top 15):');
  const driverList = Object.entries(results.drivers).sort((a, b) => b[1].added - a[1].added);
  for (const [d, r] of driverList.slice(0, 15)) {
    console.log(`  ${d.padEnd(30)} added: ${r.added}, skipped: ${r.skipped}`);
  }
  console.log('');

  if (APPLY) {
    console.log(`✓ Backup of canonical DB: ${canonicalBackup}`);
    console.log(`✓ Canonical DB updated (${results.canonical.after} FPs total)`);
  } else {
    console.log('  Run with --apply to actually modify files.');
    console.log('  Run with --apply --revert to revert.');
  }

  // Save report
  saveJSON(REPORT_PATH, results);
  console.log(`\n✓ Report: ${REPORT_PATH} (${(fs.statSync(REPORT_PATH).length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) main();

module.exports = { addToCanonical, addToDriver, getMetadataTemplate };
