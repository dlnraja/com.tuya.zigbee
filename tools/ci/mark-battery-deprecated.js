// mark-battery-deprecated.js — P54 phase 1
// Add @deprecated JSDoc to the 14 battery files that are NEVER IMPORTED anywhere.
// This is a SAFE first step (no deletion) — clearly marks them for future removal.
//
// Run: node tools/ci/mark-battery-deprecated.js
//      node tools/ci/mark-battery-deprecated.js --apply
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');

// P54: 14 battery files with 0 importers (per tools/ci/battery-graph2.js)
const DEAD_FILES = [
  'lib/BatteryManagerV3.js',
  'lib/BatteryManagerV4.js',
  'lib/battery/BatteryCascadeEngine.js',
  'lib/battery/BatteryHealthIntelligence.js',
  'lib/battery/BatteryHelper.js',
  'lib/battery/BatteryIconDetector.js',
  'lib/battery/BatteryManagerV3.js',
  'lib/battery/BatteryMonitoringMixin.js',
  'lib/battery/BatteryMonitoringSystem.js',
  'lib/battery/BatteryProfileDatabase.js',
  'lib/battery/BatterySystem.js',
  'lib/battery/UniversalBatteryFallback.js',
  'lib/clusters/TuyaBatterySafeCluster.js',
  'lib/tuya/BatteryMixin.js',
];

const MARKER = `/**
 * @deprecated P54 — This file has 0 importers and is scheduled for removal.
 * Its functionality has been consolidated into UnifiedBatteryHandler.js.
 * See docs/BATTERY_AUDIT.md for the full P54 plan.
 * Removal is safe: search the codebase for any imports of this file first.
 */`;

console.log('=== Mark 14 dead battery files as @deprecated ===\n');
let marked = 0, skipped = 0, missing = 0;

for (const f of DEAD_FILES) {
  const full = path.join(ROOT, f);
  if (!fs.existsSync(full)) {
    console.log('  [MISSING]', f);
    missing++;
    continue;
  }
  let content = fs.readFileSync(full, 'utf8');
  if (content.includes('@deprecated P54')) {
    console.log('  [ALREADY]', f);
    skipped++;
    continue;
  }
  // Insert the marker after the first 'use strict' or '/*' line
  const lines = content.split('\n');
  let insertAt = 0;
  for (let i = 0; i < lines.length && i < 5; i++) {
    if (lines[i].trim() === "'use strict';" || lines[i].trim() === '"use strict";') {
      insertAt = i + 1;
      break;
    }
  }
  // If file starts with /* ... */, insert after the closing */
  if (lines[0] && lines[0].startsWith('/*') && !content.includes('@deprecated P54')) {
    let endIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('*/')) {
        endIdx = i + 1;
        break;
      }
    }
    insertAt = Math.max(insertAt, endIdx);
  }
  lines.splice(insertAt, 0, MARKER);
  const newContent = lines.join('\n');
  if (APPLY) {
    fs.writeFileSync(full, newContent);
    console.log('  [MARKED]', f);
    marked++;
  } else {
    console.log('  [WOULD MARK]', f);
    marked++;
  }
}

console.log(`\n${APPLY ? 'MARKED' : 'WOULD MARK'}: ${marked}, skipped: ${skipped}, missing: ${missing}`);
if (!APPLY && marked > 0) console.log('Run with --apply to actually mark');
