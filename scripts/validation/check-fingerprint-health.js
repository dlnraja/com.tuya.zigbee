'use strict';
/**
 * scripts/validation/check-fingerprint-health.js
 * 
 * GARDE-FOU CI : Vérifie que les manufacturerName statiques sont présents
 * dans tous les driver.compose.json avec zigbee.
 * 
 * Règle: §22.2 PROJECT_INDEX.md — Static Matching Layer OBLIGATOIRE
 * 
 * Usage:
 *   node scripts/validation/check-fingerprint-health.js [--fail-on-empty]
 *   node scripts/validation/check-fingerprint-health.js --threshold 10
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const args = process.argv.slice(2);
const FAIL_ON_EMPTY = args.includes('--fail-on-empty');
const threshold = parseInt((args.find(a => a.startsWith('--threshold=')) || '').replace('--threshold=', '') || '10');

console.log('=== FINGERPRINT HEALTH CHECK ===\n');

const results = {
  total: 0,
  zigbee: 0,
  emptyMF: [],
  emptyPID: [],
  ok: 0,
  wildcards: [],
};

fs.readdirSync(DRIVERS_DIR).forEach(driverId => {
  const cp = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(cp, 'utf8'));
  } catch (e) {
    return;
  }
  
  results.total++;
  
  if (!compose.zigbee) return; // WiFi/IR driver — skip
  
  results.zigbee++;
  
  const mfs = compose.zigbee.manufacturerName || [];
  const pids = compose.zigbee.productId || [];
  
  // Vérifier les wildcards (interdits)
  mfs.forEach(mf => {
    if (mf.includes('*') || mf === '_TZE200_' || mf === '_TZ3000_') {
      results.wildcards.push({ driverId, mf });
    }
  });
  
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
