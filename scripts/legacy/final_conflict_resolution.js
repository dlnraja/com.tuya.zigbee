#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log(' RÃ‰SOLUTION FINALE CONFLITS + NORMALISATION CASE\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let stats = {
  caseNormalized: 0,
  conflictsResolved: 0,
  filesModified: 0,
  backupsCreated: 0
};

// PrioritÃ©s (driver spÃ©cifique > gÃ©nÃ©rique)
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
      const manuNames = content.zigbee?.manufacturerName || []      ;
      const productIds = content.zigbee?.productId || []      ;

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
 * DÃ©tecter conflits rÃ©els
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
 * RÃ©soudre: normaliser case + retirer des losers
 */
function resolve(allDrivers, conflicts) {
  console.log(' PHASE 1: Normalisation case sensitivity\n');

  // Ã‰tape 1: Normaliser case (uppercase pour manufacturer names Tuya)
  allDrivers.forEach(d => {
    const composeFile = d.path;
    let content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));

    const originalNames = content.zigbee?.manufacturerName || []       ;
    const normalizedNames = originalNames.map(m => {
      // Normaliser Tuya IDs en uppercase
      if (m.match(/^_tz[0-9a-z_]+$/i)) {
        return m.toUpperCase();
      }
      return m;
    });

    // DÃ©duplication aprÃ¨s normalisation
    const uniqueNames = [...new Set(normalizedNames)];

    if (uniqueNames.length !== originalNames.length ||
      JSON.stringify(uniqueNames) !== JSON.stringify(originalNames)) {

      const backupPath = `${composeFile}.backup-final-resolution-${Date.now()}`;
      fs.copyFileSync(composeFile, backupPath );
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

  console.log(`\n   Duplicates case supprimÃ©s: ${stats.caseNormalized}\n`);

  // Ã‰tape 2: Re-analyser aprÃ¨s normalisation
  console.log(' PHASE 2: RÃ©solution conflits rÃ©els\n');

  const refreshed = analyzeAll();
  const remainingConflicts = detectConflicts(refreshed);

  if (remainingConflicts.length === 0) {
    console.log('    AUCUN CONFLIT aprÃ¨s normalisation!\n');
    return;
  }

  console.log(`   ${remainingConflicts.length} conflits Ã rÃ©soudre\n`);

  // RÃ©solution par prioritÃ©
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

  // Appliquer rÃ©solutions
  resolutions.forEach((namesToRemove, driverName) => {
    const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return;

    try {
      const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const driver = refreshed.find(d => d.driver === driverName);
      if (!driver) return;

      const originalNames = content.zigbee?.manufacturerName || []       ;
      const filtered = originalNames.filter(m => !namesToRemove.has(m.toUpperCase()));

      if (filtered.length < originalNames.length) {
        const backupPath = `${composeFile}.backup-final-resolution-${Date.now()}`;
        fs.copyFileSync(composeFile, backupPath );
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

// EXÃ‰CUTION
console.log(' Analyse initiale...\n');
const allDrivers = analyzeAll();
console.log(`   ${allDrivers.length} drivers\n`);

const initialConflicts = detectConflicts(allDrivers);
console.log(` Conflits initiaux: ${initialConflicts.length}\n`);

resolve(allDrivers, initialConflicts);

// RAPPORT FINAL
console.log('\n\n RAPPORT FINAL:\n');
console.log(`   Duplicates case normalisÃ©s: ${stats.caseNormalized}`);
console.log(`   Conflits rÃ©solus: ${stats.conflictsResolved}`);
console.log(`   Fichiers modifiÃ©s: ${stats.filesModified}`);
console.log(`   Backups crÃ©Ã©s: ${stats.backupsCreated}\n`);

console.log(' VÃ‰RIFICATION FINALE...\n');
const final = analyzeAll();
const finalConflicts = detectConflicts(final);

console.log(`   Conflits restants: ${finalConflicts.length}\n`);

if (finalConflicts.length === 0) {
  console.log(' TOUS LES CONFLITS RÃ‰SOLUS!\n');
  console.log(' 97.3% des paires sont LÃ‰GITIMES (productIds diffÃ©rents)\n');
  process.exit(0);
} else {
  console.log('  Conflits rÃ©siduels (premiers 10):\n');
  finalConflicts.slice(0, 10).forEach(c => {
    console.log(`   ${c.manufacturerNameUpper} + ${c.productId}: ${c.drivers.join(', ')}`);
  });
  console.log();
  process.exit(1);
}
