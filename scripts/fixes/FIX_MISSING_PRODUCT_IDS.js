#!/usr/bin/env node
/**
 * 🔧 FIX MISSING PRODUCT IDs
 * 
 * Corrige les 22 drivers sans productId requis par Homey SDK3
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const HOMEYCOMPOSE_DRIVERS = path.join(ROOT, '.homeycompose', 'drivers');

console.log('🔧 FIX MISSING PRODUCT IDs\n');

const missingDrivers = [
  'bulb_rgb',
  'gas_detector',
  'gas_sensor',
  'led_strip_advanced',
  'led_strip_basic',
  'led_strip_outdoor_rgb',
  'led_strip_pro',
  'led_strip_rgbw',
  'motion_sensor_mmwave',
  'motion_sensor_multi',
  'motion_sensor_outdoor',
  'motion_sensor_pir_advanced',
  'motion_sensor_pir_radar',
  'motion_sensor_radar_advanced',
  'motion_sensor_radar_mmwave',
  'smoke_detector_advanced',
  'smoke_detector_climate',
  'smoke_detector_temp_humidity',
  'water_leak_sensor_temp_humidity',
  'water_valve',
  'water_valve_smart',
  'water_valve_smart_hybrid'
];

const PRODUCT_IDS = {
  bulb_rgb: ['TS0505B', 'TS0505A'],
  gas_detector: ['TS0601'],
  gas_sensor: ['TS0601'],
  led_strip_advanced: ['TS0505B'],
  led_strip_basic: ['TS0505B'],
  led_strip_outdoor_rgb: ['TS0505B'],
  led_strip_pro: ['TS0505B'],
  led_strip_rgbw: ['TS0505B'],
  motion_sensor_mmwave: ['TS0601'],
  motion_sensor_multi: ['TS0202'],
  motion_sensor_outdoor: ['TS0202'],
  motion_sensor_pir_advanced: ['TS0202'],
  motion_sensor_pir_radar: ['TS0601'],
  motion_sensor_radar_advanced: ['TS0601'],
  motion_sensor_radar_mmwave: ['TS0601'],
  smoke_detector_advanced: ['TS0205'],
  smoke_detector_climate: ['TS0205'],
  smoke_detector_temp_humidity: ['TS0205'],
  water_leak_sensor_temp_humidity: ['TS0207'],
  water_valve: ['TS0601'],
  water_valve_smart: ['TS0601'],
  water_valve_smart_hybrid: ['TS0601']
};

let fixed = 0;

for (const driver of missingDrivers) {
  const composePath = path.join(HOMEYCOMPOSE_DRIVERS, driver, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`  ⚠️  Skip ${driver}: file not found`);
    continue;
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  
  if (!compose.zigbee) {
    compose.zigbee = {};
  }
  
  if (!compose.zigbee.productId || compose.zigbee.productId.length === 0) {
    compose.zigbee.productId = PRODUCT_IDS[driver] || ['TS0601'];
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    console.log(`  ✅ ${driver}: +${compose.zigbee.productId.length} productIds`);
    fixed++;
  }
}

console.log(`\n✅ ${fixed} drivers corrigés\n`);
