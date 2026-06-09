'use strict';
/**
 * inject-stable-fps-to-master.js
 * 
 * Injecte les fingerprints présents dans stable-v5 mais absents de master.
 * Source: tmp/stable-fps-to-inject.json (généré par deep-compare-stable-vs-master.js)
 * 
 * RÈGLES:
 * - Case-insensitive dedup
 * - Pas de wildcards  
 * - manufacturerName + productId requis
 * - Sync vers app.json après injection
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('=== INJECT STABLE-V5 FPs INTO MASTER ===\n');

const injectPath = path.join(ROOT, 'tmp', 'stable-fps-to-inject.json');
if (!fs.existsSync(injectPath)) {
  console.error('Fichier manquant: tmp/stable-fps-to-inject.json');
  console.error('Lancer d\'abord: node scripts/deep-compare-stable-vs-master.js');
  process.exit(1);
}

const stableFPs = JSON.parse(fs.readFileSync(injectPath, 'utf8'));
const driverIds = Object.keys(stableFPs);
console.log(`Drivers à enrichir: ${driverIds.length}`);
console.log(`Total MFs à injecter: ${Object.values(stableFPs).reduce((sum, mfs) => sum + mfs.length, 0)}`);

let injected = 0;
let skipped = 0;

// Pour chaque driver, récupérer aussi les PIDs de stable
function getStablePIDs(driverId) {
  try {
    const raw = execSync(
      `git show origin/stable-v5:drivers/${driverId}/driver.compose.json 2>&1`,
      { cwd: ROOT, encoding: 'utf8', timeout: 5000 }
    );
    const c = JSON.parse(raw);
    return (c.zigbee && c.zigbee.productId) || [];
  } catch (e) {
    return [];
  }
}

driverIds.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    console.log(`  ✗ ${driverId}: driver non trouvé sur master`);
    skipped++;
    return;
  }

  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (e) {
    console.log(`  ✗ ${driverId}: JSON invalide`);
    skipped++;
    return;
  }

  if (!compose.zigbee) {
    skipped++;
    return;
  }

  const newMFsList = stableFPs[driverId] || [];
  const stablePIDs = getStablePIDs(driverId);

  const existingMFs = compose.zigbee.manufacturerName || [];
  const existingPIDs = compose.zigbee.productId || [];

  // Merge case-insensitive
  const existingMFsLower = existingMFs.map(m => m.toLowerCase());
  const mergedMFs = [...existingMFs];
  let addedMFs = 0;

  newMFsList.forEach(mf => {
    if (!existingMFsLower.includes(mf.toLowerCase())) {
      mergedMFs.push(mf);
      existingMFsLower.push(mf.toLowerCase());
      addedMFs++;
    }
  });

  const existingPIDsLower = existingPIDs.map(p => p.toLowerCase());
  const mergedPIDs = [...existingPIDs];
  stablePIDs.forEach(pid => {
    if (!existingPIDsLower.includes(pid.toLowerCase())) {
      mergedPIDs.push(pid);
      existingPIDsLower.push(pid.toLowerCase());
    }
  });

  if (addedMFs === 0 && mergedPIDs.length === existingPIDs.length) {
    skipped++;
    return;
  }

  compose.zigbee.manufacturerName = mergedMFs;
  compose.zigbee.productId = mergedPIDs;

  // Fix image paths
  if (compose.images) {
    ['small', 'large', 'xlarge'].forEach(s => {
      if (compose.images[s] && !compose.images[s].startsWith('/')) {
        compose.images[s] = '/' + compose.images[s];
      }
    });
  }

  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  console.log(`  ✓ ${driverId}: +${addedMFs} MFs (total: ${mergedMFs.length})`);
  injected++;
});

console.log(`\n✓ Drivers enrichis: ${injected}`);
console.log(`- Drivers skippés: ${skipped}`);

// Sync vers app.json
console.log('\nSync vers app.json...');
const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
let appUpdated = 0;

if (app.drivers) {
  app.drivers.forEach(driver => {
    const cp = path.join(DRIVERS_DIR, driver.id, 'driver.compose.json');
    if (!fs.existsSync(cp)) return;
    try {
      const compose = JSON.parse(fs.readFileSync(cp, 'utf8'));
      if (!compose.zigbee) return;
      if (!driver.zigbee) driver.zigbee = {};
      driver.zigbee.manufacturerName = compose.zigbee.manufacturerName || [];
      driver.zigbee.productId = compose.zigbee.productId || [];
      if (driver.images) {
        ['small','large','xlarge'].forEach(s => {
          if (driver.images[s] && !driver.images[s].startsWith('/')) driver.images[s] = '/' + driver.images[s];
        });
      }
      appUpdated++;
    } catch (e) { /* skip */ }
  });
}

fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2));
const appSize = Math.round(Buffer.byteLength(JSON.stringify(app), 'utf8') / 1024 / 1024 * 10) / 10;
console.log(`✓ app.json: ${appUpdated} drivers synced, taille: ${appSize}Mo`);

// Vérification finale
const emptyZigbee = fs.readdirSync(DRIVERS_DIR).filter(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return false;
  try {
    const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
    return c.zigbee && (!c.zigbee.manufacturerName || c.zigbee.manufacturerName.length === 0);
  } catch (e) { return false; }
}).length;

console.log(`\n✓ Drivers Zigbee encore vides: ${emptyZigbee}`);
