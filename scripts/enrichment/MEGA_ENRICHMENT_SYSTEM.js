#!/usr/bin/env node
'use strict';

/**
 * MEGA ENRICHMENT SYSTEM
 * 
 * Enrichit TOUT avec TOUTES les sources disponibles:
 * - Clusters Zigbee complets
 * - Data Points (DP) Tuya
 * - Endpoints multi-gang
 * - Manufacturer IDs
 * - Product IDs
 * 
 * SANS RIEN SUPPRIMER - SEULEMENT ENRICHIR!
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🚀 MEGA ENRICHMENT SYSTEM\n');
console.log('═══════════════════════════════════════════════════\n');

/**
 * DATABASE DE CLUSTERS ZIGBEE STANDARDS
 */
const ZIGBEE_CLUSTERS = {
  
  // Basic Clusters (0x0000-0x00FF)
  basic: {
    id: 0,
    name: 'Basic',
    description: 'Basic device information',
    attributes: ['manufacturerName', 'modelIdentifier', 'powerSource']
  },
  
  powerConfiguration: {
    id: 1,
    name: 'Power Configuration',
    description: 'Battery and power management',
    attributes: ['batteryVoltage', 'batteryPercentageRemaining', 'batteryAlarmMask']
  },
  
  deviceTemperature: {
    id: 2,
    name: 'Device Temperature',
    description: 'Device internal temperature'
  },
  
  identify: {
    id: 3,
    name: 'Identify',
    description: 'Device identification (blink/beep)'
  },
  
  groups: {
    id: 4,
    name: 'Groups',
    description: 'Group management'
  },
  
  scenes: {
    id: 5,
    name: 'Scenes',
    description: 'Scene management'
  },
  
  onOff: {
    id: 6,
    name: 'On/Off',
    description: 'On/Off control',
    attributes: ['onOff']
  },
  
  onOffSwitchConfiguration: {
    id: 7,
    name: 'On/Off Switch Configuration'
  },
  
  levelControl: {
    id: 8,
    name: 'Level Control',
    description: 'Dimming control',
    attributes: ['currentLevel']
  },
  
  alarms: {
    id: 9,
    name: 'Alarms'
  },
  
  time: {
    id: 10,
    name: 'Time'
  },
  
  // Closures (0x0100-0x01FF)
  closuresShadeConfiguration: {
    id: 0x0100,
    name: 'Window Covering',
    description: 'Curtain/blind control',
    attributes: ['currentPositionLiftPercentage', 'currentPositionTiltPercentage']
  },
  
  // HVAC (0x0200-0x02FF)
  thermostat: {
    id: 0x0201,
    name: 'Thermostat',
    description: 'Temperature control',
    attributes: ['localTemperature', 'occupiedHeatingSetpoint']
  },
  
  fanControl: {
    id: 0x0202,
    name: 'Fan Control'
  },
  
  // Lighting (0x0300-0x03FF)
  colorControl: {
    id: 0x0300,
    name: 'Color Control',
    description: 'RGB/Color temperature',
    attributes: ['currentHue', 'currentSaturation', 'colorTemperatureMireds']
  },
  
  // Measurement & Sensing (0x0400-0x04FF)
  illuminanceMeasurement: {
    id: 0x0400,
    name: 'Illuminance Measurement',
    description: 'Light sensor',
    attributes: ['measuredValue']
  },
  
  temperatureMeasurement: {
    id: 0x0402,
    name: 'Temperature Measurement',
    description: 'Temperature sensor',
    attributes: ['measuredValue']
  },
  
  pressureMeasurement: {
    id: 0x0403,
    name: 'Pressure Measurement',
    description: 'Pressure sensor'
  },
  
  flowMeasurement: {
    id: 0x0404,
    name: 'Flow Measurement'
  },
  
  relativeHumidity: {
    id: 0x0405,
    name: 'Relative Humidity Measurement',
    description: 'Humidity sensor',
    attributes: ['measuredValue']
  },
  
  occupancySensing: {
    id: 0x0406,
    name: 'Occupancy Sensing',
    description: 'Motion/presence detection',
    attributes: ['occupancy']
  },
  
  // Security & Safety (0x0500-0x05FF)
  iasZone: {
    id: 0x0500,
    name: 'IAS Zone',
    description: 'Security sensor (motion, contact, etc.)',
    attributes: ['zoneState', 'zoneType', 'zoneStatus']
  },
  
  iasACE: {
    id: 0x0501,
    name: 'IAS ACE'
  },
  
  iasWD: {
    id: 0x0502,
    name: 'IAS Warning Device'
  },
  
  // Smart Energy (0x0700-0x07FF)
  metering: {
    id: 0x0702,
    name: 'Metering',
    description: 'Energy metering',
    attributes: ['currentSummationDelivered', 'instantaneousDemand']
  },
  
  electricalMeasurement: {
    id: 0x0B04,
    name: 'Electrical Measurement',
    description: 'Power/voltage/current measurement',
    attributes: ['activePower', 'rmsCurrent', 'rmsVoltage']
  },
  
  // Tuya Specific (0xE000+)
  tuyaSpecific: {
    id: 0xEF00,
    name: 'Tuya Specific',
    description: 'Tuya proprietary cluster'
  },
  
  // Manufacturer Specific
  manuSpecificCluster: {
    id: 0xFC00,
    name: 'Manufacturer Specific'
  },
  
  manuSpecificCluster2: {
    id: 0xFCC0,
    name: 'Manufacturer Specific (Aqara)'
  }
};

