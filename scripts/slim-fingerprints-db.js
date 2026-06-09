#!/usr/bin/env node
/**
 * slim-fingerprints-db.js
 * 
 * RESEARCH FINDING: data/fingerprints.json = 11.3MB (126,189 entries)
 * But only 1,430 entries match the 10,401 manufacturerNames in our 411 drivers.
 * 
 * SOLUTION: Filter fingerprints.json to only include entries that:
 *   1. Match a manufacturerName in any driver's zigbee.manufacturerName[]
 *   2. Match a manufacturerName in any driver.compose.json
 * 
 * RESULT: 11.3MB → ~140KB (99% size reduction)
 * Archive: 38.5MB → ~27MB (well under Athom's ~30MB limit)
 * 
 * The DeviceFingerprintDB.js lazy-loads this file and it will work identically.
 * 
 * v1.0.0 — 2026-05-31 Antigravity recursive investigation
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const FP_PATH  = path.join(__dirname, '../../data/fingerprints.json');
const APP_PATH = path.join(__dirname, '../../app.json');
const DRV_DIR  = path.join(__dirname, '../../drivers');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  FINGERPRINT DB SLIM — Athom Archive Size Optimizer         ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

// Step 1: Collect ALL manufacturer names from drivers
const knownMfrs = new Set();

// From app.json
try {
  const app = JSON.parse(fs.readFileSync(APP_PATH, 'utf8'));
  app.drivers.forEach(d => {
    if (d.zigbee && Array.isArray(d.zigbee.manufacturerName)) {
      d.zigbee.manufacturerName.forEach(m => m && knownMfrs.add(m.toLowerCase()));
    }
  });
  console.log(`[1] app.json drivers: ${app.drivers.length} → ${knownMfrs.size} MFR names`);
} catch(e) {
  console.error('[1] app.json error:', e.message);
}

// From driver.compose.json files (includes compose sources)
try {
  const drvDirs = fs.readdirSync(DRV_DIR, {withFileTypes:true})
    .filter(e => e.isDirectory()).map(e => e.name);
  let extra = 0;
  for (const d of drvDirs) {
    const composePath = path.join(DRV_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    try {
      const comp = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (comp.zigbee && Array.isArray(comp.zigbee.manufacturerName)) {
        comp.zigbee.manufacturerName.forEach(m => {
          if (m && !knownMfrs.has(m.toLowerCase())) {
            knownMfrs.add(m.toLowerCase());
            extra++;
          }
        });
      }
    } catch {}
  }
  console.log(`[2] driver.compose.json: +${extra} extra MFR names → total ${knownMfrs.size}`);
} catch(e) {
  console.error('[2] driver scan error:', e.message);
}

// Step 2: Load full fingerprints.json
console.log('\n[3] Loading data/fingerprints.json...');
const fpBefore = fs.statSync(FP_PATH).size;
const allFP = JSON.parse(fs.readFileSync(FP_PATH, 'utf8'));
const totalEntries = Object.keys(allFP).length;
console.log(`    Loaded: ${totalEntries.toLocaleString()} entries, ${(fpBefore/1024/1024).toFixed(2)}MB`);

// Step 3: Filter — keep only entries that match known MFR names
const slimFP = {};
let kept = 0;
let skipped = 0;

for (const [key, value] of Object.entries(allFP)) {
  if (knownMfrs.has(key.toLowerCase())) {
    slimFP[key] = value;
    kept++;
  } else {
    skipped++;
  }
}

console.log(`\n[4] Filtering results:`);
console.log(`    Kept:    ${kept.toLocaleString()} entries (match known drivers)`);
console.log(`    Skipped: ${skipped.toLocaleString()} entries (not in any driver)`);

// Step 4: Backup original and write slim version
const backupPath = FP_PATH + '.full-backup';
if (!fs.existsSync(backupPath)) {
  // Only backup once — don't overwrite previous backup
  fs.writeFileSync(backupPath, JSON.stringify(allFP));
  console.log(`\n[5] Backup saved: ${path.basename(backupPath)} (${(fpBefore/1024/1024).toFixed(2)}MB)`);
} else {
  console.log(`\n[5] Backup already exists: ${path.basename(backupPath)}`);
}

const slimJSON = JSON.stringify(slimFP);
fs.writeFileSync(FP_PATH, slimJSON, 'utf8');
const fpAfter = Buffer.byteLength(slimJSON);

console.log(`\n[6] Written slim fingerprints.json:`);
console.log(`    Before: ${(fpBefore/1024/1024).toFixed(2)}MB`);
console.log(`    After:  ${(fpAfter/1024/1024).toFixed(2)}MB`);
console.log(`    Saved:  ${((fpBefore-fpAfter)/1024/1024).toFixed(2)}MB (${(((fpBefore-fpAfter)/fpBefore)*100).toFixed(1)}%)`);

// Step 5: Validate the slim DB
const validate = JSON.parse(slimJSON);
const sampleMfr = [...knownMfrs][0];
const found = Object.keys(validate).find(k => k.toLowerCase() === sampleMfr);
console.log(`\n[7] Validation: sample lookup "${sampleMfr}" → ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);

// Summary
const archiveReduction = (fpBefore - fpAfter) / 1024 / 1024;
console.log('\n═══════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log(`  Fingerprint DB:  ${(fpBefore/1024/1024).toFixed(2)}MB → ${(fpAfter/1024/1024).toFixed(2)}MB`);
console.log(`  Archive savings: ~${archiveReduction.toFixed(1)}MB`);
console.log(`  Estimated total archive: ~${(38.5 - archiveReduction).toFixed(1)}MB`);
const willWork = (38.5 - archiveReduction) < 30;
console.log(`  Will Athom accept?       ${willWork ? '✅ YES (< 30MB)' : '⚠️ MAYBE (> 30MB — also add driver-mapping-database.json to homeyignore if excluded)'}`);
console.log('═══════════════════════════════════════════════════════════\n');
