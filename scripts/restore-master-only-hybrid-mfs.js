'use strict';
/**
 * restore-master-only-hybrid-mfs.js
 * 
 * Les drivers hybrides master-only (air_purifier_climate, etc.)
 * sont des VARIANTES du driver parent avec des capabilities différentes.
 * Ils doivent hériter des MFs du driver PARENT (premier segment du nom).
 * 
 * Exemple:
 *   air_purifier_climate → parent: air_purifier → copier ses MFs
 *   climate_sensor_dimmer → parent: climate_sensor → copier ses MFs
 *   contact_sensor_dimmer → parent: contact_sensor → copier ses MFs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('=== RESTORE MASTER-ONLY HYBRID MFs ===\n');

// Charger tous les compose files
const allCompose = {};
fs.readdirSync(DRIVERS_DIR).forEach(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  try { allCompose[dir] = JSON.parse(fs.readFileSync(cp, 'utf8')); } catch (e) { /* skip */ }
});

// Identifier les drivers vides
const emptyDrivers = Object.entries(allCompose)
  .filter(([, c]) => c.zigbee && (!c.zigbee.manufacturerName || c.zigbee.manufacturerName.length === 0))
  .map(([id]) => id);

console.log(`Drivers vides à restaurer: ${emptyDrivers.length}`);

// Pour chaque driver vide, trouver le parent et copier ses MFs
function findParentDriver(driverId) {
  const parts = driverId.split('_');
  
  // Essayer de trouver le driver parent dans l'ordre de priorité
  const candidates = [];
  
  // 1. Nom complet → enlever dernier segment
  for (let i = parts.length - 1; i >= 1; i--) {
    candidates.push(parts.slice(0, i).join('_'));
  }
  
  // 2. Mappings spéciaux pour les prefixes
  const PREFIX_MAP = {
    'air_purifier': 'air_purifier',
    'climate_sensor': 'climate_sensor',
    'contact_sensor': 'contact_sensor',
    'curtain_motor': 'curtain_motor',
    'curtain_module': 'curtain_module',
    'device_air': 'air_purifier',
    'device_din': 'device_din_rail',
    'device_floor': 'floor_heating_thermostat',
    'device_generic': 'universal_fallback',
    'device_plug': 'plug_smart',
    'device_radiator': 'radiator_valve',
    'dimmer_2': 'dimmer_2_gang',
    'led_controller': 'led_strip',
    'outdoor': 'plug_smart',
    'plug_socket': 'plug_smart',
    'radar_sensor': 'presence_sensor_radar',
    'relay_board': 'switch_1gang',
    'remote_button': 'button_wireless',
    'scene_switch': 'button_wireless',
    'sensor_climate': 'climate_sensor',
    'sensor_contact': 'contact_sensor',
    'sensor_lcdtemp': 'lcdtemphumidsensor',
    'sensor_motion': 'motion_sensor',
    'sensor_presence': 'presence_sensor_radar',
    'smart_air': 'air_purifier',
    'smart_switch': 'switch_1gang',
    'socket_power': 'plug_smart',
    'sr_zs': 'switch_1gang',
    'switch_3': 'switch_3_gang',
    'switch_wall': 'switch_1gang',
    'temphumidsensor2': 'temphumidsensor',
    'temphumidsensor3': 'temphumidsensor',
    'temphumidsensor4': 'temphumidsensor',
    'temphumidsensor5': 'temphumidsensor',
    'wall_switch': 'switch_1gang',
    'wifi': null, // skip WiFi drivers
  };
  
  // Vérifier les mappings de prefix
  for (const [prefix, target] of Object.entries(PREFIX_MAP)) {
    if (driverId.startsWith(prefix) && target && allCompose[target]) {
      const parentMFs = (allCompose[target].zigbee && allCompose[target].zigbee.manufacturerName) || [];
      if (parentMFs.length > 0) return target;
    }
  }
  
  // Essayer les candidats par ordre
  for (const candidate of candidates) {
    if (allCompose[candidate] && allCompose[candidate].zigbee) {
      const mfs = allCompose[candidate].zigbee.manufacturerName || [];
      if (mfs.length > 0) return candidate;
    }
  }
  
  return null;
}

let restored = 0;
let stillEmpty = 0;
const restoredFrom = {};

emptyDrivers.forEach(driverId => {
  // Skip WiFi drivers
  if (driverId.startsWith('wifi_') || driverId.startsWith('ir_')) {
    return;
  }
  
  const parentId = findParentDriver(driverId);
  if (!parentId) {
    console.log(`  ✗ ${driverId}: pas de parent trouvé`);
    stillEmpty++;
    return;
  }
  
  const parentCompose = allCompose[parentId];
  const parentMFs = (parentCompose.zigbee && parentCompose.zigbee.manufacturerName) || [];
  const parentPIDs = (parentCompose.zigbee && parentCompose.zigbee.productId) || [];
  
  if (parentMFs.length === 0) {
    console.log(`  ✗ ${driverId}: parent ${parentId} aussi vide`);
    stillEmpty++;
    return;
  }
  
  // Copier les MFs du parent
  const compose = allCompose[driverId];
  compose.zigbee.manufacturerName = [...parentMFs];
  compose.zigbee.productId = [...parentPIDs];
  
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  
  // Mettre à jour allCompose pour les prochains lookups
  allCompose[driverId] = compose;
  
  restoredFrom[driverId] = parentId;
  console.log(`  ✓ ${driverId} ← ${parentId} (${parentMFs.length} MFs)`);
  restored++;
});

console.log(`\n✓ Restaurés depuis parent: ${restored}`);
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

// Vérification finale
const finalEmpty = fs.readdirSync(DRIVERS_DIR).filter(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return false;
  try {
    const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
    return c.zigbee && (!c.zigbee.manufacturerName || c.zigbee.manufacturerName.length === 0);
  } catch (e) { return false; }
}).length;
console.log(`\n✓ Drivers Zigbee avec MF vide (final): ${finalEmpty}`);
