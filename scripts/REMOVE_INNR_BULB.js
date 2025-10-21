#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

console.log('\n🔧 REMOVING innr_bulb_color_ac (invalid images)\n');

const before = appJson.drivers.length;
appJson.drivers = appJson.drivers.filter(d => d.id !== 'innr_bulb_color_ac');

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
console.log(`✅ Removed driver`);
console.log(`Drivers: ${before} → ${appJson.drivers.length}\n`);
