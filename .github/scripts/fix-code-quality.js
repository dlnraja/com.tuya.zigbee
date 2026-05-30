#!/usr/bin/env node
// fix-code-quality.js - Fix 3 erreurs détectées par STRICT_SYNTAX_GUARD
'use strict';
const fs = require('fs'), path = require('path');

const fixes = [
  {
    file: 'drivers/wall_remote_4_gang_2/device.js',
    desc: 'Remove duplicate TuyaZigbeeDevice require (line 3)',
    fix: code => {
      const lines = code.split('\n');
      let firstFound = false;
      return lines.filter(line => {
        if (line.includes('const TuyaZigbeeDevice') && line.includes('require')) {
          if (!firstFound) { firstFound = true; return false; }
        }
        return true;
      }).join('\n');
    },
  },
  {
    file: 'drivers/bulb_rgbw_universal/device.js',
    desc: 'Fix super.onNodeInit() → super.onNodeInit({ zclNode })',
    fix: code => code.replace(/super\.onNodeInit\(\)/g, 'super.onNodeInit({ zclNode })'),
  },
  {
    file: 'drivers/universal_zigbee/device.js',
    desc: 'Fix super.onNodeInit() → super.onNodeInit({ zclNode })',
    fix: code => code.replace(/super\.onNodeInit\(\)/g, 'super.onNodeInit({ zclNode })'),
  },
  {
    file: 'drivers/wall_dimmer_1gang_1way/device.js',
    desc: 'Fix super.onNodeInit({ zclNode, ...other }) → super.onNodeInit({ zclNode })',
    fix: code => code.replace(/super\.onNodeInit\(\{\s*zclNode\s*,\s*\.\.\.other\s*\}\)/g, 'super.onNodeInit({ zclNode })'),
  },
];

let fixed = 0;
for (const { file, desc, fix } of fixes) {
  if (!fs.existsSync(file)) { console.log('SKIP (missing):', file); continue; }
  const original = fs.readFileSync(file, 'utf8');
  const patched  = fix(original);
  if (patched !== original) {
    fs.writeFileSync(file, patched);
    console.log('✅ Fixed:', file, '-', desc);
    fixed++;
  } else {
    console.log('⚪ No change needed:', file);
  }
}
console.log('\nTotal fixed:', fixed, '/', fixes.length);
