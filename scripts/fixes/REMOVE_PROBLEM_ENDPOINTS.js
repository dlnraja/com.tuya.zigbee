#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 REMOVING PROBLEMATIC ENDPOINTS\n');

// Drivers with endpoint issues from validation
const problemDrivers = [
  'button_emergency_advanced',
  'button_wireless_3',
  'button_wireless_4',
  'climate_sensor_soil',
  'presence_sensor_radar',
  'switch_basic_1gang',
  'switch_basic_2gang',
  'switch_basic_5gang',
  'switch_2gang',
  'switch_smart_1gang',
  'switch_smart_3gang',
  'switch_smart_4gang',
  'switch_touch_1gang',
  'switch_touch_1gang_basic',
  'switch_touch_2gang',
  'switch_touch_3gang',
  'switch_touch_3gang_basic',
  'switch_touch_4gang',
  'switch_wall_1gang',
  'switch_wall_1gang_basic',
  'switch_wall_2gang',
  'switch_wall_2gang_basic',
  'switch_wall_2gang_smart',
  'switch_wall_3gang',
  'switch_wall_3gang_basic',
  'switch_wall_4gang',
  'switch_wall_4gang_basic',
  'switch_wall_4gang_smart',
  'switch_wall_5gang',
  'switch_wall_6gang',
  'switch_wall_6gang_basic',
  'switch_wall_6gang_smart',
  'switch_wall_8gang_smart'
];

let fixCount = 0;

for (const driverName of problemDrivers) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    console.log(`⚠️  Not found: ${driverName}`);
    continue;
  }
  
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  
  // Remove endpoints completely - Homey will auto-discover
  if (compose.zigbee && compose.zigbee.endpoints) {
    delete compose.zigbee.endpoints;
    
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
    console.log(`✅ ${driverName}`);
    fixCount++;
  }
}

console.log(`\n✅ Total: ${fixCount} drivers fixed\n`);
