// battery-summary.js — Print summary of active battery files
'use strict';
const fs = require('fs');
const active = [
  'lib/battery/UnifiedBatteryHandler.js',
  'lib/battery/BatteryCalculator.js',
  'lib/battery/index.js',
  'lib/utils/BatteryCurveFallback.js',
];
for (const f of active) {
  if (!fs.existsSync(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  const cls = content.match(/^class\s+(\w+)/m);
  const m = content.match(/^\s+(async\s+)?(\w+)\s*\(/gm) || [];
  const exports = content.match(/module\.exports\s*=\s*([^;]+);/g) || [];
  console.log(f + ':');
  console.log('  class:', cls ? cls[1] : 'none');
  console.log('  methods:', m.length);
  console.log('  exports:', exports.length);
}
