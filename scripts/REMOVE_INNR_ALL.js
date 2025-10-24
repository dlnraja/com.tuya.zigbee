#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔧 REMOVING ALL PROBLEMATIC INNR DRIVERS\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

const toRemove = [
  'innr_bulb_color_ac',
  'innr_bulb_tunable_white_ac',
  'innr_bulb_white_ac',
  'innr_smart_plug_ac'
];

const before = appJson.drivers.length;
appJson.drivers = appJson.drivers.filter(d => !toRemove.includes(d.id));

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
console.log(`✅ Removed ${before - appJson.drivers.length} Innr drivers`);
console.log(`📊 Drivers: ${before} → ${appJson.drivers.length}\n`);
