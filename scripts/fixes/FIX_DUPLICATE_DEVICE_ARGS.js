#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIXING DUPLICATE "device" ARGUMENTS IN FLOW ACTIONS\n');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');
const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

let fixedCount = 0;

if (appData.flow && appData.flow.actions) {
  for (const action of appData.flow.actions) {
    if (!action.args) continue;
    
    const deviceArgs = action.args.filter(arg => arg.name === 'device');
    
    if (deviceArgs.length > 1) {
      // Collect all unique driver_id filters
      const allDriverIds = deviceArgs
        .map(arg => arg.filter)
        .filter(f => f && f.startsWith('driver_id='))
        .map(f => String(f).replace('driver_id=', ''))
        .filter((v, i, a) => a.indexOf(v) === i); // unique
      
      // Remove all device args
      action.args = action.args.filter(arg => arg.name !== 'device');
      
      // Add back a single device arg with all filters
      action.args.unshift({
        "name": "device",
        "type": "device",
        "filter": `driver_id=${allDriverIds.join('|')}`
      });
      
      console.log(`✅ Fixed: ${action.id}`);
      console.log(`   Merged ${deviceArgs.length} device args → 1 with filter: ${allDriverIds.join('|')}\n`);
      fixedCount++;
    }
  }
}

fs.writeFileSync(appJsonPath, JSON.stringify(appData, null, 2), 'utf8');

console.log(`\n✅ FIXED ${fixedCount} ACTIONS WITH DUPLICATE DEVICE ARGUMENTS\n`);
