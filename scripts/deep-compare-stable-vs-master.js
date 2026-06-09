'use strict';
/**
 * deep-compare-stable-vs-master.js
 * 
 * Comparaison exhaustive:
 * - Chaque driver sur master vs stable-v5
 * - Fingerprints présents en stable mais absents en master
 * - Enrichissement nécessaire
 * - Export d'un rapport complet
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const TMP_DIR = path.join(ROOT, 'tmp');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

console.log('=== DEEP COMPARE STABLE-V5 vs MASTER ===\n');

// Charger les compose files de stable-v5 via git
function getStableCompose(driverId) {
  try {
    const raw = execSync(
      `git show origin/stable-v5:drivers/${driverId}/driver.compose.json 2>&1`,
      { cwd: ROOT, encoding: 'utf8', timeout: 5000 }
    );
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Index drivers master
const masterDrivers = {};
const driverDirs = fs.readdirSync(DRIVERS_DIR);

driverDirs.forEach(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  try {
    masterDrivers[dir] = JSON.parse(fs.readFileSync(cp, 'utf8'));
  } catch (e) { /* skip */ }
});

console.log(`Drivers master: ${Object.keys(masterDrivers).length}`);

// Rapport
const report = {
  timestamp: new Date().toISOString(),
  driversMissingInMaster: [],
  driversWithFewerMFs: [],
  driversWithMoreMFs: [],
  newFPsFromStable: {}, // driverId → [new MFs]
  missingPIDsFromStable: {},
};

let stableOnlyDrivers = 0;
let masterOnlyDrivers = 0;
let sharedDrivers = 0;
let totalNewMFs = 0;

// Analyser chaque driver master contre stable
Object.keys(masterDrivers).forEach(driverId => {
  const masterCompose = masterDrivers[driverId];
  const stableCompose = getStableCompose(driverId);
  
  if (!stableCompose) {
    masterOnlyDrivers++;
    return; // Driver seulement sur master (nouveau)
  }
  
  sharedDrivers++;
  
  const masterMFs = (masterCompose.zigbee && masterCompose.zigbee.manufacturerName) || [];
  const stableMFs = (stableCompose.zigbee && stableCompose.zigbee.manufacturerName) || [];
  
  const masterPIDs = (masterCompose.zigbee && masterCompose.zigbee.productId) || [];
  const stablePIDs = (stableCompose.zigbee && stableCompose.zigbee.productId) || [];
  
  // MFs en stable mais absents de master (case-insensitive)
  const masterMFsLower = masterMFs.map(m => m.toLowerCase());
  const missingMFs = stableMFs.filter(mf => !masterMFsLower.includes(mf.toLowerCase()));
  
  if (missingMFs.length > 0) {
    report.driversWithFewerMFs.push({
      driverId,
      masterCount: masterMFs.length,
      stableCount: stableMFs.length,
      missingCount: missingMFs.length,
      missing: missingMFs.slice(0, 10) // top 10
    });
    report.newFPsFromStable[driverId] = missingMFs;
    totalNewMFs += missingMFs.length;
  } else if (masterMFs.length > stableMFs.length) {
    report.driversWithMoreMFs.push({
      driverId,
      masterCount: masterMFs.length,
      stableCount: stableMFs.length,
      extra: masterMFs.length - stableMFs.length
    });
  }
  
  // PIDs en stable manquants en master
  const masterPIDsLower = masterPIDs.map(p => p.toLowerCase());
  const missingPIDs = stablePIDs.filter(pid => !masterPIDsLower.includes(pid.toLowerCase()));
  if (missingPIDs.length > 0) {
    report.missingPIDsFromStable[driverId] = missingPIDs;
  }
});

// Drivers en stable mais pas en master
try {
  const stableDrivers = execSync('git ls-tree --name-only origin/stable-v5:drivers/', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(d => d.trim());
  
  stableDrivers.forEach(dir => {
    if (!masterDrivers[dir]) {
      stableOnlyDrivers++;
      report.driversMissingInMaster.push(dir);
    }
  });
} catch (e) {
  console.log('Warning: could not list stable-v5 drivers:', e.message.substring(0, 50));
}

// Afficher résumé
console.log(`\nStatistiques:`);
console.log(`  Drivers communs: ${sharedDrivers}`);
console.log(`  Drivers seulement sur master: ${masterOnlyDrivers}`);
console.log(`  Drivers seulement sur stable-v5: ${stableOnlyDrivers}`);
console.log(`  Drivers avec MFs manquants (stable → master): ${report.driversWithFewerMFs.length}`);
console.log(`  Total MFs manquants: ${totalNewMFs}`);
console.log(`  Drivers avec PIDs manquants: ${Object.keys(report.missingPIDsFromStable).length}`);

// Top drivers avec le plus de MFs manquants
const topMissing = report.driversWithFewerMFs.sort((a, b) => b.missingCount - a.missingCount).slice(0, 20);
if (topMissing.length > 0) {
  console.log('\nTop 20 drivers avec le plus de MFs manquants:');
  topMissing.forEach(d => {
    console.log(`  ${d.driverId}: ${d.missingCount} manquants (stable=${d.stableCount}, master=${d.masterCount})`);
  });
}

// Sauvegarder le rapport
const reportPath = path.join(TMP_DIR, 'stable-vs-master-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nRapport sauvegardé: tmp/stable-vs-master-report.json`);

// Générer le fichier d'injection pour les MFs manquants
console.log('\nGénération du fichier d\'injection...');
const injectionData = {};
Object.entries(report.newFPsFromStable).forEach(([driverId, mfs]) => {
  injectionData[driverId] = mfs;
});
fs.writeFileSync(
  path.join(TMP_DIR, 'stable-fps-to-inject.json'),
  JSON.stringify(injectionData, null, 2)
);
console.log('Injection data: tmp/stable-fps-to-inject.json');
