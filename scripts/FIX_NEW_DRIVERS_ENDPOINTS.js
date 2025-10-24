#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔧 ADDING ENDPOINTS TO NEW DRIVERS\n');

const driversDir = path.join(__dirname, '..', 'drivers');

// New drivers that need endpoints
const newDrivers = [
  'innr_bulb_color_ac', 'innr_bulb_tunable_white_ac', 'innr_bulb_white_ac', 'innr_smart_plug_ac',
  'osram_bulb_rgbw_ac', 'osram_bulb_tunable_white_ac', 'osram_bulb_white_ac', 'osram_led_strip_rgbw_ac',
  'osram_outdoor_plug_ac', 'osram_smart_plug_ac',
  'philips_bulb_color_ac', 'philips_bulb_white_ac', 'philips_bulb_white_ambiance_ac',
  'philips_dimmer_switch_aaa', 'philips_led_strip_ac', 'philips_motion_sensor_aaa',
  'philips_outdoor_sensor_aaa', 'philips_smart_plug_ac',
  'samsung_button_cr2450', 'samsung_contact_sensor_cr2032', 'samsung_motion_sensor_cr2450',
  'samsung_motion_sensor_outdoor_cr123a', 'samsung_multipurpose_sensor_cr2032', 'samsung_outlet_ac',
  'samsung_smart_plug_ac', 'samsung_water_leak_sensor_cr2032',
  'sonoff_button_wireless_cr2450', 'sonoff_contact_sensor_cr2032', 'sonoff_led_strip_ac',
  'sonoff_motion_sensor_cr2450', 'sonoff_smart_plug_ac', 'sonoff_temperature_humidity_cr2450',
  'xiaomi_button_wireless_cr2032', 'xiaomi_contact_sensor_cr1632', 'xiaomi_cube_controller_cr2450',
  'xiaomi_motion_sensor_cr2450', 'xiaomi_smart_plug_ac', 'xiaomi_temperature_humidity_cr2032',
  'xiaomi_vibration_sensor_cr2450', 'xiaomi_water_leak_cr2032'
];

let fixed = 0;

newDrivers.forEach(driverId => {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`  ⚠️  Not found: ${driverId}`);
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    // Add endpoints if missing
    if (!compose.zigbee.endpoints) {
      compose.zigbee.endpoints = {
        1: {
          clusters: [0, 3, 4, 5, 6],
          bindings: [6]
        }
      };
      
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      console.log(`  ✅ Fixed: ${driverId}`);
      fixed++;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${driverId} - ${err.message}`);
  }
});

console.log(`\n✅ Fixed ${fixed} drivers\n`);
