#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

console.log('\n🗑️ REMOVING ALL titleFormatted TO START FRESH\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

let removedCount = 0;

// Get all driver directories
const driverDirs = fs.readdirSync(driversDir).filter(f => {
  return fs.statSync(path.join(driversDir, f)).isDirectory();
});

for (const driverName of driverDirs) {
  const flowComposeFile = path.join(driversDir, driverName, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowComposeFile)) continue;
  
  const flowData = fs.readJsonSync(flowComposeFile);
  let modified = false;
  
  // Remove from actions
  if (flowData.actions) {
    for (const action of flowData.actions) {
      if (action.titleFormatted) {
        delete action.titleFormatted;
        modified = true;
        removedCount++;
      }
    }
  }
  
  // Remove from triggers
  if (flowData.triggers) {
    for (const trigger of flowData.triggers) {
      if (trigger.titleFormatted) {
        delete trigger.titleFormatted;
        modified = true;
        removedCount++;
      }
    }
  }
  
  // Remove from conditions
  if (flowData.conditions) {
    for (const condition of flowData.conditions) {
      if (condition.titleFormatted) {
        delete condition.titleFormatted;
        modified = true;
        removedCount++;
      }
    }
  }
  
  if (modified) {
    fs.writeJsonSync(flowComposeFile, flowData, { spaces: 2 });
  }
}

console.log(`✅ REMOVED ${removedCount} titleFormatted entries\n`);
