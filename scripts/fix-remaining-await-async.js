#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');

// Files with remaining await outside async errors
const FILES = [
  'drivers/climate_monitor_co2/device.js',
  'drivers/climate_sensor_temp_humidity_advanced/device.js',
  'drivers/smoke_detector_climate/device.js',
  'drivers/smoke_detector_temp_humidity/device.js',
  'drivers/contact_sensor_vibration/device.js',
  'drivers/motion_sensor_multi/device.js',
  'drivers/motion_sensor_pir_radar/device.js'
];

function fixAwaitAsync(content) {
  let fixed = content;

  // Pattern: onZoneEnrollRequest without async
  fixed = fixed.replace(
    /(endpoint\.clusters\.iasZone\.onZoneEnrollRequest\s*=\s*)(\(\)\s*=>\s*\{)/g,
    '$1async $2'
  );

  return fixed;
}

async function main() {
  console.log('🔧 FIXING REMAINING AWAIT/ASYNC ERRORS\n');

  let fixed = 0;

  for (const file of FILES) {
    const filePath = path.join(baseDir, file);

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skip: ${file} (not found)`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const fixedContent = fixAwaitAsync(content);

      if (fixedContent !== content) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log(`✅ Fixed: ${file}`);
        fixed++;
      } else {
        console.log(`⏭️  Skip: ${file} (no changes needed)`);
      }
    } catch (err) {
      console.error(`❌ Error: ${file} - ${err.message}`);
    }
  }

  console.log(`\n✅ Fixed ${fixed} files`);
}

main().catch(console.error);
