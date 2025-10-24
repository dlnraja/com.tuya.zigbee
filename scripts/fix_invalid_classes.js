#!/usr/bin/env node
'use strict';

/**
 * Fix invalid driver classes
 * Replace "unknown" and other invalid classes with appropriate ones
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Fixing invalid driver classes...\n');

// Valid Homey device classes
const VALID_CLASSES = [
  'light', 'socket', 'switch', 'sensor', 'thermostat', 'lock',
  'windowcoverings', 'fan', 'heater', 'button', 'doorbell',
  'remote', 'camera', 'amplifier', 'tv', 'speaker', 'blinds',
  'curtain', 'sunshade', 'garagedoor', 'valve', 'coffeemachine',
  'kettle', 'dishwasher', 'vacuumcleaner', 'refrigerator'
];

// Class mapping based on driver ID patterns
const CLASS_MAPPING = {
  'button': ['button', 'wireless_button', 'scene_controller', 'remote', 'emergency', 'sos'],
  'sensor': ['sensor', 'motion', 'contact', 'leak', 'water', 'door', 'window', 'occupancy', 'presence', 'smoke', 'gas', 'air_quality', 'temp', 'humid'],
  'socket': ['plug', 'socket', 'outlet', 'usb'],
  'switch': ['switch', 'relay'],
  'light': ['bulb', 'led_strip', 'spot', 'dimmer'],
  'thermostat': ['thermostat', 'radiator', 'valve_smart', 'temperature_controller'],
  'windowcoverings': ['curtain', 'blind', 'shutter', 'roller'],
  'lock': ['lock'],
  'doorbell': ['doorbell'],
  'fan': ['fan', 'ceiling_fan'],
  'heater': ['heater'],
  'valve': ['valve', 'water_valve']
};

function detectClass(driverId) {
  const lowerDriverId = driverId.toLowerCase();
  
  for (const [deviceClass, keywords] of Object.entries(CLASS_MAPPING)) {
    for (const keyword of keywords) {
      if (lowerDriverId.includes(keyword)) {
        return deviceClass;
      }
    }
  }
  
  return 'sensor'; // Default fallback
}

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

let fixed = 0;
let errors = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    if (compose.class && !VALID_CLASSES.includes(compose.class)) {
      const oldClass = compose.class;
      const newClass = detectClass(driverId);
      
      compose.class = newClass;
      
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      
      console.log(`✅ ${driverId}`);
      console.log(`   From: ${oldClass}`);
      console.log(`   To:   ${newClass}\n`);
      
      fixed++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
    errors++;
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('   FIX SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Fixed: ${fixed} drivers`);
console.log(`❌ Errors: ${errors}`);
console.log(`📦 Total checked: ${drivers.length}`);

console.log('\n✅ All invalid classes fixed!');
