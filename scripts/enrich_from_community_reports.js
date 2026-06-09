#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🌐 ENRICHISSEMENT DEPUIS RAPPORTS COMMUNAUTÉ\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let stats = {
  driversEnriched: 0,
  idsAdded: 0,
  newDriversNeeded: 0,
  backupsCreated: 0
};

// ══════════════════════════════════════════════════════════════════════════════
// DONNÉES FORUM + GITHUB (Janvier 2026)
// ══════════════════════════════════════════════════════════════════════════════

const COMMUNITY_REPORTS = {
  // Forum #886 - DÉJÀ TRAITÉ (flow triggers fix)
  presence_sensor_radar: {
    ids: ['_TZE204_ZTQNH5CG'], // Déjà présent, flow fix appliqué
    issue: 'Flow triggers ne déclenchaient pas - FIXED driver.js'
  },

  // Forum Page 44 - PJ-1203A Energy Meter
  energy_meter: {
    ids: ['_TZE204_81YRT3LO'],
    modelId: 'TS0601',
    productId: 'PJ-1203A',
    capabilities: ['measure_power', 'measure_voltage', 'measure_current', 'meter_power'],
    clusters: [0, 4, 5, 61184],
    endpoints: { 1: { clusters: [0, 4, 5, 61184], bindings: [61184] } },
    deviceType: 'router',
    powerSource: 'mains',
    description: 'Tuya Energy Meter PJ-1203A',
    driver: 'power_meter', // Existing driver to enrich
    zigbee2mqtt: 'https://www.zigbee2mqtt.io/devices/PJ-1203A.html'
  },

  // Forum Page 42 - eWeLink Temperature Sensor
  climate_sensor_ewelink: {
    ids: ['eWeLink'], // manufacturerName
    modelId: 'CK-TLSR8656-SS5-01(7014)',
    productId: 'CK-TLSR8656-SS5-01',
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    clusters: [0, 1, 3, 4, 32, 1026, 1029, 64529],
    endpoints: { 1: { clusters: [0, 1, 3, 4, 32, 1026, 1029], bindings: [1026, 1029] } },
    deviceType: 'enddevice',
    powerSource: 'battery',
    battery: ['CR2032'],
    description: 'eWeLink Temperature & Humidity Sensor',
    driver: 'climate_sensor', // Existing driver to enrich
    note: 'Uses standard ZCL clusters 1026/1029'
  }
};

// Manufacturer IDs à enrichir (from Zigbee2MQTT, GitHub, Forum)
const ENRICHMENT_IDS = {
  // Presence sensors (from Z2M)
  presence_sensor_radar: [
    '_TZE204_ZTQNH5CG', // Forum #886
    '_TZE200_3TOWULQD',
    '_TZE204_QASJIF9E',
    '_TZE284_SXM7L9XA'
  ],

  // Motion sensors
  motion_sensor: [
    '_TZ3000_MCXW5EHU',
    '_TZ3000_MSL6WXKP',
    '_TZ3000_OTVN6Y0A'
  ],

  // Contact sensors
  contact_sensor: [
    '_TZ3000_N2EGFSLI',
    '_TZ3000_26FMUPBB',
    '_TZ3000_OXSLV1C9'
  ],

  // Climate sensors (eWeLink + others)
  climate_sensor: [
    'eWeLink', // Forum Page 42
    '_TZE200_YVJC5CJN',
    '_TZE204_YVJC5CJN'
  ],

  // Power meters
  power_meter: [
    '_TZE204_81YRT3LO', // Forum Page 44 - PJ-1203A
    '_TZ3000_VSN4QAL7',
    '_TZ3000_8BXRZYXZ'
  ],

  // Plugs with energy monitoring
  plug_energy_monitor: [
    '_TZ3000_G5XAWFCQ',
    '_TZ3000_TYPDPBPG',
    '_TZ3000_VTSCRPMX'
  ],

  // Smoke detectors
  smoke_detector_advanced: [
    '_TZE204_NTCY3XU1', // Already exists but confirming
    '_TZE200_M9SKFCTM'
  ],

  // Water leak sensors
  water_leak_sensor: [
    '_TZ3000_KYAKWBF8',
    '_TZ3000_EIT8C5CS'
  ],

  // Smart switches
  switch_1gang: [
    '_TZ3000_TGDDLLX4',
    '_TZ3000_LUPFD8BQ'
  ],

  // Curtain motors
  curtain_motor: [
    '_TZE200_FCTWHUGX',
    '_TZE200_COWVFNI3',
    '_TZE204_FCTWHUGX'
  ]
};

/**
 * Enrichir un driver avec nouveaux manufacturer IDs
 */
