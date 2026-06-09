'use strict';
/**
 * sync-fingerprints-to-compose.js
 * 
 * OBJECTIF: Restaurer les manufacturerName statiques dans driver.compose.json
 * depuis la base de données data/fingerprints.json (source de vérité)
 * 
 * ARCHITECTURE (selon .clinerules et .windsurfrules):
 * - STATIC: manufacturerName dans driver.compose.json → pairing local Homey
 * - DYNAMIC: data/fingerprints.json → capabilities/DP à runtime
 * Les deux niveaux sont OBLIGATOIRES
 * 
 * RÈGLES:
 * - Case-insensitive matching (CaseInsensitiveMatcher.js pattern)
 * - Pas de wildcards dans manufacturerName
 * - manufacturerName + productId COMBINÉS pour le matching
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const FP_DB = path.join(ROOT, 'data', 'fingerprints.json');
const DRIVER_MAPPING_DB = path.join(ROOT, 'driver-mapping-database.json');

// === MAPPING: driverId dans fingerprints.json → driverId dans drivers/ ===
// Résout les différences de nommage entre la DB et les dossiers de drivers
const DRIVER_ID_MAP = {
  // DB driver ID → array of actual driver folder IDs
  'switch_1gang':           ['wall_switch_1_gang', 'wall_switch_1gang_1way', 'wall_switch_1_gang_tuya', 'switch_1_gang'],
  'switch_2gang':           ['wall_switch_2_gang', 'wall_switch_2gang_1way', 'switch_2_gang'],
  'switch_3gang':           ['wall_switch_3_gang', 'wall_switch_3gang_1way', 'switch_3_gang'],
  'switch_4gang':           ['wall_switch_4_gang', 'wall_switch_4gang_1way'],
  'switch_wall_6gang':      ['wall_switch_5_gang_tuya', 'wall_switch_6_gang_tuya'],
  'light_dimmable':         ['dimmer_wall_1gang', 'dimmer_1_gang_2', 'dimmer_1_gang_tuya', 'dimmer_ts110e', 'dimmer_wall_1gang'],
  'dimmer_1gang':           ['dimmer_wall_1gang', 'dimmer_1_gang_2', 'dimmer_bulb_dimmable'],
  'dimmer_wall_1gang':      ['dimmer_wall_1gang', 'dimmer_1_gang_2'],
  'cover_motor':            ['curtain_motor', 'curtain_motor_shutter', 'curtain_module', 'curtain_module_2_gang'],
  'curtain_motor':          ['curtain_motor', 'curtain_motor_shutter'],
  'thermostat_ts0601':      ['thermostat_tuya_dp', 'wall_thermostat', 'smart_lcd_thermostat', 'floor_heating_thermostat', 'device_floor_heating_thermostat', 'thermostat_4ch'],
  'climate_sensor':         ['lcdtemphumidsensor', 'lcdtemphumidsensor_2', 'lcdtemphumidsensor_3', 'lcdtemphumidluxsensor', 'climate_sensor_energy', 'climate_sensor_gas', 'climate_sensor_plug', 'climate_sensor_dimmer'],
  'presence_sensor_radar':  ['presence_sensor_radar', 'presence_sensor_ceiling', 'pir_mmwave_sensor', 'motion_sensor_radar_mmwave', 'radar_sensor_2', 'radar_sensor_ceiling', 'sensor_presence_radar', 'sensor_illuminance_presence'],
  'motion_sensor_radar_mmwave': ['motion_sensor_radar_mmwave', 'pir_mmwave_sensor'],
  'energy_meter':           ['power_meter', 'device_din_rail_meter', 'device_plug_energy_monitor', 'switch_1_gang_metering', 'switch_2_gang_metering', 'switch_4_gang_metering'],
  'plug_1socket':           ['smartplug_2_socket', 'outdoor_2_socket', 'socket_power_strip', 'socket_power_strip_four', 'socket_power_strip_four_three', 'device_plug_smart', 'plug_smart_switch', 'double_power_point', 'double_power_point_2'],
  'plug_smart':             ['device_plug_energy', 'usb_outlet_advanced'],
  'motion_sensor':          ['motion_sensor', 'motion_sensor_2', 'motion_sensor_switch', 'air_purifier_motion', 'device_air_purifier_motion', 'sensor_motion_presence', 'sensor_climate_motion'],
  'contact_sensor':         ['contact_sensor', 'contact_sensor_curtain', 'contact_sensor_dimmer', 'contact_sensor_plug', 'contact_sensor_switch', 'contact_sensor_zigbee', 'air_purifier_contact', 'sensor_contact_climate', 'sensor_contact_motion', 'sensor_contact_plug', 'sensor_contact_rain', 'sensor_contact_water', 'sensor_contact_zigbee'],
  'soil_sensor':            ['soil_sensor', 'air_purifier_soil', 'device_air_purifier_soil', 'sensor_lcdtemphumidsensor_soil'],
  'water_leak_sensor':      ['water_leak_sensor'],
  'switch_wireless':        ['button_wireless', 'button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_scene', 'button_wireless_smart', 'button_wireless_switch', 'scene_switch_1', 'scene_switch_2', 'scene_switch_3', 'handheld_remote_4_buttons', 'remote_button_wireless', 'remote_button_wireless_scene', 'remote_button_wireless_smart', 'wall_remote_4_gang', 'wall_remote_4_gang_2', 'wall_remote_4_gang_3', 'wall_remote_6_gang', 'smart_remote_4_buttons', 'smart_knob_switch', 'smart_button_switch'],
  'button_wireless_1':      ['button_wireless', 'button_wireless_1', 'scene_switch_1'],
  'button_wireless_4':      ['button_wireless_3', 'scene_switch_3', 'handheld_remote_4_buttons'],
  'smoke_detector_advanced':['smoke_detector_advanced', 'smoke_sensor', 'smoke_sensor2', 'smoke_sensor3'],
  'smoke_detector':         ['smoke_sensor', 'smoke_sensor3'],
  'gas_sensor':             ['gas_sensor', 'gas_sensor_switch', 'sensor_gas_presence'],
  'vibration_sensor':       ['vibration_sensor'],
  'radiator_valve':         ['radiator_valve', 'thermostatic_radiator_valve', 'device_radiator_valve_thermostat'],
  'water_valve_smart':      ['valve_dual_irrigation'],
  'light_sensor':           ['air_quality_co2'],
  'air_quality_co2':        ['air_quality_co2', 'smart_air_detection_box'],
  'air_quality_comprehensive': ['smart_air_detection_box', 'air_purifier_quality', 'device_air_purifier_quality'],
  'siren_alarm':            ['siren', 'air_purifier_siren', 'device_air_purifier_siren', 'sirentemphumidsensor'],
  'siren':                  ['siren', 'smoke_detector_advanced'],
  'garage_door_opener':     ['garage_door_opener', 'door_controller_garage'],
  'usb_outlet_advanced':    ['button_wireless_usb', 'button_wireless_plug', 'remote_button_wireless_plug', 'remote_button_wireless_usb'],
  'fan_controller':         ['humidifier'],
  'ir_blaster':             ['blaster_remote'],
  'switch_dimmer_1gang':    ['dimmer_air_purifier', 'dimmer_wall_switch'],
  'co_detector':            ['device_air_purifier_smoke']
};

// === LOAD fingerprints.json ===
console.log('=== SYNC FINGERPRINTS TO COMPOSE ===\n');
console.log('[1/4] Chargement de data/fingerprints.json (buffer mode)...');
const fpBuf = fs.readFileSync(FP_DB);
const fps = JSON.parse(fpBuf);
console.log(`  ✓ ${Object.keys(fps).length} fingerprints chargés`);

// Grouper par driverId (depuis la DB)
const byDriverId = {};
Object.entries(fps).forEach(([mf, info]) => {
  const did = info.driverId || info.type;
  if (!did) return;
  if (!byDriverId[did]) byDriverId[did] = { mfs: [], modelIds: new Set() };
  // Case-insensitive: normaliser le MF
  byDriverId[did].mfs.push(mf);
  (info.modelIds || []).forEach(m => byDriverId[did].modelIds.add(m));
});

// === LOAD driver-mapping-database.json ===
console.log('\n[2/4] Chargement de driver-mapping-database.json...');
const dbBuf = fs.readFileSync(DRIVER_MAPPING_DB);
const db = JSON.parse(dbBuf);
const mfrIndex = db.mfr_index || {};
console.log(`  ✓ ${Object.keys(mfrIndex).length} MFs dans mfr_index`);

// mfr_index: { manufacturerName: [driverId1, driverId2, ...] }
// Inverser: { driverId: [mf1, mf2, ...] }
const dbByDriver = {};
Object.entries(mfrIndex).forEach(([mf, driverIds]) => {
  (Array.isArray(driverIds) ? driverIds : [driverIds]).forEach(did => {
    if (!dbByDriver[did]) dbByDriver[did] = [];
    dbByDriver[did].push(mf);
  });
});
console.log(`  ✓ ${Object.keys(dbByDriver).length} drivers dans mfr_index inversé`);

// === INJECT INTO driver.compose.json ===
console.log('\n[3/4] Injection dans driver.compose.json...');

const stats = { injected: 0, skipped: 0, notFound: [], alreadyFull: [] };
const driverDirs = fs.existsSync(DRIVERS_DIR) ? fs.readdirSync(DRIVERS_DIR) : [];

// Fonction case-insensitive de normalisation des MFs
function normalizeMF(mf) {
  // Préserver le casing original mais dédupliquer en lowercase
  return mf.trim();
}

// Fonction pour trouver les MFs pour un driver donné
function getMFsForDriver(driverId) {
  const allMFs = new Set();
  const allPIDs = new Set();

  // Source 1: fingerprints.json (byDriverId direct)
  if (byDriverId[driverId]) {
    byDriverId[driverId].mfs.forEach(mf => allMFs.add(mf));
    byDriverId[driverId].modelIds.forEach(p => allPIDs.add(p));
  }

  // Source 2: DRIVER_ID_MAP (reverse mapping depuis la DB)
  Object.entries(DRIVER_ID_MAP).forEach(([dbId, targets]) => {
    if (targets.includes(driverId) && byDriverId[dbId]) {
      byDriverId[dbId].mfs.forEach(mf => allMFs.add(mf));
      byDriverId[dbId].modelIds.forEach(p => allPIDs.add(p));
    }
  });

  // Source 3: driver-mapping-database.json mfr_index
  if (dbByDriver[driverId]) {
    dbByDriver[driverId].forEach(mf => allMFs.add(mf));
  }

  return { mfs: [...allMFs], pids: [...allPIDs] };
}

// Traiter chaque driver
driverDirs.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;

  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (e) {
    console.log(`  ✗ JSON invalide: ${driverId}`);
    return;
  }

  if (!compose.zigbee) {
    stats.skipped++;
    return; // Non-Zigbee driver
  }

  const existingMFs = compose.zigbee.manufacturerName || [];
  const existingPIDs = compose.zigbee.productId || [];

  // Déjà rempli avec beaucoup de fingerprints
  if (existingMFs.length > 10) {
    stats.alreadyFull.push(driverId);
    return;
  }

  // Chercher les MFs disponibles
  const { mfs, pids } = getMFsForDriver(driverId);

  if (mfs.length === 0 && pids.length === 0) {
    stats.notFound.push(driverId);
    return;
  }

  // Merger sans doublons (case-insensitive dedup)
  const existingMFsLower = existingMFs.map(m => m.toLowerCase());
  const newMFs = [...existingMFs];
  mfs.forEach(mf => {
    if (!existingMFsLower.includes(mf.toLowerCase())) {
      newMFs.push(mf);
      existingMFsLower.push(mf.toLowerCase());
    }
  });

  const existingPIDsLower = existingPIDs.map(p => p.toLowerCase());
  const newPIDs = [...existingPIDs];
  pids.forEach(pid => {
    if (!existingPIDsLower.includes(pid.toLowerCase())) {
      newPIDs.push(pid);
      existingPIDsLower.push(pid.toLowerCase());
    }
  });

  const changed = newMFs.length !== existingMFs.length || newPIDs.length !== existingPIDs.length;

  if (!changed) {
    stats.skipped++;
    return;
  }

  compose.zigbee.manufacturerName = newMFs;
  compose.zigbee.productId = newPIDs;

  // Corriger aussi les chemins d'images
  if (compose.images) {
    ['small', 'large', 'xlarge'].forEach(size => {
      if (compose.images[size] && !compose.images[size].startsWith('/')) {
        compose.images[size] = '/' + compose.images[size];
      }
    });
  }

  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  console.log(`  ✓ ${driverId}: +${newMFs.length - existingMFs.length} MFs (total: ${newMFs.length}), PIDs: ${newPIDs.join(',')}`);
  stats.injected++;
});

// === REBUILD app.json ===
console.log('\n[4/4] Synchronisation vers app.json...');

// Recharger app.json et mettre à jour les drivers
const appPath = path.join(ROOT, 'app.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
let appUpdated = 0;

if (app.drivers) {
  app.drivers.forEach(driver => {
    const composePath = path.join(DRIVERS_DIR, driver.id, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.zigbee) return;

    const newMFs = compose.zigbee.manufacturerName || [];
    const newPIDs = compose.zigbee.productId || [];
    const existingMFs = driver.zigbee ? (driver.zigbee.manufacturerName || []) : [];

    if (newMFs.length > existingMFs.length) {
      if (!driver.zigbee) driver.zigbee = {};
      driver.zigbee.manufacturerName = newMFs;
      driver.zigbee.productId = newPIDs;
      // Corriger aussi les chemins d'images dans app.json
      if (driver.images) {
        ['small', 'large', 'xlarge'].forEach(size => {
          if (driver.images[size] && !driver.images[size].startsWith('/')) {
            driver.images[size] = '/' + driver.images[size];
          }
        });
      }
      appUpdated++;
    }
  });
}

fs.writeFileSync(appPath, JSON.stringify(app, null, 2));
console.log(`  ✓ app.json mis à jour: ${appUpdated} drivers`);

// === RAPPORT FINAL ===
console.log('\n=== RÉSUMÉ FINAL ===');
console.log(`✓ Drivers mis à jour: ${stats.injected}`);
console.log(`✓ Drivers déjà bien remplis: ${stats.alreadyFull.length}`);
console.log(`- Drivers sans Zigbee: ${stats.skipped}`);
console.log(`✗ Drivers sans fingerprints dans la DB: ${stats.notFound.length}`);

if (stats.notFound.length > 0) {
  console.log('\nDrivers sans fingerprints (nécessitent des données externes):');
  stats.notFound.forEach(d => console.log(`  - ${d}`));
}

// Vérification finale
const emptyAfter = [];
driverDirs.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  if (!compose.zigbee) return;
  const mfs = compose.zigbee.manufacturerName || [];
  if (mfs.length === 0) emptyAfter.push(driverId);
});

console.log(`\n✓ Drivers encore vides après correction: ${emptyAfter.length}`);
if (emptyAfter.length > 0) {
  fs.writeFileSync(path.join(ROOT, 'tmp', 'still-empty-mf.json'), JSON.stringify(emptyAfter, null, 2));
  console.log('  Voir: tmp/still-empty-mf.json');
}
