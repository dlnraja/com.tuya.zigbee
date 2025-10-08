#!/usr/bin/env node
// 🚀 MEGA FINAL v2.0.0 - Script orchestrateur final
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 MEGA FINAL v2.0.0');

// 1. FIX DIMMER DRIVER
const dimmerPath = './drivers/dimmer/driver.compose.json';
if (fs.existsSync(dimmerPath)) {
  const dimmer = {
    "name": {"en": "Tuya Dimmer Switch"},
    "class": "light",
    "capabilities": ["onoff", "dim"],
    "images": {"small": "./assets/images/small.png", "large": "./assets/images/large.png"},
    "zigbee": {
      "manufacturerName": ["_TZ3000_rdz06uge"],
      "productId": ["TS0601"],
      "endpoints": {"1": {"clusters": [0,3,4,5,6,8], "bindings": [6,8]}},
      "learnmode": {"image": "./assets/images/large.png", "instruction": {"en": "Press and hold setup button for 3 seconds"}}
    },
    "platforms": ["local"],
    "connectivity": ["zigbee"],
    "id": "dimmer"
  };
  fs.writeFileSync(dimmerPath, JSON.stringify(dimmer, null, 2));
  console.log('✅ Dimmer fixed');
}

// 2. ENSURE GITHUB ACTIONS
const workflowDir = './.github/workflows';
if (!fs.existsSync(workflowDir)) {
  fs.mkdirSync(workflowDir, {recursive: true});
}

const workflow = `name: Homey App Publish
on:
  push:
    branches: [master]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: npm install -g homey
      - run: homey app validate
      - run: homey app publish
        env:
          HOMEY_TOKEN: \${{ secrets.HOMEY_TOKEN }}`;

fs.writeFileSync(`${workflowDir}/publish.yml`, workflow);
console.log('✅ GitHub Actions configured');

// 3. FINAL VALIDATION & PUSH
try {
  execSync('homey app validate', {stdio: 'inherit'});
  execSync('git add -A && git commit -m "🚀 MEGA FINAL v2.0.0 - Complete" && git push --force', {stdio: 'inherit'});
  console.log('🎉 MEGA FINAL COMPLETE - Ready for GitHub Actions publication');
} catch (error) {
  console.log('❌ Error:', error.message);
}