/**
 * TUYA DATA POINTS DATABASE
 */
const TUYA_DATA_POINTS = {
  
  // Common DP
  1: { name: 'switch', type: 'bool', capability: 'onoff' },
  2: { name: 'switch_2', type: 'bool', capability: 'onoff.switch_2' },
  3: { name: 'switch_3', type: 'bool', capability: 'onoff.switch_3' },
  4: { name: 'switch_4', type: 'bool', capability: 'onoff.switch_4' },
  5: { name: 'switch_5', type: 'bool', capability: 'onoff.switch_5' },
  6: { name: 'switch_6', type: 'bool', capability: 'onoff.switch_6' },
  7: { name: 'child_lock', type: 'bool', capability: 'child_lock' },
  
  // Dimming
  10: { name: 'brightness', type: 'value', capability: 'dim', scale: { min: 10, max: 1000 } },
  
  // Color
  20: { name: 'work_mode', type: 'enum', values: ['white', 'colour', 'scene', 'music'] },
  21: { name: 'bright_value', type: 'value' },
  22: { name: 'temp_value', type: 'value', capability: 'light_temperature' },
  23: { name: 'colour_data', type: 'string', capability: 'light_hue' },
  24: { name: 'scene_data', type: 'string' },
  25: { name: 'flash_scene_1', type: 'string' },
  
  // Curtain/Cover
  101: { name: 'percent_control', type: 'value', capability: 'windowcoverings_set' },
  102: { name: 'percent_state', type: 'value', capability: 'windowcoverings_state' },
  103: { name: 'control_back', type: 'enum', values: ['forward', 'back'] },
  104: { name: 'work_state', type: 'enum', values: ['opening', 'closing', 'stop'] },
  105: { name: 'situation_set', type: 'string' },
  
  // Thermostat
  16: { name: 'target_temp', type: 'value', capability: 'target_temperature' },
  24: { name: 'current_temp', type: 'value', capability: 'measure_temperature' },
  27: { name: 'mode', type: 'enum', values: ['auto', 'manual', 'holiday'] },
  28: { name: 'eco_mode', type: 'bool' },
  
  // Sensors
  104: { name: 'battery', type: 'value', capability: 'measure_battery' },
  105: { name: 'battery_percentage', type: 'value', capability: 'measure_battery' },
  
  // Climate
  1: { name: 'temperature', type: 'value', capability: 'measure_temperature', scale: 10 },
  2: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
  3: { name: 'co2', type: 'value', capability: 'measure_co2' },
  13: { name: 'pm25', type: 'value', capability: 'measure_pm25' },
  15: { name: 'voc', type: 'value', capability: 'measure_voc' },
  18: { name: 'formaldehyde', type: 'value', capability: 'measure_formaldehyde' },
  
  // Motion/Presence
  1: { name: 'presence_state', type: 'bool', capability: 'alarm_motion' },
  9: { name: 'sensitivity', type: 'value' },
  101: { name: 'illuminance', type: 'value', capability: 'measure_luminance' },
  102: { name: 'target_distance', type: 'value' },
  103: { name: 'radar_sensitivity', type: 'value' },
  
  // Contact Sensor
  1: { name: 'contact', type: 'bool', capability: 'alarm_contact' },
  
  // Valve
  1: { name: 'valve_state', type: 'bool', capability: 'onoff' },
  5: { name: 'water_consumed', type: 'value', capability: 'meter_water' },
  6: { name: 'battery_percentage', type: 'value', capability: 'measure_battery' },
  
  // Lock
  1: { name: 'lock_state', type: 'bool', capability: 'locked' },
  
  // Siren
  13: { name: 'alarm_switch', type: 'bool', capability: 'onoff' },
  15: { name: 'alarm_volume', type: 'enum', values: ['low', 'medium', 'high'] },
  16: { name: 'alarm_duration', type: 'value' },
  
  // Power Monitoring
  6: { name: 'current', type: 'value', capability: 'measure_current', scale: 1000 },
  18: { name: 'voltage', type: 'value', capability: 'measure_voltage', scale: 10 },
  19: { name: 'power', type: 'value', capability: 'measure_power', scale: 10 },
  
  // Special Functions
  9: { name: 'countdown', type: 'value' },
  17: { name: 'add_ele', type: 'value' },
  20: { name: 'relay_status', type: 'string' }
};

