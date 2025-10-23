#!/usr/bin/env node
'use strict';

/**
 * ADD CAPABILITIES TO ZEMISMART DRIVERS
 * 
 * Automatically adds appropriate capabilities based on device class and Zigbee clusters
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Adding capabilities to Zemismart drivers...\n');

// Capabilities mapping based on device class and clusters
const CAPABILITIES_BY_CLASS = {
  'sensor': (driverId, clusters) => {
    const caps = [];
    
    // Motion sensors (cluster 1024/1030/1280)
    if (clusters.includes(1024) || clusters.includes(1030) || clusters.includes(1280)) {
      caps.push('alarm_motion');
    }
    
    // Temperature (cluster 1026 or TS0201)
    if (clusters.includes(1026) || driverId.includes('temp') || driverId.includes('climate')) {
      caps.push('measure_temperature');
    }
    
    // Humidity (cluster 1029)
    if (clusters.includes(1029) || driverId.includes('humid')) {
      caps.push('measure_humidity');
    }
    
    // Contact/door sensors (cluster 6 or IAS Zone)
    if (driverId.includes('contact') || driverId.includes('door') || driverId.includes('window')) {
      caps.push('alarm_contact');
    }
    
    // Water leak
    if (driverId.includes('leak') || driverId.includes('water')) {
      caps.push('alarm_water');
    }
    
    // Smoke detector
    if (driverId.includes('smoke')) {
      caps.push('alarm_smoke');
      caps.push('alarm_fire');
    }
    
    // Gas detector
    if (driverId.includes('gas') || driverId.includes('co2') || driverId.includes('co_')) {
      caps.push('alarm_co');
      caps.push('alarm_co2');
    }
    
    // PM2.5 / Air quality
    if (driverId.includes('pm25') || driverId.includes('air_quality')) {
      caps.push('measure_pm25');
    }
    
    // Illuminance (cluster 1024)
    if (driverId.includes('illumination') || driverId.includes('light_sensor')) {
      caps.push('measure_luminance');
    }
    
    // Battery if sensors
    if (caps.length > 0 && !driverId.includes('_ac') && !driverId.includes('powered')) {
      caps.push('alarm_battery');
      caps.push('measure_battery');
    }
    
    return caps;
  },
  
  'socket': (driverId, clusters) => {
    const caps = ['onoff'];
    
    // Power measurement (cluster 2820/2821)
    if (clusters.includes(2820) || clusters.includes(2821) || driverId.includes('energy') || driverId.includes('power')) {
      caps.push('measure_power');
      caps.push('meter_power');
      caps.push('measure_voltage');
      caps.push('measure_current');
    }
    
    // Dimmer capability
    if (driverId.includes('dimmer') || clusters.includes(8)) {
      caps.push('dim');
    }
    
    return caps;
  },
  
  'button': (driverId, clusters) => {
    return ['alarm_generic']; // Button events handled via flow cards
  },
  
  'lock': (driverId, clusters) => {
    const caps = ['locked', 'lock_mode'];
    
    // Battery for locks
    if (!driverId.includes('_ac')) {
      caps.push('alarm_battery');
      caps.push('measure_battery');
    }
    
    return caps;
  },
  
  'windowcoverings': (driverId, clusters) => {
    const caps = ['windowcoverings_set'];
    
    // Some have dim capability
    if (clusters.includes(8)) {
      caps.push('dim');
    }
    
    return caps;
  },
  
  'thermostat': (driver, clusters) => {
    return [
      'target_temperature',
      'measure_temperature',
      'thermostat_mode'
    ];
  },
  
  'light': (driver, clusters) => {
    const caps = ['onoff'];
    
    // Dimming (cluster 8)
    if (clusters.includes(8)) {
      caps.push('dim');
    }
    
    // Color (cluster 768)
    if (clusters.includes(768)) {
      caps.push('light_hue');
      caps.push('light_saturation');
      caps.push('light_temperature');
      caps.push('light_mode');
    }
    
    return caps;
  }
};

function extractClusters(driver) {
  const clusters = [];
  
  if (driver.zigbee && driver.zigbee.endpoints) {
    for (const [endpoint, config] of Object.entries(driver.zigbee.endpoints)) {
      if (config.clusters) {
        clusters.push(...config.clusters);
      }
    }
  }
  
  return [...new Set(clusters)]; // Unique clusters
}

const zemismartDrivers = fs.readdirSync(driversDir)
  .filter(name => name.startsWith('zemismart_'))
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

let updated = 0;

for (const driverId of zemismartDrivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    // Skip if already has capabilities
    if (compose.capabilities && compose.capabilities.length > 0) {
      continue;
    }
    
    const deviceClass = compose.class || 'sensor';
    const clusters = extractClusters(compose);
    
    // Get appropriate capabilities
    let capabilities = [];
    if (CAPABILITIES_BY_CLASS[deviceClass]) {
      capabilities = CAPABILITIES_BY_CLASS[deviceClass](driverId, clusters);
    }
    
    if (capabilities.length > 0) {
      compose.capabilities = capabilities;
      
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      
      console.log(`✅ ${driverId}`);
      console.log(`   Class: ${deviceClass}`);
      console.log(`   Clusters: [${clusters.join(', ')}]`);
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
console.log(`📦 Total Zemismart drivers: ${zemismartDrivers.length}\n`);

console.log('🎉 Capabilities added! Now run generate_flow_cards_from_capabilities.js\n');
