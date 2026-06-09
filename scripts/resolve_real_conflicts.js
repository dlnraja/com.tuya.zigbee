#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 RÉSOLUTION CONFLITS RÉELS (manufacturerName + productId identiques)\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const ANALYSIS_FILE = path.join(ROOT, 'FULL_RESTORATION_CONFLICTS_ANALYSIS.json');

let stats = {
  conflictsResolved: 0,
  filesModified: 0,
  pairsRemoved: 0,
  backupsCreated: 0
};

/**
 * Priorité par type de driver (qui garde la paire en cas de conflit)
 */
const DRIVER_PRIORITY = {
  // Le driver le plus spécifique garde la paire
  'climate_sensor': 100,
  'motion_sensor': 90,
  'contact_sensor': 85,
  'water_leak_sensor': 85,
  'smoke_detector_advanced': 85,
  'gas_sensor': 85,
  'soil_sensor': 80,
  'presence_sensor_radar': 80,
  'motion_sensor_radar_mmwave': 80,
  'vibration_sensor': 75,
  'button_wireless_1': 70,
  'button_wireless_4': 70,
  'button_emergency_sos': 70,
  'curtain_motor': 65,
  'radiator_valve': 65,
  'thermostat_tuya_dp': 65,
  'dimmer_wall_1gang': 60,
  'switch_2gang': 50,
  'switch_3gang': 50,
  'switch_4gang': 50,
  'plug_energy_monitor': 45,
  'plug_smart': 40,
  'switch_1gang': 30, // Plus générique, priorité basse
  'siren': 25,
  'bulb_rgb': 20,
  'led_strip': 15
};

/**
 * Obtenir priorité d'un driver
 */
function getDriverPriority(driverName) {
  return DRIVER_PRIORITY[driverName] || 10; // Défaut: priorité très basse
}

/**
 * Résoudre les conflits
 */
function resolveConflicts(conflicts) {
  const resolutions = [];

  conflicts.forEach(conflict => {
    // Trier drivers par priorité (plus haute = garde la paire)
    const sortedDrivers = conflict.drivers.sort((a, b) =>
      getDriverPriority(b) - getDriverPriority(a)
    );

    const winner = sortedDrivers[0];
    const losers = sortedDrivers.slice(1);

    resolutions.push({
      manufacturerName: conflict.manufacturerName,
      productId: conflict.productId,
      winner: winner,
      losers: losers,
      winnerPriority: getDriverPriority(winner)
    });
  });

  return resolutions;
}

/**
 * Appliquer résolutions (retirer paires des losers)
 */
function applyResolutions(resolutions) {
  // Grouper par loser driver
  const loserMap = new Map();

  resolutions.forEach(resolution => {
    resolution.losers.forEach(loser => {
      if (!loserMap.has(loser)) {
        loserMap.set(loser, []);
      }
      loserMap.get(loser).push({
        manufacturerName: resolution.manufacturerName,
        productId: resolution.productId
      });
    });
  });

  // Appliquer modifications
  loserMap.forEach((pairsToRemove, driverName) => {
    const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

    if (!fs.existsSync(composeFile)) {
      console.log(`   ⚠️  ${driverName}: fichier non trouvé`);
      return;
    }

    try {
      const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));

      if (!content.zigbee) return;

      const originalManuNames = content.zigbee.manufacturerName || [];
      const productIds = content.zigbee.productId || [];

      // Retirer manufacturer names qui créent conflit avec productIds
      const manufacturerNamesToRemove = new Set();

      pairsToRemove.forEach(pair => {
        if (productIds.includes(pair.productId)) {
          manufacturerNamesToRemove.add(pair.manufacturerName);
        }
      });

      if (manufacturerNamesToRemove.size > 0) {
        // Backup
        const backupPath = `${composeFile}.backup-conflict-resolve-${Date.now()}`;
        fs.copyFileSync(composeFile, backupPath);
        stats.backupsCreated++;

        // Filtrer manufacturer names
        const newManuNames = originalManuNames.filter(m =>
          !manufacturerNamesToRemove.has(m) && !manufacturerNamesToRemove.has(m.toLowerCase())
        );

        content.zigbee.manufacturerName = newManuNames;
        fs.writeFileSync(composeFile, JSON.stringify(content, null, 2), 'utf8');

        const removed = originalManuNames.length - newManuNames.length;
        stats.filesModified++;
        stats.pairsRemoved += removed;

        console.log(`   ✅ ${driverName}: ${originalManuNames.length} → ${newManuNames.length} (-${removed} conflits)`);
      }

    } catch (e) {
      console.error(`   ❌ ${driverName}:`, e.message);
    }
  });
}

// EXÉCUTION
console.log('📂 Chargement analyse conflits...\n');

if (!fs.existsSync(ANALYSIS_FILE)) {
  console.error('❌ Fichier FULL_RESTORATION_CONFLICTS_ANALYSIS.json non trouvé');
  console.error('   Exécutez d\'abord: node scripts/restore_all_and_verify_conflicts.js\n');
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
const conflicts = analysis.conflicts || [];

console.log(`📊 ${conflicts.length} conflits réels à résoudre\n`);

if (conflicts.length === 0) {
  console.log('✅ AUCUN CONFLIT À RÉSOUDRE!\n');
  process.exit(0);
}

console.log('🎯 Résolution conflits par priorité driver...\n');

const resolutions = resolveConflicts(conflicts);
stats.conflictsResolved = conflicts.length;

console.log('📋 TOP 20 RÉSOLUTIONS:\n');
resolutions.slice(0, 20).forEach(r => {
  console.log(`   ${r.manufacturerName} + ${r.productId}:`);
  console.log(`      ✅ GARDE: ${r.winner} (priorité ${r.winnerPriority})`);
  console.log(`      ❌ RETIRE: ${r.losers.join(', ')}`);
  console.log();
});

console.log('\n🔧 Application résolutions...\n');

applyResolutions(resolutions);

// RAPPORT
console.log('\n\n📊 RAPPORT RÉSOLUTION:\n');
console.log(`   Conflits résolus: ${stats.conflictsResolved}`);
console.log(`   Fichiers modifiés: ${stats.filesModified}`);
console.log(`   Paires retirées: ${stats.pairsRemoved}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

if (stats.filesModified > 0) {
  console.log('✅ CONFLITS RÉSOLUS\n');

  console.log('💡 STRATÉGIE APPLIQUÉE:');
  console.log('   - Driver le plus SPÉCIFIQUE garde la paire (manufacturerName, productId)');
  console.log('   - Sensors spécialisés > Switches > Plugs génériques');
  console.log('   - Exemple: climate_sensor garde, switch_1gang retire\n');

  console.log('🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Vérifier: node scripts/restore_all_and_verify_conflicts.js');
  console.log('   2. Valider: homey app validate --level publish');
  console.log('   3. Build: homey app build\n');
}

// Sauvegarder résolutions
const resolutionsFile = path.join(ROOT, 'CONFLICTS_RESOLUTIONS.json');
fs.writeFileSync(resolutionsFile, JSON.stringify(resolutions, null, 2), 'utf8');
console.log(`✅ Résolutions sauvegardées: ${resolutionsFile}\n`);

process.exit(0);
