#!/usr/bin/env node
'use strict';

/**
 * P24.8 — Smart Device Discovery (heuristic capability detection)
 *
 * For devices with unknown mfr+pid (not in mfs_db), this tool helps:
 * 1. Discover the device's exposed Zigbee clusters via the join interview
 * 2. Infer capabilities from cluster data
 * 3. Match against known driver patterns (best-fit)
 * 4. Generate a 'discovery profile' that can be used to create a new driver
 *
 * The actual capability detection happens at runtime in the device,
 * but this tool helps us document the heuristics.
 *
 * Output: tools/ci/smart-discovery-heuristics.json
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const LIB_DIR = 'C:/Users/Dell/Documents/homey/master/lib';

// Common Zigbee clusters and their capability mappings
const CLUSTER_TO_CAPABILITY = {
  // On/Off (0x0006)
  0x0006: {
    name: 'OnOff',
    capabilities: ['onoff'],
    triggers: ['turned_on', 'turned_off'],
    actions: ['turn_on', 'turn_off', 'toggle'],
  },
  // Level Control (0x0008) - dimming
  0x0008: {
    name: 'LevelControl',
    capabilities: ['dim'],
    range: { min: 0, max: 1, step: 0.01 },
    actions: ['set_dim', 'dim_up', 'dim_down'],
  },
  // Color Control (0x0300)
  0x0300: {
    name: 'ColorControl',
    capabilities: ['light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
    range: { hue: { min: 0, max: 360 }, saturation: { min: 0, max: 1 }, temperature: { min: 0, max: 1 } },
  },
  // Temperature Measurement (0x0402)
  0x0402: {
    name: 'TemperatureMeasurement',
    capabilities: ['measure_temperature'],
    range: { min: -40, max: 125, unit: '°C' },
    triggers: ['temperature_changed'],
  },
  // Humidity Measurement (0x0405)
  0x0405: {
    name: 'RelativeHumidity',
    capabilities: ['measure_humidity'],
    range: { min: 0, max: 100, unit: '%' },
  },
  // Illuminance Measurement (0x0400)
  0x0400: {
    name: 'IlluminanceMeasurement',
    capabilities: ['measure_luminance', 'measure_illuminance'],
    range: { min: 0, max: 100000, unit: 'lux' },
  },
  // Occupancy (0x0406)
  0x0406: {
    name: 'OccupancySensing',
    capabilities: ['alarm_motion', 'alarm_occupancy'],
  },
  // IAS Zone (0x0500) - security sensors
  0x0500: {
    name: 'IasZone',
    capabilities: ['alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke', 'alarm_co', 'alarm_battery'],
    // Type-specific detection needed
  },
  // Power Configuration (0x0001)
  0x0001: {
    name: 'PowerConfiguration',
    capabilities: ['measure_battery', 'alarm_battery'],
  },
  // Thermostat (0x0201)
  0x0201: {
    name: 'Thermostat',
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
    range: { min: 5, max: 35, unit: '°C' },
  },
  // Electrical Measurement (0x0B04)
  0x0B04: {
    name: 'ElectricalMeasurement',
    capabilities: ['measure_power', 'measure_voltage', 'measure_current'],
  },
  // Window Covering (0x0102)
  0x0102: {
    name: 'WindowCovering',
    capabilities: ['windowcoverings_state', 'windowcoverings_set'],
    range: { min: 0, max: 100, unit: '%' },
  },
};

// Capability type inference rules
const TYPE_INFERENCE = {
  // If device exposes onoff + dim, it's likely a dimmable light
  onoff_dim: { driverType: 'light', subType: 'dimmable' },
  // If onoff + dim + color, it's a smart bulb
  onoff_dim_color: { driverType: 'light', subType: 'rgbw' },
  // If measure_temperature + measure_humidity, it's a climate sensor
  measure_temp_hum: { driverType: 'sensor', subType: 'climate' },
  // If alarm_motion, it's a motion sensor
  alarm_motion: { driverType: 'sensor', subType: 'motion' },
  // If alarm_contact, it's a door/window sensor
  alarm_contact: { driverType: 'sensor', subType: 'contact' },
  // If measure_power, it's a smart plug
  onoff_measure_power: { driverType: 'plug', subType: 'energy_monitor' },
  // If onoff without dim, it's a basic switch
  onoff_only: { driverType: 'switch', subType: '1gang' },
  // If thermostat, it's a TRV
  thermostat: { driverType: 'radiator_valve', subType: 'thermostatic' },
  // If window covering
  window_covering: { driverType: 'cover', subType: 'curtain' },
};

// Build the heuristics document
const heuristics = {
  meta: {
    generatedAt: new Date().toISOString(),
    description: 'Smart device discovery heuristics for unknown Tuya devices',
    clusterCount: Object.keys(CLUSTER_TO_CAPABILITY).length,
    inferenceRuleCount: Object.keys(TYPE_INFERENCE).length,
  },
  clusterMap: CLUSTER_TO_CAPABILITY,
  typeInference: TYPE_INFERENCE,
  implementation: {
    location: 'lib/discovery/HeuristicDevice.js (TODO)',
    description: `
When a device joins with unknown mfr+pid, the smart discovery module:

1. Listens to the standard ZCL interview (zclNode.endpoints)
2. For each endpoint, collects supported clusters (inClusters + outClusters)
3. For each supported cluster, looks up CLUSTER_TO_CAPABILITY to find capabilities
4. Combines all capabilities into a 'capability set'
5. Uses TYPE_INFERENCE rules to determine device type (light/sensor/plug/etc.)
6. Logs the discovery profile to diagnostic dumps
7. Exposes the inferred capabilities as a virtual device (UniversalZigbeeDevice)

This allows the app to handle ANY Tuya device, even if not in mfs_db.

The actual implementation should:
- Listen to zclNode 'interview' or 'ready' event
- Iterate endpoints and clusters
- Build a capability set
- Add capabilities via this.addCapability() if supported by the cluster
- If the cluster has settable values, also add action handlers
`,
  },
  sampleFlows: {
    'Motion sensor (TS0202)': {
      clusters: [0x0000, 0x0001, 0x0003, 0x0406],
      inferredCapabilities: ['alarm_motion', 'measure_battery'],
      deviceType: 'sensor_motion',
      bestDriverMatch: 'motion_sensor',
    },
    'Smart bulb (TS0505B)': {
      clusters: [0x0000, 0x0003, 0x0004, 0x0005, 0x0006, 0x0008, 0x0300],
      inferredCapabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
      deviceType: 'light_rgbw',
      bestDriverMatch: 'bulb_rgbw_universal',
    },
    'Climate sensor (TS0201)': {
      clusters: [0x0000, 0x0001, 0x0003, 0x0402, 0x0405],
      inferredCapabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      deviceType: 'sensor_climate',
      bestDriverMatch: 'sensor_climate_temphumidsensor',
    },
    'Smart plug (TS011F)': {
      clusters: [0x0000, 0x0003, 0x0004, 0x0005, 0x0006, 0x0B04],
      inferredCapabilities: ['onoff', 'measure_power', 'measure_voltage', 'measure_current'],
      deviceType: 'plug_energy',
      bestDriverMatch: 'plug_energy_monitor',
    },
  },
};

fs.writeFileSync(path.join(STATE_DIR, 'smart-discovery-heuristics.json'), JSON.stringify(heuristics, null, 2));

console.log('=== Smart Device Discovery Heuristics ===');
console.log(`Clusters mapped: ${Object.keys(CLUSTER_TO_CAPABILITY).length}`);
console.log(`Type inference rules: ${Object.keys(TYPE_INFERENCE).length}`);
console.log(`Sample flows: ${Object.keys(heuristics.sampleFlows).length}`);
console.log(`Output: ${path.join(STATE_DIR, 'smart-discovery-heuristics.json')}`);
console.log('\nKey insight: ANY Tuya device can be handled via cluster-based heuristic discovery');
console.log('even if not in our driver mappings.');
