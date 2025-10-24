#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔍 CHECKING FOR DUPLICATE "device" ARGUMENTS IN FLOW ACTIONS\n');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');
const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const actionsWithDuplicates = [];

if (appData.flow && appData.flow.actions) {
  for (const action of appData.flow.actions) {
    const deviceArgs = action.args ? action.args.filter(arg => arg.name === 'device') : [];
    
    if (deviceArgs.length > 1) {
      actionsWithDuplicates.push({
        id: action.id,
        deviceCount: deviceArgs.length,
        filters: deviceArgs.map(d => d.filter)
      });
    }
  }
}

if (actionsWithDuplicates.length > 0) {
  console.log(`❌ Found ${actionsWithDuplicates.length} actions with duplicate "device" arguments:\n`);
  actionsWithDuplicates.forEach(action => {
    console.log(`  - ${action.id}`);
    console.log(`    Device count: ${action.deviceCount}`);
    action.filters.forEach((filter, i) => {
      console.log(`    Device ${i+1}: ${filter}`);
    });
    console.log('');
  });
} else {
  console.log('✅ No duplicate "device" arguments found!\n');
}

process.exit(actionsWithDuplicates.length > 0 ? 1 : 0);
