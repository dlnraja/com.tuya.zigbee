#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION FINALE - 15 MANUFACTURER IDs DUPLIQUÉS\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Duplicates à corriger avec décision intelligente
const FIXES = {
  '_TZ3210_pagajpog': {
    keep: 'bulb_rgbw',
    remove: ['dimmer_dual_channel'],
    reason: 'RGBW bulb, pas dimmer'
  },
  '_TZ3000_0ghwhypc': {
    keep: 'climate_sensor',
    remove: ['switch_1gang'],
    reason: 'Climate sensor ID'
  },
  '_TZ3000_0hkmcrza': {
    keep: 'climate_sensor',
    remove: ['plug_smart'],
    reason: 'Climate sensor ID'
  },
  '_TZ3000_7ysdnebc': {
    keep: 'dimmer_dual_channel',
    remove: ['dimmer_wall_1gang'],
    reason: 'Dual channel spécifique'
  },
  '_TZE204_ikvncluo': {
    keep: 'ir_blaster',
    remove: ['presence_sensor_radar', 'water_tank_monitor'],
    reason: 'IR blaster spécifique'
  },
  '_TZ3000_18ejxno0': {
    keep: 'plug_smart',
    remove: ['switch_1gang'],
    reason: 'Plug spécifique'
  },
  '_TZE200_aoclfnxz': {
    keep: 'radiator_valve',
    remove: ['smart_heater_controller'],
    reason: 'Radiator valve TRV'
  },
  '_TZE200_b6wax7g0': {
    keep: 'radiator_valve',
    remove: ['smart_heater_controller'],
    reason: 'Radiator valve TRV'
  },
  '_TZE200_c88teujp': {
    keep: 'radiator_valve',
    remove: ['smart_heater_controller'],
    reason: 'Radiator valve TRV'
  },
  '_TZE200_hue3yfsn': {
    keep: 'radiator_valve',
    remove: ['smart_heater_controller'],
    reason: 'Radiator valve TRV'
  },
  '_TZE204_aoclfnxz': {
    keep: 'radiator_valve',
    remove: ['smart_heater_controller'],
    reason: 'Radiator valve TRV'
  },
  '_TZ3000_excgg5kb': {
    keep: 'switch_3gang',
    remove: ['switch_4gang'],
    reason: '3-gang spécifique'
  },
  '_TZE284_c8ipbljq': {
    keep: 'switch_wall_6gang',
    remove: ['switch_3gang'],
    reason: '6-gang wall switch'
  },
  '_TZE200_81isopgh': {
    keep: 'water_valve_smart',
    remove: ['water_tank_monitor'],
    reason: 'Water valve actuator'
  },
  '_TZE200_htnnfasr': {
    keep: 'water_valve_smart',
    remove: ['water_tank_monitor'],
    reason: 'Water valve actuator'
  }
};

let stats = {
  filesModified: 0,
  idsRemoved: 0,
  backups: 0
};

/**
 * Supprimer manufacturer ID d'un driver
 */
function removeManufacturerId(driverName, manufacturerId) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(composeFile)) {
    console.log(`   ⚠️  ${driverName}/driver.compose.json non trouvé`);
    return false;
  }

  try {
    const content = fs.readFileSync(composeFile, 'utf8');
    const driver = JSON.parse(content);

    if (!driver.zigbee || !driver.zigbee.manufacturerName) {
      return false;
    }

    const originalIds = driver.zigbee.manufacturerName;
    const filteredIds = originalIds.filter(id => id !== manufacturerId);

    if (filteredIds.length === originalIds.length) {
      // ID pas trouvé
      return false;
    }

    // Backup
    const backupPath = `${composeFile}.backup-final-${Date.now()}`;
    fs.copyFileSync(composeFile, backupPath);
    stats.backups++;

    // Sauvegarder
    driver.zigbee.manufacturerName = filteredIds;
    fs.writeFileSync(composeFile, JSON.stringify(driver, null, 2), 'utf8');

    stats.filesModified++;
    stats.idsRemoved++;

    console.log(`   ✅ ${driverName}: supprimé ${manufacturerId}`);
    return true;

  } catch (e) {
    console.error(`   ❌ Erreur ${driverName}:`, e.message);
    return false;
  }
}

// EXÉCUTION
console.log('🎯 Application des corrections...\n');

Object.entries(FIXES).forEach(([manufacturerId, config]) => {
  console.log(`\n📦 ${manufacturerId}`);
  console.log(`   Raison: ${config.reason}`);
  console.log(`   Garder: ${config.keep}`);
  console.log(`   Supprimer de: ${config.remove.join(', ')}`);

  config.remove.forEach(driverName => {
    removeManufacturerId(driverName, manufacturerId);
  });
});

// Product IDs à examiner
console.log('\n\n⚠️  PRODUCT IDs À EXAMINER MANUELLEMENT:\n');
console.log('   TS0207: rain_sensor vs water_leak_sensor');
console.log('      → Vérifier si même device ou variants');
console.log('   TS0013: switch_1gang vs switch_3gang');
console.log('      → Probablement légitime (différentes configurations)');
console.log('   TS0014: switch_1gang vs switch_4gang');
console.log('      → Probablement légitime (différentes configurations)\n');

console.log('\n📊 RAPPORT CORRECTIONS:\n');
console.log(`   Fichiers modifiés: ${stats.filesModified}`);
console.log(`   IDs supprimés: ${stats.idsRemoved}`);
console.log(`   Backups créés: ${stats.backups}\n`);

if (stats.filesModified > 0) {
  console.log('✅ CORRECTIONS APPLIQUÉES\n');
  console.log('🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Relancer audit: node scripts/audit_complete_advanced.js');
  console.log('   2. Valider: homey app validate --level publish');
  console.log('   3. Build: homey app build\n');
}

process.exit(0);
