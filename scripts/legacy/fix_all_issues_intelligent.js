#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log(' CORRECTION AUTOMATIQUE INTELLIGENTE - TOUS PROBLÈMES SDK3\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let stats = {
  driversAnalyzed: 0,
  manufacturerIdsRemoved: 0,
  duplicatesFixed: 0,
  driversModified: 0,
  backupsCreated: 0
};

// Catégories de devices avec leurs manufacturer IDs spécifiques
const DEVICE_CATEGORIES = {
  // Switches & Relays
  switch: {
    patterns: ['switch', 'relay', 'plug'],
    validPrefixes: ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012', 'TS0013', 'TS0014', 'TS011F'],
    validManufacturers: ['_TZ3000_', '_TZ3400_', '_TYZB01_']
  },

  // Buttons & Scene Controllers
  button: {
    patterns: ['button', 'scene', 'remote', 'controller'],
    validPrefixes: ['TS0041', 'TS0042', 'TS0043', 'TS0044'],
    validManufacturers: ['_TZ3000_', '_TZ3400_', '_TYZB01_']
  },

  // Sensors (Motion, Contact, etc.)
  sensor: {
    patterns: ['motion', 'contact', 'door', 'window', 'vibration'],
    validPrefixes: ['TS0202', 'TS0203'],
    validManufacturers: ['_TZ3000_', '_TZ3040_', '_TYZB01_', 'SJCGQ']
  },

  // Climate (Temperature, Humidity)
  climate: {
    patterns: ['temperature', 'humidity', 'climate', 'weather', 'thermostat'],
    validPrefixes: ['TS0201'],
    validManufacturers: ['_TZE200_', '_TZ3000_', 'lumi.weather', 'lumi.sensor_ht']
  },

  // Air Quality
  airquality: {
    patterns: ['air_quality', 'co2', 'tvoc', 'pm25'],
    validPrefixes: ['TS0601'],
    validManufacturers: ['_TZE200_', '_TZE204_']
  },

  // Lights (Bulbs, LED Strips)
  light: {
    patterns: ['bulb', 'led', 'light', 'strip'],
    validPrefixes: ['TS0505', 'TS0502', 'TS0503'],
    validManufacturers: ['_TZ3000_', '_TZ3210_', '_TZB210_']
  },

  // Smoke & Gas Detectors
  smoke: {
    patterns: ['smoke', 'gas', 'fire'],
    validPrefixes: ['TS0205'],
    validManufacturers: ['_TZ3000_', '_TYZB01_']
  },

  // Water Leak
  water: {
    patterns: ['water', 'leak', 'flood'],
    validPrefixes: ['TS0207'],
    validManufacturers: ['_TZ3000_', '_TZE200_', 'lumi.sensor_wleak']
  },

  // Curtains & Covers
  cover: {
    patterns: ['curtain', 'blind', 'shade', 'cover'],
    validPrefixes: ['TS0601'],
    validManufacturers: ['_TZE200_', '_TZE204_']
  },

  // Sirens & Alarms
  siren: {
    patterns: ['siren', 'alarm'],
    validPrefixes: ['TS0219'],
    validManufacturers: ['_TZ3000_', '_TYZB01_']
  },

  // Soil & Plant Sensors
  soil: {
    patterns: ['soil', 'plant'],
    validPrefixes: ['TS0601'],
    validManufacturers: ['_TZE200_']
  },

  // Dimmers
  dimmer: {
    patterns: ['dimmer', 'dim'],
    validPrefixes: ['TS0601', 'TS110E', 'TS110F'],
    validManufacturers: ['_TZE200_', '_TZ3000_', '_TZ3210_']
  },

  // IR Blasters
  ir: {
    patterns: ['ir_blaster', 'infrared'],
    validPrefixes: ['TS1201'],
    validManufacturers: ['_TZ3000_']
  }
};

// IDs génériques à supprimer (non Tuya/Zigbee 3.0)
const GENERIC_IDS_TO_REMOVE = [
  'GE', 'IKEA of Sweden', 'Samsung', 'Sengled', 'SmartThings',
  'LEDVANCE', 'OSRAM', 'Philips', 'SYLVANIA', 'CentraLite',
  'Iris', 'Jasco Products', 'Lowe\'s', 'Xiaomi', 'Aqara',
  'MLI', 'GLEDOPTO', 'innr', 'Paulmann', 'Sunricher',
  'Müller Licht', 'Dresden Elektronik', 'TRADFRI', 'TRÅDFRI'
];

/**
 * Déterminer catégorie du driver
 */
function getDriverCategory(driverPath, driverName) {
  const lowerName = driverName.toLowerCase();

  for (const [category, config] of Object.entries(DEVICE_CATEGORIES)) {
    if (config.patterns.some(p => lowerName.includes(p))) {
      return category;
    }
  }

  return 'generic';
}

/**
 * Filtrer manufacturer IDs selon catégorie
 */
