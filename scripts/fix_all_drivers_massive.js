#!/usr/bin/env node
'use strict';

/**
 * MASSIVE DRIVER FIX - ALL 186 DRIVERS
 * 
 * Adds capabilities to ALL drivers missing them based on:
 * - Device class
 * - Driver ID patterns
 * - Zigbee clusters
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 MASSIVE DRIVER FIX - Adding capabilities to ALL drivers\n');

// Comprehensive capability mapping
const CAPABILITIES_BY_CLASS_AND_PATTERN = {
  'light': (driverId, clusters) => {
    const caps = ['onoff'];
    
    // Dimming capability (cluster 8 = Level Control)
    if (clusters.includes(8) || driverId.includes('dimmer') || driverId.includes('tunable')) {
      caps.push('dim');
    }
    
    // Color capability (cluster 768 = Color Control)
    if (clusters.includes(768) || driverId.includes('rgb') || driverId.includes('color')) {
      caps.push('light_hue');
      caps.push('light_saturation');
      caps.push('light_temperature');
      caps.push('light_mode');
    } else if (driverId.includes('tunable') || driverId.includes('white_ambiance') || driverId.includes('temperature')) {
      caps.push('light_temperature');
      caps.push('light_mode');
    }
    
    return caps;
  },
  
  'socket': (driverId, clusters) => {
    const caps = ['onoff'];
    
    // Energy monitoring (cluster 2820/2821)
    if (clusters.includes(2820) || clusters.includes(2821) || 
        driverId.includes('energy') || driverId.includes('power') || driverId.includes('meter')) {
      caps.push('measure_power');
      caps.push('meter_power');
      caps.push('measure_voltage');
      caps.push('measure_current');
    }
    
    // Dimmer
    if (driverId.includes('dimmer') || clusters.includes(8)) {
      caps.push('dim');
    }
    
    return caps;
  },
  
  'sensor': (driverId, clusters) => {
    const caps = [];
    
    // Motion (cluster 1024/1030/1280 = Occupancy/IAS Zone)
    if (clusters.includes(1024) || clusters.includes(1030) || clusters.includes(1280) ||
        driverId.includes('motion') || driverId.includes('pir') || driverId.includes('presence') || 
        driverId.includes('occupancy') || driverId.includes('radar')) {
      caps.push('alarm_motion');
    }
    
    // Temperature (cluster 1026)
    if (clusters.includes(1026) || driverId.includes('temp') || driverId.includes('climate') || 
        driverId.includes('thermostat')) {
      caps.push('measure_temperature');
    }
    
    // Humidity (cluster 1029)
    if (clusters.includes(1029) || driverId.includes('humid')) {
      caps.push('measure_humidity');
    }
    
    // Contact/door sensors
    if (driverId.includes('contact') || driverId.includes('door') || driverId.includes('window')) {
      caps.push('alarm_contact');
    }
    
    // Water leak
    if (driverId.includes('leak') || driverId.includes('water')) {
      caps.push('alarm_water');
    }
    
    // Smoke
    if (driverId.includes('smoke')) {
      caps.push('alarm_smoke');
      caps.push('alarm_fire');
    }
    
    // Gas/CO/CO2
    if (driverId.includes('gas') || driverId.includes('co2') || driverId.includes('co_')) {
      caps.push('alarm_co');
      caps.push('alarm_co2');
    }
    
    // Air quality
    if (driverId.includes('pm25') || driverId.includes('air_quality')) {
      caps.push('measure_pm25');
    }
    
    // Illuminance
    if (driverId.includes('illumination') || driverId.includes('light') || driverId.includes('lux')) {
      caps.push('measure_luminance');
    }
    
    // Battery for battery-powered sensors
    if (caps.length > 0 && !driverId.includes('_ac') && !driverId.includes('powered') && 
        !driverId.includes('plug') && !driverId.includes('outlet')) {
      caps.push('alarm_battery');
      caps.push('measure_battery');
    }
    
    return caps;
  },
  
  'button': (driverId, clusters) => {
    return ['alarm_generic']; // Buttons use flow cards for events
  },
  
  'thermostat': (driverId, clusters) => {
    return [
      'target_temperature',
      'measure_temperature',
      'thermostat_mode'
    ];
  },
  
  'lock': (driverId, clusters) => {
    const caps = ['locked', 'lock_mode'];
    
    // Battery
    if (!driverId.includes('_ac')) {
      caps.push('alarm_battery');
      caps.push('measure_battery');
    }
    
    return caps;
  },
  
  'windowcoverings': (driverId, clusters) => {
    const caps = ['windowcoverings_set'];
    
    // Some have dim
    if (clusters.includes(8)) {
      caps.push('dim');
    }
    
    return caps;
  }
};

function extractClusters(compose) {
  const clusters = [];
  
  if (compose.zigbee && compose.zigbee.endpoints) {
    for (const [endpoint, config] of Object.entries(compose.zigbee.endpoints)) {
      if (config.clusters) {
        clusters.push(...config.clusters);
      }
    }
  }
  
  return [...new Set(clusters)];
}

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

let updated = 0;
let skipped = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    // Skip if already has capabilities
    if (compose.capabilities && compose.capabilities.length > 0) {
      skipped++;
      continue;
    }
    
    const deviceClass = compose.class || 'sensor';
    const clusters = extractClusters(compose);
    
    // Get capabilities
    let capabilities = [];
    if (CAPABILITIES_BY_CLASS_AND_PATTERN[deviceClass]) {
      capabilities = CAPABILITIES_BY_CLASS_AND_PATTERN[deviceClass](driverId, clusters);
    }
    
    // Fallback: if still no capabilities, add onoff for switches/sockets/lights
    if (capabilities.length === 0) {
      if (deviceClass === 'socket' || deviceClass === 'light') {
        capabilities = ['onoff'];
      } else if (deviceClass === 'sensor') {
        capabilities = ['alarm_generic']; // Generic sensor
      }
    }
    
    if (capabilities.length > 0) {
      compose.capabilities = capabilities;
      
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      
      console.log(`✅ ${driverId}`);
      console.log(`   Class: ${deviceClass}`);
      console.log(`   Clusters: [${clusters.slice(0, 5).join(', ')}${clusters.length > 5 ? '...' : ''}]`);
      console.log(`   Capabilities: [${capabilities.join(', ')}]\n`);
      
      updated++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Drivers updated: ${updated}`);
console.log(`⏭️  Skipped (already have capabilities): ${skipped}`);
console.log(`📦 Total drivers: ${drivers.length}\n`);

console.log('🎉 Capabilities added! Now run generate_flow_cards_from_capabilities.js\n');
