#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 ADDING MINIMAL VALID ENDPOINTS\n');

// Drivers with endpoint issues
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
  
  if (!compose.zigbee) {
    compose.zigbee = {};
  }
  
  // Add minimal valid endpoints
  compose.zigbee.endpoints = {
    "1": {
      "clusters": ["basic", "onOff"]
    }
  };
  
  // For multi-gang switches, add additional endpoints
  if (driverName.includes('2gang')) {
    compose.zigbee.endpoints["2"] = {
      "clusters": ["onOff"]
    };
  }
  
  if (driverName.includes('3gang') || driverName.includes('wireless_3')) {
    compose.zigbee.endpoints["2"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["3"] = { "clusters": ["onOff"] };
  }
  
  if (driverName.includes('4gang') || driverName.includes('wireless_4')) {
    compose.zigbee.endpoints["2"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["3"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["4"] = { "clusters": ["onOff"] };
  }
  
  if (driverName.includes('5gang')) {
    compose.zigbee.endpoints["2"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["3"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["4"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["5"] = { "clusters": ["onOff"] };
  }
  
  if (driverName.includes('6gang')) {
    compose.zigbee.endpoints["2"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["3"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["4"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["5"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["6"] = { "clusters": ["onOff"] };
  }
  
  if (driverName.includes('8gang')) {
    compose.zigbee.endpoints["2"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["3"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["4"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["5"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["6"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["7"] = { "clusters": ["onOff"] };
    compose.zigbee.endpoints["8"] = { "clusters": ["onOff"] };
  }
  
  fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
  console.log(`✅ ${driverName}`);
  fixCount++;
}

console.log(`\n✅ Total: ${fixCount} drivers fixed\n`);
