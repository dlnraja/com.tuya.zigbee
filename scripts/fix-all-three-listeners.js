#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');

const FILES = [
  'drivers/climate_monitor_co2/device.js',
  'drivers/climate_sensor_temp_humidity_advanced/device.js',
  'drivers/smoke_detector_climate/device.js',
  'drivers/smoke_detector_temp_humidity/device.js',
  'drivers/contact_sensor_vibration/device.js',
  'drivers/motion_sensor_multi/device.js',
  'drivers/motion_sensor_pir_radar/device.js'
];

function fixAllListeners(content) {
  let fixed = content;

  // Listener 1: onZoneEnrollRequest
  fixed = fixed.replace(
    /(endpoint\.clusters\.iasZone\.onZoneEnrollRequest\s*=\s*)(\(\)\s*=>\s*\{)/g,
    '$1async $2'
  );

  // Listener 2: onZoneStatusChangeNotification
  fixed = fixed.replace(
    /(endpoint\.clusters\.iasZone\.onZoneStatusChangeNotification\s*=\s*)(\(payload\)\s*=>\s*\{)/g,
    '$1async $2'
  );

  // Listener 3: onZoneStatus
  fixed = fixed.replace(
    /(endpoint\.clusters\.iasZone\.onZoneStatus\s*=\s*)(\(zoneStatus\)\s*=>\s*\{)/g,
    '$1async $2'
  );

  return fixed;
}

async function main() {
  console.log('🔧 FIXING ALL THREE LISTENERS PER FILE\n');

  let fixed = 0;

  for (const file of FILES) {
    const filePath = path.join(baseDir, file);

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skip: ${file}`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const fixedContent = fixAllListeners(content);

      if (fixedContent !== content) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log(`✅ Fixed: ${file}`);
        fixed++;
      } else {
        console.log(`⏭️  No changes: ${file}`);
      }
    } catch (err) {
      console.error(`❌ Error: ${file} - ${err.message}`);
    }
  }

  console.log(`\n✅ Fixed ${fixed} files`);
}

main().catch(console.error);
