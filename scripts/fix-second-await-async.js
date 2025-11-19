#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');

// Files with second "await outside async" error (around line 100)
const FILES_TO_FIX = [
  'drivers/contact_sensor/device.js',
  'drivers/contact_sensor_basic/device.js',
  'drivers/contact_sensor_multipurpose/device.js',
  'drivers/contact_sensor_vibration/device.js',
  'drivers/door_controller/device.js',
  'drivers/doorbell/device.js',
  'drivers/doorbell_camera/device.js',
  'drivers/garage_door_controller/device.js',
  'drivers/gas_detector/device.js',
  'drivers/gas_sensor/device.js',
  'drivers/led_strip_outdoor_rgb/device.js',
  'drivers/light_controller_outdoor/device.js',
  'drivers/lock_smart_basic/device.js',
  'drivers/motion_sensor/device.js',
  'drivers/motion_sensor_mmwave/device.js',
  'drivers/motion_sensor_outdoor/device.js',
  'drivers/motion_sensor_pir/device.js',
  'drivers/motion_sensor_pir_advanced/device.js',
  'drivers/motion_sensor_radar_advanced/device.js',
  'drivers/motion_sensor_radar_mmwave/device.js',
  'drivers/plug_outdoor/device.js',
  'drivers/siren/device.js',
  'drivers/siren_outdoor/device.js',
  'drivers/smoke_detector_advanced/device.js',
  'drivers/climate_monitor_co2/device.js',
  'drivers/climate_sensor_temp_humidity_advanced/device.js',
  'drivers/motion_sensor_multi/device.js',
  'drivers/motion_sensor_pir_radar/device.js'
];

function fixSecondAwaitAsync(content) {
  let fixed = content;

  // Pattern: onZoneStatusChangeNotification with regular function containing await IIFE
  // Line 87: onZoneStatusChangeNotification = (payload) => {
  // Line 100: await (async () => { ... })()

  // Fix: Add async to the onZoneStatusChangeNotification function
  fixed = fixed.replace(
    /(onZoneStatusChangeNotification\s*=\s*)(\(payload\)\s*=>\s*\{)/g,
    '$1async $2'
  );

  // Also fix similar patterns with different variable names
  fixed = fixed.replace(
    /(\.on\(['"]zoneStatusChangeNotification['"],\s*)(\([^)]*\)\s*=>\s*\{)/g,
    '$1async $2'
  );

  return fixed;
}

async function main() {
  console.log('🔧 FIXING SECOND AWAIT/ASYNC ERRORS\n');

  let fixed = 0;
  let errors = 0;

  for (const file of FILES_TO_FIX) {
    const filePath = path.join(baseDir, file);

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skip: ${file} (not found)`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const fixedContent = fixSecondAwaitAsync(content);

      if (fixedContent !== content) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log(`✅ Fixed: ${file}`);
        fixed++;
      } else {
        console.log(`⏭️  Skip: ${file} (no changes needed)`);
      }
    } catch (err) {
      console.error(`❌ Error: ${file} - ${err.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Fixed: ${fixed} files`);
  console.log(`❌ Errors: ${errors} files`);
  console.log('='.repeat(50));
  console.log('\n💡 Run "npm run lint" to verify fixes\n');
}

main().catch(console.error);
