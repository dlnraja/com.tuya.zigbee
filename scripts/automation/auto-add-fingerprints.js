#!/usr/bin/env node
'use strict';
/**
 * Auto-Add Fingerprints - v5.9.0
 * Reads missing-fingerprints.json and patches driver.compose.json files
 * Run: node scripts/automation/auto-add-fingerprints.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data/community-sync');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const DRY_RUN = process.argv.includes('--dry-run');

function loadMissing() {
  const f = path.join(DATA_DIR, 'missing-fingerprints.json');
  if (!fs.existsSync(f)) { console.error('No missing-fingerprints.json found. Run fetch-z2m-fingerprints.js first.'); process.exit(1); }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function patchDriver(driverName, field, value) {
  const cf = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(cf)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(cf, 'utf8'));
    if (!data.zigbee) return false;
    const arr = data.zigbee[field];
    if (!Array.isArray(arr)) return false;
    if (arr.includes(value)) return false;
    arr.push(value);
    if (!DRY_RUN) fs.writeFileSync(cf, JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (e) { return false; }
}

// Known safe auto-add: only Tuya _T* mfrs and standard Tuya productIds
const SAFE_MFR = /^(_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}|SONOFF|eWeLink|EWELINK)$/;
const SAFE_PID = /^(TS\d{4}[A-Z]? |SNZB-\d{2}\w*|ZBMINI\w*|S31ZB|S26R2ZB|S[46]0ZBT\w+|BASICZBR\d*|01MINIZB|ZBCurtain|TRVZB|SWV-\w+|MG1_\w+|ZBM5[\w-]+ )$/        : null;

function main() {
  const report = loadMissing();
  console.log('=== Auto-Add Fingerprints' + (DRY_RUN ? ' (DRY RUN )' : '') + ' ===\n')      ;

  let added = 0, skipped = 0;

  // Add missing manufacturer names (only safe Tuya patterns)
  for (const m of (report.missingManufacturerNames || [])) {
    if (!SAFE_MFR.test(m.value)) { skipped++; continue; }
    const driver = m.suggestedDriver || 'generic_diy';
    if (patchDriver(driver, 'manufacturerName', m.value)) {
      console.log('+ mfr ' + m.value + ' -> ' + driver);
      added++;
    } else { skipped++; }
  }

  // Add missing product IDs (only safe standard Tuya patterns)
  for (const p of (report.missingProductIds || [])) {
    if (!SAFE_PID.test(p.value)) { skipped++; continue; }
    
    // Better driver suggestion for multi-gang switches
    let driver = p.suggestedDriver;
    if (!driver || driver === 'generic_diy') {
      if (p.value === 'TS0002') driver = 'zigbee_2_gang_switch';
      else if (p.value === 'TS0003') driver = 'zigbee_3_gang_switch';
      else if (p.value === 'TS0004') driver = 'zigbee_4_gang_switch';
      else driver = 'generic_diy';
    }

    if (patchDriver(driver, 'productId', p.value)) {
      console.log('+ pid ' + p.value + ' -> ' + driver);
      added++;
    } else { skipped++; }
  }

  console.log('\nAdded: ' + added + ', Skipped (unsafe/existing): ' + skipped);

  // Write add-report for GH Actions
  const addReport = { timestamp: new Date().toISOString(), added, skipped, dryRun: DRY_RUN };
  fs.writeFileSync(path.join(DATA_DIR, 'add-report.json'), JSON.stringify(addReport, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    let md = '## Auto-Add Results\n| Added | Skipped | Mode |\n|---|---|---|\n';
    md += '| ' + added + ' | ' + skipped + ' | ' + (DRY_RUN ? 'dry-run' : 'live') + ' |\n'      ;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }

  return added;
}

main();