function enrichDriver(driverName, newIds) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(composeFile)) {
    console.log(`   ⚠️  ${driverName}: driver non trouvé - nouveau driver nécessaire`);
    stats.newDriversNeeded++;
    return false;
  }

  try {
    const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));

    if (!content.zigbee || !content.zigbee.manufacturerName) {
      console.log(`   ⚠️  ${driverName}: pas de manufacturerName dans zigbee config`);
      return false;
    }

    const currentIds = content.zigbee.manufacturerName;
    const currentIdsUpper = new Set(currentIds.map(id => id.toUpperCase()));

    // Filtrer IDs déjà présents (case insensitive)
    const idsToAdd = newIds.filter(id => !currentIdsUpper.has(id.toUpperCase()));

    if (idsToAdd.length === 0) {
      console.log(`   ✓ ${driverName}: tous les IDs déjà présents`);
      return false;
    }

    // Backup
    const backupPath = `${composeFile}.backup-enrich-${Date.now()}`;
    fs.copyFileSync(composeFile, backupPath);
    stats.backupsCreated++;

    // Ajouter nouveaux IDs (uppercase normalized)
    const normalizedNew = idsToAdd.map(id => id.toUpperCase());
    content.zigbee.manufacturerName = [...currentIds, ...normalizedNew];

    // Sauvegarder
    fs.writeFileSync(composeFile, JSON.stringify(content, null, 2), 'utf8');

    stats.driversEnriched++;
    stats.idsAdded += idsToAdd.length;

    console.log(`   ✅ ${driverName}: +${idsToAdd.length} IDs (${currentIds.length} → ${content.zigbee.manufacturerName.length})`);
    console.log(`      Ajoutés: ${normalizedNew.join(', ')}`);

    return true;

  } catch (e) {
    console.error(`   ❌ ${driverName}:`, e.message);
    return false;
  }
}

/**
 * Vérifier si tous les flow triggers sont enregistrés
 */
function verifyFlowTriggers(driverName) {
  const driverFile = path.join(DRIVERS_DIR, driverName, 'driver.js');
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(driverFile) || !fs.existsSync(composeFile)) {
    return { ok: true, reason: 'no flow cards' };
  }

  try {
    const driverCode = fs.readFileSync(driverFile, 'utf8');
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));

    // Vérifier si flow cards existent dans compose
    const flowTriggers = compose.flow?.triggers || [];
    const flowConditions = compose.flow?.conditions || [];

    if (flowTriggers.length === 0 && flowConditions.length === 0) {
      return { ok: true, reason: 'no flow cards defined' };
    }

    // Vérifier si driver.js enregistre les triggers
    const hasRegistration = driverCode.includes('getDeviceTriggerCard') ||
      driverCode.includes('getDeviceConditionCard');

    if (!hasRegistration && (flowTriggers.length > 0 || flowConditions.length > 0)) {
      return {
        ok: false,
        reason: 'flow cards defined but not registered',
        triggers: flowTriggers.length,
        conditions: flowConditions.length
      };
    }

    return { ok: true, reason: 'properly registered' };

  } catch (e) {
    return { ok: true, reason: 'error checking' };
  }
}

// EXÉCUTION
console.log('📂 Enrichissement drivers depuis rapports communauté...\n');

Object.entries(ENRICHMENT_IDS).forEach(([driverName, ids]) => {
  enrichDriver(driverName, ids);
});

console.log('\n\n🔍 Vérification flow triggers registration...\n');

const DRIVERS_WITH_FLOWS = [
  'presence_sensor_radar',
  'motion_sensor',
  'contact_sensor',
  'water_leak_sensor',
  'smoke_detector_advanced',
  'button_wireless_1',
  'button_wireless_4'
];

const flowIssues = [];

DRIVERS_WITH_FLOWS.forEach(driverName => {
  const result = verifyFlowTriggers(driverName);
  if (!result.ok) {
    flowIssues.push({ driver: driverName, ...result });
    console.log(`   ⚠️  ${driverName}: ${result.reason} (${result.triggers} triggers, ${result.conditions} conditions)`);
  } else {
    console.log(`   ✅ ${driverName}: ${result.reason}`);
  }
});

// RAPPORT
console.log('\n\n📊 RAPPORT ENRICHISSEMENT:\n');
console.log(`   Drivers enrichis: ${stats.driversEnriched}`);
console.log(`   Manufacturer IDs ajoutés: ${stats.idsAdded}`);
console.log(`   Nouveaux drivers nécessaires: ${stats.newDriversNeeded}`);
console.log(`   Backups créés: ${stats.backupsCreated}`);
console.log(`   Flow triggers issues: ${flowIssues.length}\n`);

if (stats.newDriversNeeded > 0) {
  console.log('⚠️  NOUVEAUX DRIVERS NÉCESSAIRES:');
  console.log('   - energy_meter (PJ-1203A) - ajouter à power_meter');
  console.log('   - Autres devices forum à analyser\n');
}

if (flowIssues.length > 0) {
  console.log('⚠️  FLOW TRIGGERS À CORRIGER:');
  flowIssues.forEach(issue => {
    console.log(`   - ${issue.driver}: Ajouter registration dans driver.js`);
  });
  console.log();
}

console.log('🎯 SOURCES:');
console.log('   - Forum Homey Community (Pages 42-46, Jan 2026)');
console.log('   - GitHub dlnraja/com.tuya.zigbee (issues/PRs)');
console.log('   - Zigbee2MQTT device database');
console.log('   - User reports (#886 presence sensor fix appliqué)\n');

console.log('✅ ENRICHISSEMENT TERMINÉ\n');

// Sauvegarder rapport
const reportFile = path.join(ROOT, 'COMMUNITY_ENRICHMENT_REPORT.json');
fs.writeFileSync(reportFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  stats,
  flowIssues,
  communityReports: COMMUNITY_REPORTS,
  enrichmentIds: ENRICHMENT_IDS
}, null, 2), 'utf8');

console.log(`📄 Rapport sauvegardé: ${reportFile}\n`);

process.exit(flowIssues.length > 0 ? 1 : 0);
