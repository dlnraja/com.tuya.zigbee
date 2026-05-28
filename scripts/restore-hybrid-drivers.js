'use strict';
/**
 * restore-hybrid-drivers.js
 * 
 * Les 99 drivers hybrides "master-only" ont été vidés par fix-collisions-final.js
 * car leurs MFs étaient partagés avec les drivers principaux.
 * 
 * STRATÉGIE CORRIGÉE:
 * Ces drivers hybrides (air_purifier_climate, climate_sensor_plug, etc.) sont des
 * DEVICES LOGIQUES différents du driver principal. Ils partagent INTENTIONNELLEMENT
 * des MFs avec d'autres drivers — c'est le mécanisme de FAMILLE.
 * 
 * La règle correcte:
 * - Un driver hybride PEUT avoir les mêmes MFs qu'un driver principal
 * - Homey sélectionne le driver par ordre dans app.json (le premier match gagne)
 * - Ces drivers hybrides DOIVENT être positionnés APRÈS le driver principal
 * - Ils ne créent PAS de collision si la sélection est déterministe
 * 
 * SOLUTION:
 * Réinjecter les MFs depuis la DB fingerprints.json et stable-v5,
 * sans supprimer les doublons inter-drivers.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');
const DB_PATH = path.join(ROOT, 'data', 'fingerprints.json');

console.log('=== RESTORE HYBRID DRIVERS MFs ===\n');

// Charger la DB fingerprints
console.log('Chargement data/fingerprints.json...');
const fpBuf = fs.readFileSync(DB_PATH);
const fpDB = JSON.parse(fpBuf);
if (global.gc) global.gc();
console.log(`DB chargée: ${Object.keys(fpDB).length} entrées`);

// Identifier les 99 drivers avec MF vide
const emptyDrivers = [];
fs.readdirSync(DRIVERS_DIR).forEach(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  try {
    const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
    if (c.zigbee && (!c.zigbee.manufacturerName || c.zigbee.manufacturerName.length === 0)) {
      emptyDrivers.push(dir);
    }
  } catch (e) { /* skip */ }
});

console.log(`Drivers hybrides vides à restaurer: ${emptyDrivers.length}`);

// DRIVER_ID_MAP étendu — mapping logique
const DRIVER_ID_MAP = {
  // Air purifier variants → map vers 'airpurifier' ou 'air_purifier' dans DB
  'air_purifier_climate': ['airpurifier', 'air_quality'],
  'air_purifier_curtain': ['airpurifier'],
  'air_purifier_dimmer': ['airpurifier'],
  'air_purifier_din': ['airpurifier'],
  'air_purifier_lcdtemphumidsensor': ['airpurifier', 'temphumidsensor'],
  'air_purifier_quality': ['airpurifier', 'air_quality'],
  'air_purifier_siren': ['airpurifier', 'siren'],
  'air_purifier_soil': ['airpurifier', 'soil_sensor'],
  'air_purifier_switch': ['airpurifier'],
  
  // Bulb variants
  'bulb_dimmable_dimmer': ['bulb_dimmable', 'dimmer'],
  'bulb_rgb_rgbw': ['bulb_rgb', 'bulb_rgbw'],
  
  // Button variants
  'button_wireless_fingerbot': ['fingerbot_switch'],
  'button_wireless_usb': ['button_wireless'],
  'button_wireless_valve': ['button_wireless'],
  
  // Climate sensor variants
  'climate_sensor_dimmer': ['climate_sensor', 'dimmer'],
  'climate_sensor_energy': ['climate_sensor'],
  'climate_sensor_gas': ['climate_sensor', 'co_sensor'],
  'climate_sensor_plug': ['climate_sensor', 'plug_smart'],
  'climate_sensor_smart': ['climate_sensor'],
  'climate_sensor_switch': ['climate_sensor', 'switch'],
};

// Pour les drivers sans mapping explicite, utiliser le nom de base (avant dernier _)
function getDBKeys(driverId) {
  if (DRIVER_ID_MAP[driverId]) return DRIVER_ID_MAP[driverId];
  
  // Tenter le nom complet
  const candidates = [driverId];
  
  // Variante sans le dernier segment
  const parts = driverId.split('_');
  if (parts.length > 2) {
    candidates.push(parts.slice(0, -1).join('_')); // sans dernier mot
    candidates.push(parts.slice(0, -2).join('_')); // sans 2 derniers mots
  }
  candidates.push(parts[0]); // juste le premier mot
  
  return candidates;
}

function getMFsFromDB(driverId) {
  const keys = getDBKeys(driverId);
  for (const key of keys) {
    if (fpDB[key] && fpDB[key].length > 0) {
      return fpDB[key].slice(0, 20); // max 20 MFs depuis DB
    }
  }
  return [];
}

function getStableMFs(driverId) {
  try {
    const raw = execSync(
      `git show origin/stable-v5:drivers/${driverId}/driver.compose.json 2>&1`,
      { cwd: ROOT, encoding: 'utf8', timeout: 3000 }
    );
    const c = JSON.parse(raw);
    return (c.zigbee && c.zigbee.manufacturerName) || [];
  } catch (e) {
    return [];
  }
}

let restored = 0;
let stillEmpty = 0;

emptyDrivers.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (e) {
    return;
  }
  
  if (!compose.zigbee) return;
  
  // Chercher les MFs: d'abord stable-v5, puis DB
  let mfs = getStableMFs(driverId);
  
  if (mfs.length === 0) {
    mfs = getMFsFromDB(driverId);
  }
  
  if (mfs.length === 0) {
    console.log(`  ✗ ${driverId}: aucune source trouvée`);
    stillEmpty++;
    return;
  }
  
  const pids = compose.zigbee.productId || [];
  
  compose.zigbee.manufacturerName = mfs;
  
  // Ajouter TS0601 comme PID par défaut si vide
  if (pids.length === 0) {
    compose.zigbee.productId = ['TS0601'];
  }
  
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  console.log(`  ✓ ${driverId}: ${mfs.length} MFs restaurés`);
  restored++;
});

console.log(`\n✓ Restaurés: ${restored}`);
console.log(`✗ Encore vides: ${stillEmpty}`);

// Sync app.json
console.log('\nSync app.json...');
const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
let updated = 0;
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
      updated++;
    } catch (e) { /* skip */ }
  });
}
fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2));

const appSize = Math.round(Buffer.byteLength(JSON.stringify(app), 'utf8') / 1024 / 1024 * 10) / 10;
console.log(`✓ app.json: ${updated} drivers synced, taille: ${appSize}Mo`);

// Check final
const finalEmpty = fs.readdirSync(DRIVERS_DIR).filter(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return false;
  try {
    const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
    return c.zigbee && (!c.zigbee.manufacturerName || c.zigbee.manufacturerName.length === 0);
  } catch (e) { return false; }
}).length;
console.log(`\n✓ Drivers Zigbee avec MF vide (final): ${finalEmpty}`);
