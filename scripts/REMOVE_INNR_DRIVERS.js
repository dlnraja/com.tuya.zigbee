#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

console.log('\n🔧 REMOVING INNR drivers without valid images\n');

const toRemove = [
  'innr_bulb_tunable_white_ac',
  'innr_bulb_white_ac',
  'innr_smart_plug_ac'
];

const before = appJson.drivers.length;
appJson.drivers = appJson.drivers.filter(d => !toRemove.includes(d.id));

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
console.log(`✅ Removed ${toRemove.length} drivers`);
console.log(`Drivers: ${before} → ${appJson.drivers.length}\n`);
console.log('Removed:', toRemove.join(', '));
