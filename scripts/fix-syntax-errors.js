#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');

// List of files with "Missing catch or finally clause" error
const FILES_TO_FIX = [
  'drivers/air_quality_pm25/device.js',
  'drivers/climate_monitor_co2/device.js',
  'drivers/climate_sensor_temp_humidity_advanced/device.js',
  'drivers/humidity_controller/device.js',
  'drivers/motion_sensor_multi/device.js',
  'drivers/motion_sensor_pir_radar/device.js',
  'drivers/radiator_valve/device.js',
  'drivers/smoke_detector_climate/device.js',
  'drivers/smoke_detector_temp_humidity/device.js'
];

function fixIncompleteComments(content) {
  // Pattern: Commented registerCapability with uncommented closing braces
  // Look for: //           minChange: 10
  //           }         <-- should be commented
  //         },          <-- should be commented
  //         getOpts: {  <-- should be commented
  //           getOnStart: true  <-- should be commented
  //         }           <-- should be commented
  //       });           <-- should be commented

  let fixed = content;

  // Fix pattern 1: minInterval/maxInterval/minChange block
  fixed = fixed.replace(
    /(\/\/\s+minChange:\s+\d+)\s*\n(\s+)(\})\s*\n(\s+)(\}),\s*\n(\s+)(getOpts:\s*\{)\s*\n(\s+)(getOnStart:\s*true)\s*\n(\s+)(\})\s*\n(\s+)(\}\);)/g,
    (match, minChange, sp1, br1, sp2, br2, sp3, getOpts, sp4, getOnStart, sp5, br5, sp6, br6) => {
      return `${minChange}\n${sp1}//           }\n${sp2}//         },\n${sp3}//         ${getOpts}\n${sp4}//           ${getOnStart}\n${sp5}//         }\n${sp6}//       });`;
    }
  );

  return fixed;
}

async function main() {
  console.log('🔧 FIXING SYNTAX ERRORS\n');

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
      const fixedContent = fixIncompleteComments(content);

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
