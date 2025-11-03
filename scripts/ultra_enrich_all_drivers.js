#!/usr/bin/env node
'use strict';

/**
 * ULTRA ENRICH ALL DRIVERS
 * 
 * Enrichissement ultra-complet basé sur ClusterDPDatabase:
 * - Tous les clusters Zigbee standards
 * - Tous les DataPoints Tuya connus
 * - Capabilities complètes par type
 * - Settings avancés automatiques
 * - Flow cards complets
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('🚀 ULTRA ENRICHISSEMENT DE TOUS LES DRIVERS');
console.log('═══════════════════════════════════════════════════\n');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

// Backup
const backupPath = APP_JSON + '.backup-ultra-enrich';
fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2), 'utf8');
console.log(`✅ Backup: ${backupPath}\n`);

// ============================================================================
// CLUSTERS STANDARDS PAR TYPE DE DEVICE
// ============================================================================

const CLUSTER_MAPPINGS = {
  switch: [0, 3, 4, 5, 6],  // Basic, Identify, Groups, Scenes, OnOff
  dimmer: [0, 3, 4, 5, 6, 8],  // + Level Control
  light_color: [0, 3, 4, 5, 6, 8, 768],  // + Color Control
  sensor: [0, 1, 3],  // Basic, Power, Identify
  sensor_motion: [0, 1, 3, 1030],  // + Occupancy
  sensor_climate: [0, 1, 3, 1026, 1029],  // + Temperature, Humidity
  sensor_contact: [0, 1, 3, 1280],  // + IAS Zone
  plug: [0, 3, 4, 5, 6],  // Basic OnOff
  plug_energy: [0, 3, 4, 5, 6, 1794, 2820],  // + Metering, Electrical
  thermostat: [0, 3, 4, 5, 513],  // + Thermostat
  curtain: [0, 3, 4, 5, 258],  // + Window Covering
  lock: [0, 1, 3, 257]  // + Door Lock
};

// ============================================================================
// TUYA DPs PAR TYPE
// ============================================================================

const DP_MAPPINGS = {
  switch_1gang: [1, 7, 14, 16, 17, 19, 20],
  switch_2gang: [1, 2, 7, 8, 14, 16, 17, 19, 20],
  switch_3gang: [1, 2, 3, 7, 8, 9, 14, 16, 17, 19, 20],
  switch_4gang: [1, 2, 3, 4, 7, 8, 9, 10, 14, 16, 17, 19, 20],
  sensor_motion: [151, 152, 153, 154, 155, 14, 108],
  sensor_climate: [101, 102, 14, 108],
  sensor_air_quality: [101, 102, 103, 104, 105, 106, 107, 14],
  sensor_soil: [101, 102, 109, 14],
  sensor_contact: [161, 162, 14],
  sensor_water: [171, 172, 14],
  sensor_smoke: [181, 14],
  sensor_gas: [182, 183, 14],
  plug_energy: [1, 21, 22, 23, 24, 25],
  thermostat: [201, 202, 203, 204, 205],
  curtain: [1, 2, 3],
  lock: [1, 14, 20]
};

// ============================================================================
// CAPABILITIES COMPLÈTES PAR CLUSTER
// ============================================================================

const CLUSTER_TO_CAPABILITIES = {
  1: ['measure_battery'],  // Power Configuration
  6: ['onoff'],  // OnOff
  8: ['dim'],  // Level Control
  257: ['locked'],  // Door Lock
  258: ['windowcoverings_state', 'windowcoverings_set'],  // Window Covering
  513: ['target_temperature', 'thermostat_mode'],  // Thermostat
  768: ['light_hue', 'light_saturation', 'light_temperature'],  // Color Control
  1024: ['measure_luminance'],  // Illuminance
  1026: ['measure_temperature'],  // Temperature
  1029: ['measure_humidity'],  // Humidity
  1030: ['alarm_motion'],  // Occupancy
  1280: ['alarm_contact', 'alarm_tamper'],  // IAS Zone
  1794: ['meter_power'],  // Metering
  2820: ['measure_power', 'measure_voltage', 'measure_current']  // Electrical
};

// ============================================================================
// DP TO CAPABILITIES
// ============================================================================

const DP_TO_CAPABILITIES = {
  1: ['onoff'],
  4: ['measure_battery'],
  5: ['measure_voltage'],
  14: ['measure_battery'],
  21: ['measure_power'],
  22: ['measure_current'],
  23: ['measure_voltage'],
  24: ['meter_power'],
  101: ['measure_temperature'],
  102: ['measure_humidity'],
  103: ['measure_co2'],
  104: ['measure_voc'],
  105: ['measure_pm25'],
  106: ['measure_pm10'],
  108: ['measure_luminance'],
  109: ['measure_moisture'],
  151: ['alarm_motion'],
  152: ['alarm_motion'],
  161: ['alarm_contact'],
  171: ['alarm_water'],
  181: ['alarm_smoke'],
  182: ['alarm_gas'],
  201: ['target_temperature'],
  202: ['measure_temperature'],
  203: ['thermostat_mode']
};

// ============================================================================
// SETTINGS AVANCÉS PAR TYPE
// ============================================================================

const ADVANCED_SETTINGS = {
  switch: [
    {
      id: 'power_on_behavior',
      type: 'dropdown',
      label: { en: 'Power-on Behavior', fr: 'Comportement au démarrage' },
      value: 'last_state',
      values: [
        { id: 'off', label: { en: 'Always OFF' } },
        { id: 'on', label: { en: 'Always ON' } },
        { id: 'last_state', label: { en: 'Last State' } }
      ]
    },
    {
      id: 'led_indicator',
      type: 'dropdown',
      label: { en: 'LED Indicator', fr: 'Indicateur LED' },
      value: 'on_when_on',
      values: [
        { id: 'off', label: { en: 'Always OFF' } },
        { id: 'on', label: { en: 'Always ON' } },
        { id: 'on_when_on', label: { en: 'ON when device ON' } },
        { id: 'on_when_off', label: { en: 'ON when device OFF' } }
      ]
    },
    {
      id: 'child_lock',
      type: 'checkbox',
      label: { en: 'Child Lock', fr: 'Verrou enfant' },
      value: false
    }
  ],
  
  sensor: [
    {
      id: 'reporting_interval',
      type: 'number',
      label: { en: 'Reporting Interval (min)', fr: 'Intervalle rapport (min)' },
      value: 5,
      min: 1,
      max: 60,
      units: 'min'
    },
    {
      id: 'sensor_sensitivity',
      type: 'dropdown',
      label: { en: 'Sensitivity', fr: 'Sensibilité' },
      value: 'medium',
      values: [
        { id: 'low', label: { en: 'Low' } },
        { id: 'medium', label: { en: 'Medium' } },
        { id: 'high', label: { en: 'High' } }
      ]
    }
  ],
  
  thermostat: [
    {
      id: 'temperature_offset',
      type: 'number',
      label: { en: 'Temperature Offset (°C)', fr: 'Décalage température (°C)' },
      value: 0,
      min: -5,
      max: 5,
      step: 0.1,
      units: '°C'
    },
    {
      id: 'window_detection',
      type: 'checkbox',
      label: { en: 'Window Detection', fr: 'Détection fenêtre' },
      value: true
    },
    {
      id: 'frost_protection',
      type: 'checkbox',
      label: { en: 'Frost Protection', fr: 'Protection gel' },
      value: true
    }
  ],
  
  plug: [
    {
      id: 'power_threshold',
      type: 'number',
      label: { en: 'Power Threshold (W)', fr: 'Seuil puissance (W)' },
      value: 2000,
      min: 0,
      max: 5000,
      units: 'W'
    },
    {
      id: 'overload_protection',
      type: 'checkbox',
      label: { en: 'Overload Protection', fr: 'Protection surcharge' },
      value: true
    }
  ]
};

// ============================================================================
// FONCTION: ENRICHIR DRIVER
// ============================================================================

function enrichDriver(driver) {
  let modified = false;
  const driverType = detectDriverType(driver.id);
  
  console.log(`\n📱 Enriching: ${driver.id}`);
  console.log(`   Type: ${driverType}`);
  
  // 1. Enrichir clusters
  if (enrichClusters(driver, driverType)) {
    console.log(`   ✅ Clusters enriched`);
    modified = true;
  }
  
  // 2. Enrichir DPs Tuya
  if (enrichTuyaDPs(driver, driverType)) {
    console.log(`   ✅ Tuya DPs added`);
    modified = true;
  }
  
  // 3. Enrichir capabilities
  if (enrichCapabilities(driver, driverType)) {
    console.log(`   ✅ Capabilities enhanced`);
    modified = true;
  }
  
  // 4. Enrichir settings
  if (enrichSettings(driver, driverType)) {
    console.log(`   ✅ Settings enhanced`);
    modified = true;
  }
  
  // 5. Enrichir bindings
  if (enrichBindings(driver, driverType)) {
    console.log(`   ✅ Bindings added`);
    modified = true;
  }
  
  return modified;
}

function detectDriverType(driverId) {
  const id = driverId.toLowerCase();
  
  if (id.includes('switch') && id.includes('gang')) return 'switch_multigang';
  if (id.includes('switch') || id.includes('relay')) return 'switch';
  if (id.includes('dimmer')) return 'dimmer';
  if (id.includes('bulb') && (id.includes('rgb') || id.includes('color'))) return 'light_color';
  if (id.includes('bulb') || id.includes('light')) return 'light';
  if (id.includes('motion') || id.includes('pir') || id.includes('radar')) return 'sensor_motion';
  if (id.includes('climate') || id.includes('temp') && id.includes('humid')) return 'sensor_climate';
  if (id.includes('air') || id.includes('co2') || id.includes('voc')) return 'sensor_air_quality';
  if (id.includes('soil')) return 'sensor_soil';
  if (id.includes('contact') || id.includes('door')) return 'sensor_contact';
  if (id.includes('water') || id.includes('leak')) return 'sensor_water';
  if (id.includes('smoke')) return 'sensor_smoke';
  if (id.includes('gas')) return 'sensor_gas';
  if (id.includes('plug') && id.includes('energy')) return 'plug_energy';
  if (id.includes('plug') || id.includes('outlet') || id.includes('socket')) return 'plug';
  if (id.includes('thermostat') || id.includes('valve')) return 'thermostat';
  if (id.includes('curtain') || id.includes('blind') || id.includes('shutter')) return 'curtain';
  if (id.includes('lock')) return 'lock';
  if (id.includes('button') || id.includes('remote')) return 'button';
  if (id.includes('sensor')) return 'sensor';
  
  return 'other';
}

function enrichClusters(driver, type) {
  if (!driver.zigbee) driver.zigbee = {};
  if (!driver.zigbee.endpoints) driver.zigbee.endpoints = {};
  
  const baseClusters = CLUSTER_MAPPINGS[type] || CLUSTER_MAPPINGS[type.split('_')[0]] || [];
  
  if (baseClusters.length === 0) return false;
  
  let modified = false;
  
  // Endpoint 1 - principal
  if (!driver.zigbee.endpoints['1']) {
    driver.zigbee.endpoints['1'] = [];
  }
  
  if (!Array.isArray(driver.zigbee.endpoints['1'])) {
    driver.zigbee.endpoints['1'] = [];
  }
  
  for (const cluster of baseClusters) {
    if (!driver.zigbee.endpoints['1'].includes(cluster)) {
      driver.zigbee.endpoints['1'].push(cluster);
      modified = true;
    }
  }
  
  return modified;
}

function enrichTuyaDPs(driver, type) {
  const dps = DP_MAPPINGS[type];
  if (!dps) return false;
  
  if (!driver.zigbee) driver.zigbee = {};
  
  // Marquer comme device Tuya
  if (!driver.zigbee.tuyaDP) {
    driver.zigbee.tuyaDP = true;
    driver.zigbee.supportedDPs = dps;
    return true;
  }
  
  return false;
}

function enrichCapabilities(driver, type) {
  if (!driver.capabilities) driver.capabilities = [];
  
  let added = 0;
  
  // Ajouter capabilities depuis clusters
  if (driver.zigbee && driver.zigbee.endpoints) {
    const ep1 = driver.zigbee.endpoints['1'] || [];
    for (const cluster of ep1) {
      const caps = CLUSTER_TO_CAPABILITIES[cluster];
      if (caps) {
        for (const cap of caps) {
          if (!driver.capabilities.includes(cap)) {
            driver.capabilities.push(cap);
            added++;
          }
        }
      }
    }
  }
  
  // Ajouter capabilities depuis DPs Tuya
  if (driver.zigbee && driver.zigbee.supportedDPs) {
    for (const dp of driver.zigbee.supportedDPs) {
      const caps = DP_TO_CAPABILITIES[dp];
      if (caps) {
        for (const cap of caps) {
          if (!driver.capabilities.includes(cap)) {
            driver.capabilities.push(cap);
            added++;
          }
        }
      }
    }
  }
  
  return added > 0;
}

function enrichSettings(driver, type) {
  if (!driver.settings) driver.settings = [];
  
  const baseType = type.split('_')[0];
  const advSettings = ADVANCED_SETTINGS[baseType];
  
  if (!advSettings) return false;
  
  let added = 0;
  for (const setting of advSettings) {
    if (!driver.settings.find(s => s.id === setting.id)) {
      driver.settings.push(setting);
      added++;
    }
  }
  
  return added > 0;
}

function enrichBindings(driver, type) {
  if (!driver.zigbee) driver.zigbee = {};
  if (!driver.zigbee.bindings) driver.zigbee.bindings = {};
  
  // Bindings standards
  const standardBindings = {
    switch: [6, 25],  // OnOff, OTA
    sensor: [1, 25],  // Power, OTA
    plug: [6, 25, 1794, 2820],  // OnOff, OTA, Metering, Electrical
    thermostat: [513, 25]  // Thermostat, OTA
  };
  
  const baseType = type.split('_')[0];
  const bindings = standardBindings[baseType];
  
  if (!bindings) return false;
  
  if (!driver.zigbee.bindings['1']) {
    driver.zigbee.bindings['1'] = bindings;
    return true;
  }
  
  return false;
}

// ============================================================================
// TRAITER TOUS LES DRIVERS
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log(`ULTRA ENRICHING ${appJson.drivers.length} DRIVERS`);
console.log('═══════════════════════════════════════════════════');

let enriched = 0;
for (const driver of appJson.drivers) {
  if (enrichDriver(driver)) {
    enriched++;
  } else {
    console.log(`\n📱 ${driver.id}: Already optimal`);
  }
}

// ============================================================================
// SAUVEGARDER
// ============================================================================

fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ ULTRA ENRICHMENT COMPLETE');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Drivers enriched: ${enriched}/${appJson.drivers.length}`);
console.log(`Total drivers: ${appJson.drivers.length}`);
console.log(`\nBackup: ${backupPath}\n`);

console.log('Enrichments applied:');
console.log('  ✅ Standard Zigbee clusters');
console.log('  ✅ Tuya DataPoints (DP)');
console.log('  ✅ Complete capabilities');
console.log('  ✅ Advanced settings');
console.log('  ✅ Cluster bindings');
console.log('');
