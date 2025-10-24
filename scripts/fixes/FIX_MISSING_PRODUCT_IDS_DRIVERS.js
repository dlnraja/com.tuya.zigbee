#!/usr/bin/env node
/**
 * 🔧 FIX MISSING PRODUCT IDs - DANS DRIVERS/
 * 
 * Corrige AUSSI dans drivers/ (pas seulement .homeycompose)
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 FIX MISSING PRODUCT IDs (drivers/)\n');

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

for (const [driver, productIds] of Object.entries(PRODUCT_IDS)) {
  const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`  ⚠️  Skip ${driver}: file not found`);
    continue;
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  
  if (!compose.zigbee) {
    compose.zigbee = {};
  }
  
  if (!compose.zigbee.productId || compose.zigbee.productId.length === 0) {
    compose.zigbee.productId = productIds;
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    console.log(`  ✅ ${driver}: +${productIds.length} productIds`);
    fixed++;
  } else {
    console.log(`  ℹ️  ${driver}: already has ${compose.zigbee.productId.length} productIds`);
  }
}

console.log(`\n✅ ${fixed} drivers corrigés\n`);
