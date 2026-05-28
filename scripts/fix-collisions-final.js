'use strict';
/**
 * fix-collisions-final.js
 * 
 * Approche radicale: une seule passe globale
 * Construire l'index global, puis pour chaque combo conflictuel
 * ne garder que le "winner" driver et vider les autres.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('=== FIX COLLISIONS FINAL ===\n');

// Charger TOUS les compose files frais
const driverDirs = fs.readdirSync(DRIVERS_DIR);
const allCompose = {}; // driverId → compose (mutable)

driverDirs.forEach(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  try {
    allCompose[dir] = JSON.parse(fs.readFileSync(cp, 'utf8'));
  } catch (e) { /* skip */ }
});
console.log(`Drivers chargés: ${Object.keys(allCompose).length}`);

// Fonction de scoring: quel driver est le "principal" pour un fingerprint?
// Plus le score est bas, plus le driver est prioritaire
function driverScore(driverId) {
  // Drivers "simples" sans suffixe = score bas = prioritaires
  const parts = driverId.split('_');
  let score = parts.length; // plus de mots = moins prioritaire
  
  // Pénaliser les drivers avec "device_" ou "sensor_" en préfixe (trop génériques)
  if (driverId.startsWith('device_')) score += 10;
  if (driverId.startsWith('sensor_')) score += 5;
  if (driverId.startsWith('remote_')) score += 3;
  
  // Pénaliser les sous-variantes connues
  const subVariantSuffixes = [
    'climate', 'contact', 'curtain', 'dimmer', 'din', 'floor',
    'humidifier', 'led', 'lcdtemphumidsensor', 'motion', 'plug',
    'presence', 'quality', 'radiator', 'sensor', 'siren', 'smart',
    'smoke', 'soil', 'switch', 'thermostat', 'water', 'energy',
    'gas', 'universal', 'rgb', 'rgbw', 'tuya', 'zigbee', '2', '3', '4', '5'
  ];
  const lastPart = parts[parts.length - 1];
  if (subVariantSuffixes.includes(lastPart)) score += 2;
  
  return score;
}

// Construire l'index global: "MF_UPPER|PID_UPPER" → meilleur winner
const globalIndex = {}; // key → winner driverId

Object.entries(allCompose).forEach(([driverId, compose]) => {
  if (!compose.zigbee) return;
  const mfs = compose.zigbee.manufacturerName || [];
  const pids = compose.zigbee.productId || [];
  
  mfs.forEach(mf => {
    pids.forEach(pid => {
      const key = `${mf.toUpperCase()}|${pid.toUpperCase()}`;
      if (!globalIndex[key]) {
        globalIndex[key] = driverId;
      } else {
        // Garder le driver avec le score le plus bas (plus prioritaire)
        const currentScore = driverScore(globalIndex[key]);
        const newScore = driverScore(driverId);
        if (newScore < currentScore) {
          globalIndex[key] = driverId;
        }
      }
    });
  });
});

console.log(`Index global: ${Object.keys(globalIndex).length} fingerprints uniques`);

// Pour chaque driver, ne garder que les MFs dont il est le winner
let updated = 0;
let emptied = 0;

Object.entries(allCompose).forEach(([driverId, compose]) => {
  if (!compose.zigbee) return;
  
  const mfs = compose.zigbee.manufacturerName || [];
  const pids = compose.zigbee.productId || [];
  
  if (mfs.length === 0) return;
  
  // Garder seulement les MFs pour lesquels ce driver est le winner
  // sur AU MOINS un productId
  const keepMFs = mfs.filter(mf => {
    return pids.some(pid => {
      const key = `${mf.toUpperCase()}|${pid.toUpperCase()}`;
      return globalIndex[key] === driverId;
    });
  });
  
  // Garder aussi les PIDs qui ont au moins un MF restant
  const keepPIDs = pids.filter(pid => {
    return keepMFs.some(mf => {
      const key = `${mf.toUpperCase()}|${pid.toUpperCase()}`;
      return globalIndex[key] === driverId;
    });
  });
  
  if (keepMFs.length === mfs.length) return; // Rien à changer
  
  compose.zigbee.manufacturerName = keepMFs;
  compose.zigbee.productId = keepPIDs.length > 0 ? keepPIDs : pids; // Garder PIDs si au moins 1 MF
  
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  
  if (keepMFs.length === 0) {
    emptied++;
  } else {
    updated++;
    console.log(`  ✓ ${driverId}: ${mfs.length}→${keepMFs.length} MFs`);
  }
});

console.log(`\nMis à jour: ${updated} | Vidés: ${emptied}`);

// Vérification finale des conflits
console.log('\nVérification finale...');
const finalIndex = {};
let collisionCount = 0;

driverDirs.forEach(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  try {
    const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
    if (!c.zigbee) return;
    const mfs = c.zigbee.manufacturerName || [];
    const pids = c.zigbee.productId || [];
    mfs.forEach(mf => {
      pids.forEach(pid => {
        const key = `${mf.toUpperCase()}|${pid.toUpperCase()}`;
        if (!finalIndex[key]) finalIndex[key] = [];
        if (!finalIndex[key].includes(dir)) finalIndex[key].push(dir);
      });
    });
  } catch (e) { /* skip */ }
});

Object.values(finalIndex).forEach(drivers => {
  if (drivers.length > 1) collisionCount++;
});

const emptyCount = driverDirs.filter(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return false;
  try {
    const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
    return c.zigbee && (!c.zigbee.manufacturerName || c.zigbee.manufacturerName.length === 0);
  } catch (e) { return false; }
}).length;

console.log(`✓ Collisions restantes: ${collisionCount}`);
console.log(`✓ Drivers avec MF vide: ${emptyCount}`);
console.log(`✓ Fingerprints uniques: ${Object.keys(finalIndex).length}`);

// Synchroniser app.json
console.log('\nSync app.json...');
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
      // Fix image paths
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
console.log(`✓ app.json: ${appUpdated} drivers synced`);