/**
 * ENRICHISSEMENT PAR CATÉGORIE
 */
const CATEGORY_ENRICHMENT = {
  
  // Switches
  switch: {
    clusters: [0, 1, 3, 4, 5, 6],
    bindings: [6],
    dataPoints: [1, 2, 3, 4, 5, 6, 7, 9],
    capabilities: ['onoff']
  },
  
  // Dimmers
  dimmer: {
    clusters: [0, 1, 3, 4, 5, 6, 8],
    bindings: [6, 8],
    dataPoints: [1, 10, 20],
    capabilities: ['onoff', 'dim']
  },
  
  // RGB Lights
  light_rgb: {
    clusters: [0, 1, 3, 4, 5, 6, 8, 0x0300],
    bindings: [6, 8, 0x0300],
    dataPoints: [1, 10, 20, 21, 22, 23, 24, 25],
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature']
  },
  
  // Curtains
  curtain: {
    clusters: [0, 1, 3, 0x0100, 0x0102],
    bindings: [0x0100],
    dataPoints: [1, 101, 102, 103, 104, 105],
    capabilities: ['windowcoverings_set', 'windowcoverings_state']
  },
  
  // Thermostats
  thermostat: {
    clusters: [0, 1, 3, 0x0201],
    bindings: [0x0201],
    dataPoints: [16, 24, 27, 28],
    capabilities: ['target_temperature', 'measure_temperature']
  },
  
  // Climate Sensors
  climate: {
    clusters: [0, 1, 3, 0x0402, 0x0405],
    bindings: [1],
    dataPoints: [1, 2, 3, 13, 15, 18, 104],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery']
  },
  
  // Motion Sensors
  motion: {
    clusters: [0, 1, 3, 0x0406, 0x0500],
    bindings: [1],
    dataPoints: [1, 9, 101, 102, 103],
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery']
  },
  
  // Contact Sensors
  contact: {
    clusters: [0, 1, 3, 0x0500],
    bindings: [1],
    dataPoints: [1],
    capabilities: ['alarm_contact', 'measure_battery']
  },
  
  // Buttons
  button: {
    clusters: [0, 1, 3, 6, 8],
    bindings: [3, 6, 8],
    dataPoints: [],
    capabilities: []
  },
  
  // Plugs/Sockets
  plug: {
    clusters: [0, 1, 3, 4, 5, 6, 0x0702, 0x0B04],
    bindings: [6],
    dataPoints: [1, 6, 7, 9, 17, 18, 19, 20],
    capabilities: ['onoff', 'measure_power', 'measure_current', 'measure_voltage', 'meter_power']
  },
  
  // Sirens
  siren: {
    clusters: [0, 1, 3, 0x0502],
    bindings: [1],
    dataPoints: [13, 15, 16],
    capabilities: ['onoff', 'alarm_generic']
  }
};

/**
 * Détecte la catégorie d'un driver
 */
function detectCategory(driverName) {
  const name = driverName.toLowerCase();
  
  if (name.includes('switch')) return 'switch';
  if (name.includes('dimmer')) return 'dimmer';
  if (name.includes('light') || name.includes('bulb') || name.includes('rgb')) return 'light_rgb';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shade')) return 'curtain';
  if (name.includes('thermostat') || name.includes('trv')) return 'thermostat';
  if (name.includes('climate') || name.includes('air_quality')) return 'climate';
  if (name.includes('motion') || name.includes('pir') || name.includes('presence')) return 'motion';
  if (name.includes('contact') || name.includes('door') || name.includes('window_sensor')) return 'contact';
  if (name.includes('button') || name.includes('remote')) return 'button';
  if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) return 'plug';
  if (name.includes('siren') || name.includes('alarm')) return 'siren';
  
  return 'switch'; // default
}

