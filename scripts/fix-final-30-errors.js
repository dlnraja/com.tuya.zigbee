#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');

// Group fixes by pattern type
const FIXES = {
  // Pattern 1: Orphan } before async method (switch_touch/wall)
  orphanBraceBeforeAsync: [
    'drivers/switch_touch_1gang/device.js',
    'drivers/switch_touch_3gang/device.js',
    'drivers/switch_wall_1gang/device.js'
  ],

  // Pattern 2: Corrupted comment block in water sensors (ligne 60)
  corruptedCommentWater: [
    'drivers/water_leak_sensor/device.js',
    'drivers/water_leak_sensor_temp_humidity/device.js',
    'drivers/water_valve/device.js',
    'drivers/water_valve_smart/device.js'
  ],

  // Pattern 3: Try without catch (temperature sensors ligne 45)
  tryWithoutCatch: [
    'drivers/temperature_sensor/device.js',
    'drivers/temperature_sensor_advanced/device.js'
  ]
};

function fixOrphanBraceBeforeAsync(content) {
  // Pattern: } before async registerSwitchCapabilities
  return content.replace(
    /  \/\*\*\n   \* Register capabilities for \d switches\n   \*\/\n  \}\n  async registerSwitchCapabilities\(\) \{/g,
    '  /**\n   * Register capabilities for switches\n   */\n  async registerSwitchCapabilities() {'
  );
}

function fixCorruptedCommentWater(content) {
  // Pattern: Corrupted comment leaving } catch active
  return content.replace(
    /\/\/             minInterval: 60,\n\/\/             maxInterval: 3600,\n\/\/             minChange: 10\n          \} catch \(err\) \{ this\.error\(err\); \}\},\n        getOpts: \{\n          getOnStart: true\n        \}\n      \}\);/g,
    '//             minInterval: 60,\n//             maxInterval: 3600,\n//             minChange: 10\n//           }\n//         },\n//         getOpts: {\n//           getOnStart: true\n//         }\n//       });'
  );
}

function fixTryWithoutCatch(content) {
  // Pattern: try { with commented code breaking structure
  return content.replace(
    /\/\/             minInterval: 60,\n\/\/             maxInterval: 3600,\n\/\/             minChange: 10\n          \}\n        \},\n        getOpts: \{\n          getOnStart: true\n        \}\n      \}\);/g,
    '//             minInterval: 60,\n//             maxInterval: 3600,\n//             minChange: 10\n//           }\n//         },\n//         getOpts: {\n//           getOnStart: true\n//         }\n//       });'
  );
}

async function applyFixes(file, fixFunction) {
  const filePath = path.join(baseDir, file);

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skip: ${file}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixFunction(content);

    if (fixed !== content) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      return true;
    }

    console.log(`⏭️  No change: ${file}`);
    return false;
  } catch (err) {
    console.error(`❌ Error: ${file} - ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🔧 FIXING FINAL 30 ERRORS\n');

  let totalFixed = 0;

  // Fix Group 1
  console.log('📦 Group 1: Orphan braces before async...');
  for (const file of FIXES.orphanBraceBeforeAsync) {
    if (await applyFixes(file, fixOrphanBraceBeforeAsync)) totalFixed++;
  }

  // Fix Group 2
  console.log('\n📦 Group 2: Corrupted comments (water sensors)...');
  for (const file of FIXES.corruptedCommentWater) {
    if (await applyFixes(file, fixCorruptedCommentWater)) totalFixed++;
  }

  // Fix Group 3
  console.log('\n📦 Group 3: Try without catch (temperature sensors)...');
  for (const file of FIXES.tryWithoutCatch) {
    if (await applyFixes(file, fixTryWithoutCatch)) totalFixed++;
  }

  console.log(`\n✅ Total fixed: ${totalFixed} files`);
}

main().catch(console.error);
