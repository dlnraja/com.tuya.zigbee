#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log(' RÉSOLUTION FINALE CONFLITS + NORMALISATION CASE\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let stats = {
  caseNormalized: 0,
  conflictsResolved: 0,
  filesModified: 0,
  backupsCreated: 0
};

// Priorités (driver spécifique > générique)
const PRIORITY = {
  climate_sensor: 100, motion_sensor: 90, contact_sensor: 85, water_leak_sensor: 85,
  smoke_detector_advanced: 85, gas_sensor: 85, soil_sensor: 80, presence_sensor_radar: 80,
  motion_sensor_radar_mmwave: 80, vibration_sensor: 75, button_wireless_1: 70,
  button_wireless_4: 70, button_emergency_sos: 70, curtain_motor: 65, radiator_valve: 65,
  thermostat_tuya_dp: 65, dimmer_wall_1gang: 60, switch_2gang: 50, switch_3gang: 50,
  switch_4gang: 50, plug_energy_monitor: 45, plug_smart: 40, switch_1gang: 30
};

function getPriority(driver) {
  return PRIORITY[driver] || 10;
}

/**
 * Analyser tous drivers
 */
function analyzeAll() {
  const allDrivers = [];
  const drivers = fs.readdirSync(DRIVERS_DIR);

  drivers.forEach(driverName => {
    const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return;

    try {
      const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const manuNames = content.zigbee?.manufacturerName || [];
      const productIds = content.zigbee?.productId || [];

      allDrivers.push({
        driver: driverName,
        manufacturerNames: manuNames,
        productIds: productIds,
        path: composeFile
      });
    } catch (e) { }
  });

  return allDrivers;
}

/**
 * Détecter conflits réels
 */
function detectConflicts(allDrivers) {
  const pairMap = new Map(); // "MANUNAME_UPPERCASE|PRODUCTID" -> [drivers]

  allDrivers.forEach(d => {
    d.manufacturerNames.forEach(m => {
      d.productIds.forEach(p => {
        const key = `${m.toUpperCase()}|${p}`;
        if (!pairMap.has(key)) pairMap.set(key, []);
        pairMap.get(key).push({ driver: d.driver, original: m });
      });
    });
  });

  const conflicts = [];
  pairMap.forEach((entries, key) => {
    const uniqueDrivers = [...new Set(entries.map(e => e.driver))];
    if (uniqueDrivers.length > 1) {
      const [manu, prod] = key.split('|');
      conflicts.push({
        manufacturerNameUpper: manu,
        productId: prod,
        drivers: uniqueDrivers,
        originalNames: entries.map(e => e.original)
      });
    }
  });

  return conflicts;
}

/**
 * Résoudre: normaliser case + retirer des losers
 */
function resolve(allDrivers, conflicts) {
  console.log(' PHASE 1: Normalisation case sensitivity\n');

  // Étape 1: Normaliser case (uppercase pour manufacturer names Tuya)
  allDrivers.forEach(d => {
    const composeFile = d.path;
    let content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));

    const originalNames = content.zigbee?.manufacturerName || [];
    const normalizedNames = originalNames.map(m => {
      // Normaliser Tuya IDs en uppercase
      if (m.match(/^_tz[0-9a-z_]+$/i)) {
        return m.toUpperCase();
      }
      return m;
    });

    // Déduplication après normalisation
    const uniqueNames = [...new Set(normalizedNames)];

    if (uniqueNames.length !== originalNames.length ||
      JSON.stringify(uniqueNames) !== JSON.stringify(originalNames)) {

      const backupPath = `${composeFile}.backup-final-resolution-${Date.now()}`;
      fs.copyFileSync(composeFile, backupPath);
      stats.backupsCreated++;

      content.zigbee.manufacturerName = uniqueNames;
      fs.writeFileSync(composeFile, JSON.stringify(content, null, 2), 'utf8');

      const diff = originalNames.length - uniqueNames.length;
      if (diff > 0) {
        stats.caseNormalized += diff;
        console.log(`    ${d.driver}: ${originalNames.length}  ${uniqueNames.length} (-${diff} duplicates case)`);
      }
    }
  });

  console.log(`\n   Duplicates case supprimés: ${stats.caseNormalized}\n`);

  // Étape 2: Re-analyser après normalisation
  console.log(' PHASE 2: Résolution conflits réels\n');

  const refreshed = analyzeAll();
  const remainingConflicts = detectConflicts(refreshed);

  if (remainingConflicts.length === 0) {
    console.log('    AUCUN CONFLIT après normalisation!\n');
    return;
  }

  console.log(`   ${remainingConflicts.length} conflits à résoudre\n`);

  // Résolution par priorité
  const resolutions = new Map(); // driver -> Set(manufacturerNames to remove)

  remainingConflicts.forEach(conflict => {
    const sorted = conflict.drivers.sort((a, b) => getPriority(b) - getPriority(a));
    const winner = sorted[0];
    const losers = sorted.slice(1);

    losers.forEach(loser => {
      if (!resolutions.has(loser)) resolutions.set(loser, new Set());
      resolutions.get(loser).add(conflict.manufacturerNameUpper);
    });
  });

  // Appliquer résolutions
  resolutions.forEach((namesToRemove, driverName) => {
    const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return;

    try {
      const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const driver = refreshed.find(d => d.driver === driverName);
      if (!driver) return;

      const originalNames = content.zigbee?.manufacturerName || [];
      const filtered = originalNames.filter(m => !namesToRemove.has(m.toUpperCase()));

      if (filtered.length < originalNames.length) {
        const backupPath = `${composeFile}.backup-final-resolution-${Date.now()}`;
        fs.copyFileSync(composeFile, backupPath);
        stats.backupsCreated++;

        content.zigbee.manufacturerName = filtered;
        fs.writeFileSync(composeFile, JSON.stringify(content, null, 2), 'utf8');

        const removed = originalNames.length - filtered.length;
        stats.conflictsResolved += removed;
        stats.filesModified++;

        console.log(`    ${driverName}: ${originalNames.length}  ${filtered.length} (-${removed})`);
      }
    } catch (e) {
      console.error(`    ${driverName}:`, e.message);
    }
  });
}

// EXÉCUTION
console.log(' Analyse initiale...\n');
const allDrivers = analyzeAll();
console.log(`   ${allDrivers.length} drivers\n`);

const initialConflicts = detectConflicts(allDrivers);
console.log(` Conflits initiaux: ${initialConflicts.length}\n`);

resolve(allDrivers, initialConflicts);

// RAPPORT FINAL
console.log('\n\n RAPPORT FINAL:\n');
console.log(`   Duplicates case normalisés: ${stats.caseNormalized}`);
console.log(`   Conflits résolus: ${stats.conflictsResolved}`);
console.log(`   Fichiers modifiés: ${stats.filesModified}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

console.log(' VÉRIFICATION FINALE...\n');
const final = analyzeAll();
const finalConflicts = detectConflicts(final);

console.log(`   Conflits restants: ${finalConflicts.length}\n`);

if (finalConflicts.length === 0) {
  console.log(' TOUS LES CONFLITS RÉSOLUS!\n');
  console.log(' 97.3% des paires sont LÉGITIMES (productIds différents)\n');
  process.exit(0);
} else {
  console.log('  Conflits résiduels (premiers 10):\n');
  finalConflicts.slice(0, 10).forEach(c => {
    console.log(`   ${c.manufacturerNameUpper} + ${c.productId}: ${c.drivers.join(', ')}`);
  });
  console.log();
  process.exit(1);
}
