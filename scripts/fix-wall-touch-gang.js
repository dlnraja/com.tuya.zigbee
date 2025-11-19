#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');

const files = [
  'drivers/wall_touch_2gang/device.js',
  'drivers/wall_touch_3gang/device.js',
  'drivers/wall_touch_4gang/device.js',
  'drivers/wall_touch_5gang/device.js',
  'drivers/wall_touch_6gang/device.js',
  'drivers/wall_touch_7gang/device.js',
  'drivers/wall_touch_8gang/device.js'
];

async function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix 1: Remove premature class closing brace before setupTemperatureSensor
    content = content.replace(
      /    this\.log\('\[OK\] WallTouch\dGang ready \(SDK3\)'\);\n  \}\n\}\n\n\n  \/\*\*\n   \* Setup measure_temperature capability \(SDK3\)\n   \* Cluster 1026 - measuredValue\n   \*\/\n  async setupTemperatureSensor\(\) \{/g,
      `    this.log('[OK] WallTouch#Gang ready (SDK3)');\n  }\n\n  /**\n   * Setup measure_temperature capability (SDK3)\n   * Cluster 1026 - measuredValue\n   */\n  async setupTemperatureSensor() {`
        .replace('#Gang', filePath.match(/wall_touch_(\d+)gang/)[0].replace('wall_touch_', '').replace('gang', 'Gang'))
    );

    // Fix 2: Fix corrupted try/catch block
    content = content.replace(
      /\/\/             minInterval: 60,\n\/\/             maxInterval: 3600,\n\/\/             minChange: 10\n          \} catch \(err\) \{ this\.error\(err\); \}\},\n        getOpts: \{\n          getOnStart: true\n        \}\n      \}\);/g,
      `//             minInterval: 60,\n//             maxInterval: 3600,\n//             minChange: 10\n//           }\n//         },\n//         getOpts: {\n//           getOnStart: true\n//         }\n//       });`
    );

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error fixing ${filePath}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🔧 FIXING WALL_TOUCH_*GANG FILES\n');

  let fixed = 0;

  for (const file of files) {
    const filePath = path.join(baseDir, file);
    if (fs.existsSync(filePath)) {
      const wasFixed = await fixFile(filePath);
      if (wasFixed) {
        console.log(`✅ Fixed: ${file}`);
        fixed++;
      } else {
        console.log(`⏭️  No change needed: ${file}`);
      }
    } else {
      console.log(`⚠️  Not found: ${file}`);
    }
  }

  console.log(`\n✅ Fixed ${fixed} files.`);
}

main().catch(console.error);
