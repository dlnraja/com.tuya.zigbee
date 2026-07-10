#!/usr/bin/env node
'use strict';
/**
 * scripts/validation/check-fingerprint-health.js
 *
 * GARDE-FOU CI : Verifies that static manufacturerName arrays are present
 * in all driver.compose.json files with zigbee sections.
 *
 * Rule: Static Matching Layer REQUIRED for pairing.
 *
 * Usage:
 *   node scripts/validation/check-fingerprint-health.js [--fail-on-empty] [--json]
 *   node scripts/validation/check-fingerprint-health.js --threshold 10
 *
 * Exit codes:
 *   0 = all drivers healthy
 *   1 = violations found
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const args = process.argv.slice(2);
const FAIL_ON_EMPTY = args.includes('--fail-on-empty');
const JSON_OUTPUT = args.includes('--json');
const threshold = parseInt((args.find(a => a.startsWith('--threshold=')) || '').replace('--threshold=', '') || '10');

if (!JSON_OUTPUT) console.log('=== FINGERPRINT HEALTH CHECK ===\n');

const results = {
  total: 0,
  zigbee: 0,
  emptyMF: [],
  emptyPID: [],
  ok: 0,
  wildcards: [],
};

if (!fs.existsSync(DRIVERS_DIR)) {
  console.error('Drivers directory not found: ' + DRIVERS_DIR);
  process.exit(2);
}

fs.readdirSync(DRIVERS_DIR).forEach(driverId => {
  const cp = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(cp));
  } catch (e) {
    return;
  }
  
  results.total++;
  
  if (!compose.zigbee) return; // WiFi/IR driver — skip
  
  results.zigbee++;
  
  const mfs = compose.zigbee.manufacturerName || [];
  const pids = compose.zigbee.productId || [];
  
  // Vérifier les wildcards (interdits)
  // universal_zigbee is an intentional catch-all driver — skip wildcard checks for it
  if (driverId !== 'universal_zigbee') {
    mfs.forEach(mf => {
      if (mf.includes('*') || mf === '_TZE200_' || mf === '_TZ3000_') {
        results.wildcards.push({ driverId, mf });
      }
    });
  }
  
  if (mfs.length === 0) {
    results.emptyMF.push(driverId);
  } else if (pids.length === 0) {
    results.emptyPID.push(driverId);
  } else {
    results.ok++;
  }
});

// Rapport
console.log(`Total drivers: ${results.total}`);
console.log(`Drivers Zigbee: ${results.zigbee}`);
console.log(`Drivers OK (MF + PID): ${results.ok}`);
console.log(`Drivers avec MF vide: ${results.emptyMF.length}`);
console.log(`Drivers avec PID vide: ${results.emptyPID.length}`);
console.log(`Wildcards détectés: ${results.wildcards.length}`);

if (results.emptyMF.length > 0) {
  console.log('\nDrivers avec manufacturerName vide:');
  results.emptyMF.slice(0, 20).forEach(d => console.log('  - ' + d));
  if (results.emptyMF.length > 20) console.log(`  ... et ${results.emptyMF.length - 20} autres`);
}

if (results.wildcards.length > 0) {
  console.log('\nDrivers avec wildcards INTERDITS:');
  results.wildcards.forEach(w => console.log(`  - ${w.driverId}: "${w.mf}"`));
}

// Gate check
let exitCode = 0;

if (results.wildcards.length > 0) {
  console.log('\n❌ FAIL: Wildcards détectés dans manufacturerName');
  exitCode = 1;
}

if (results.emptyMF.length > threshold) {
  console.log(`\n❌ FAIL: ${results.emptyMF.length} drivers avec manufacturerName vide (seuil: ${threshold})`);
  exitCode = 1;
} else if (results.emptyMF.length > 0) {
  console.log(`\n⚠️  WARN: ${results.emptyMF.length} drivers avec manufacturerName vide`);
} else {
  console.log('\n✅ PASS: Tous les drivers Zigbee ont des manufacturerName');
}

if (FAIL_ON_EMPTY && results.emptyMF.length > 0) {
  exitCode = 1;
}

process.exit(exitCode);