function filterManufacturerIds(ids, category) {
  if (category === 'generic') return ids;

  const config = DEVICE_CATEGORIES[category];
  if (!config) return ids;

  return ids.filter(id => {
    // Garder si commence par un préfixe valide
    if (config.validPrefixes.some(prefix => id.startsWith(prefix))) {
      return true;
    }

    // Garder si contient un manufacturer valide
    if (config.validManufacturers.some(manu => id.includes(manu) || manu.includes(id))) {
      return true;
    }

    // Garder les IDs Tuya spécifiques
    if (id.match(/^_TZ[0-9A-Z]{4}_[a-z0-9]{8}$/)) {
      return true;
    }

    // Supprimer les génériques
    return false;
  });
}

/**
 * Nettoyer product IDs
 */
function cleanProductIds(productIds, category) {
  if (!productIds || !Array.isArray(productIds)) return [];

  // Garder uniquement les IDs Tuya pertinents
  return productIds.filter(id => {
    // Format Tuya standard
    if (id.match(/^TS[0-9]{4}$/)) return true;
    if (id.match(/^[a-z0-9_]{6,}$/)) return true;

    return false;
  });
}

/**
 * Analyser et corriger driver
 */
function processDriver(driverPath) {
  stats.driversAnalyzed++;

  const composeFile = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) return;

  try {
    const content = fs.readFileSync(composeFile, 'utf8');
    const driver = JSON.parse(content);

    const driverName = path.basename(driverPath);
    const category = getDriverCategory(driverPath, driverName);

    let modified = false;

    // Traiter manufacturer IDs
    if (driver.zigbee && driver.zigbee.manufacturerName) {
      const originalIds = driver.zigbee.manufacturerName;
      const originalCount = originalIds.length;

      // Supprimer génériques
      let filteredIds = originalIds.filter(id => !GENERIC_IDS_TO_REMOVE.includes(id));

      // Filtrer selon catégorie
      filteredIds = filterManufacturerIds(filteredIds, category);

      // Dédupliquer
      filteredIds = [...new Set(filteredIds)];

      // Limiter à 15 max (sauf si moins)
      if (filteredIds.length > 15 && category !== 'generic') {
        console.log(`     ${driverName}: ${originalCount} IDs  limitant à 15 les plus pertinents`);
        // Garder les TS* en priorité, puis les _TZ*
        const tsIds = filteredIds.filter(id => id.startsWith('TS'));
        const tzIds = filteredIds.filter(id => id.startsWith('_TZ'));
        const others = filteredIds.filter(id => !id.startsWith('TS') && !id.startsWith('_TZ'));

        filteredIds = [...tsIds.slice(0, 5), ...tzIds.slice(0, 8), ...others.slice(0, 2)];
      }

      if (filteredIds.length !== originalCount) {
        driver.zigbee.manufacturerName = filteredIds.sort();
        modified = true;
        stats.manufacturerIdsRemoved += (originalCount - filteredIds.length);

        if (originalCount - filteredIds.length > 0) {
          console.log(`    ${driverName}: ${originalCount}  ${filteredIds.length} manufacturer IDs (catégorie: ${category})`);
        }
      }
    }

    // Traiter product IDs
    if (driver.zigbee && driver.zigbee.productId) {
      const originalProductIds = driver.zigbee.productId;
      const cleanedProductIds = cleanProductIds(originalProductIds, category);
      const uniqueProductIds = [...new Set(cleanedProductIds)];

      if (uniqueProductIds.length !== originalProductIds.length) {
        driver.zigbee.productId = uniqueProductIds.sort();
        modified = true;
      }
    }

    // Sauvegarder si modifié
    if (modified) {
      // Backup
      const backupPath = `${composeFile}.backup-intelligent-${Date.now()}`;
      fs.copyFileSync(composeFile, backupPath);
      stats.backupsCreated++;

      // Sauvegarder
      fs.writeFileSync(composeFile, JSON.stringify(driver, null, 2), 'utf8');
      stats.driversModified++;
    }

  } catch (e) {
    console.error(`    Erreur ${driverName}:`, e.message);
  }
}

/**
 * Scanner tous les drivers
 */
function scanDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR);

  drivers.forEach(driverName => {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const stat = fs.statSync(driverPath);

    if (stat.isDirectory() && !driverName.startsWith('.')) {
      processDriver(driverPath);
    }
  });
}

// EXÉCUTION
console.log(' Analyse des drivers par catégorie...\n');
scanDrivers();

console.log('\n\n RAPPORT CORRECTIONS:\n');
console.log(`   Drivers analysés: ${stats.driversAnalyzed}`);
console.log(`   Drivers modifiés: ${stats.driversModified}`);
console.log(`   Manufacturer IDs supprimés: ${stats.manufacturerIdsRemoved}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

if (stats.driversModified > 0) {
  console.log(' CORRECTIONS APPLIQUÉES\n');
  console.log(' PROCHAINES ÉTAPES:');
  console.log('   1. Relancer audit: node scripts/audit_complete_advanced.js');
  console.log('   2. Valider: homey app validate --level publish');
  console.log('   3. Build: homey app build');
  console.log('   4. Commit & push\n');
} else {
  console.log(' AUCUNE CORRECTION NÉCESSAIRE\n');
}

process.exit(0);