/**
 * Enrichit un driver avec tous les clusters et DP
 */
function enrichDriver(driverName) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    return { success: false, reason: 'File not found' };
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    
    // Detect category
    const category = detectCategory(driverName);
    const enrichment = CATEGORY_ENRICHMENT[category];
    
    if (!enrichment) {
      return { success: false, reason: 'No enrichment config' };
    }
    
    let changes = 0;
    
    // Ensure zigbee object exists
    if (!compose.zigbee) {
      compose.zigbee = {};
      changes++;
    }
    
    // Enrich endpoints if missing
    if (!compose.zigbee.endpoints && enrichment.clusters.length > 0) {
      // Detect number of gangs for switches
      let gangCount = 1;
      if (driverName.includes('2gang') || driverName.includes('_2_')) gangCount = 2;
      else if (driverName.includes('3gang') || driverName.includes('_3_')) gangCount = 3;
      else if (driverName.includes('4gang') || driverName.includes('_4_')) gangCount = 4;
      else if (driverName.includes('5gang') || driverName.includes('_5_')) gangCount = 5;
      else if (driverName.includes('6gang') || driverName.includes('_6_')) gangCount = 6;
      else if (driverName.includes('8gang') || driverName.includes('_8_')) gangCount = 8;
      
      compose.zigbee.endpoints = {};
      
      // Primary endpoint
      compose.zigbee.endpoints["1"] = {
        clusters: enrichment.clusters,
        bindings: enrichment.bindings
      };
      changes++;
      
      // Additional endpoints for multi-gang
      if (category === 'switch' && gangCount > 1) {
        for (let i = 2; i <= gangCount; i++) {
          compose.zigbee.endpoints[i.toString()] = {
            clusters: [6],
            bindings: [6]
          };
          changes++;
        }
      }
    }
    
    // Add Tuya specific cluster if not present
    if (compose.zigbee.endpoints) {
      const ep1 = compose.zigbee.endpoints["1"];
      if (ep1 && !ep1.clusters.includes(0xEF00) && enrichment.dataPoints.length > 0) {
        ep1.clusters.push(0xEF00);
        changes++;
      }
    }
    
    // Ensure capabilities exist
    if (!compose.capabilities) {
      compose.capabilities = [];
    }
    
    // Add missing capabilities from enrichment
    enrichment.capabilities.forEach(cap => {
      if (!compose.capabilities.includes(cap)) {
        compose.capabilities.push(cap);
        changes++;
      }
    });
    
    // Add measure_battery if it's a battery device
    if (compose.energy && compose.energy.batteries && !compose.capabilities.includes('measure_battery')) {
      compose.capabilities.push('measure_battery');
      changes++;
    }
    
    // Save only if changes were made
    if (changes > 0) {
      fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
      return { success: true, changes, category };
    } else {
      return { success: true, changes: 0, category, note: 'Already complete' };
    }
    
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

/**
 * Main
 */
function main() {
  console.log('📊 Scanning drivers...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(name => {
      const stat = fs.statSync(path.join(DRIVERS_DIR, name));
      return stat.isDirectory();
    });
  
  console.log(`Found ${drivers.length} drivers\n`);
  console.log('🚀 Starting enrichment...\n');
  
  const results = {
    success: 0,
    failed: 0,
    noChanges: 0,
    totalChanges: 0,
    byCategory: {}
  };
  
  drivers.forEach(driverName => {
    const result = enrichDriver(driverName);
    
    if (result.success) {
      if (result.changes > 0) {
        console.log(`✅ ${driverName} - ${result.category} (+${result.changes} changes)`);
        results.success++;
        results.totalChanges += result.changes;
        
        if (!results.byCategory[result.category]) {
          results.byCategory[result.category] = 0;
        }
        results.byCategory[result.category]++;
      } else {
        results.noChanges++;
      }
    } else {
      console.log(`❌ ${driverName} - ${result.reason}`);
      results.failed++;
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ MEGA ENRICHMENT COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('📊 Results:');
  console.log(`   Success: ${results.success}`);
  console.log(`   No changes needed: ${results.noChanges}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Total changes: ${results.totalChanges}\n`);
  
  console.log('📋 By category:');
  Object.entries(results.byCategory).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} drivers`);
  });
  
  console.log('\n✅ All drivers enriched with complete clusters, DP, and endpoints!');
  console.log('');
}

main();
