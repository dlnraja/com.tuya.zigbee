#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIXING driver_id MISMATCHES IN driver.flow.compose.json\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const driverFolders = fs.readdirSync(driversDir).filter(item => {
  return fs.statSync(path.join(driversDir, item)).isDirectory();
});

console.log(`Found ${driverFolders.length} driver folders\n`);

let totalFixed = 0;
let filesModified = 0;

for (const driverFolder of driverFolders) {
  const flowFilePath = path.join(driversDir, driverFolder, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowFilePath)) continue;
  
  try {
    const data = JSON.parse(fs.readFileSync(flowFilePath, 'utf8'));
    let fileModified = false;
    
    // Fix actions
    if (data.actions && Array.isArray(data.actions)) {
      for (const action of data.actions) {
        if (!action.args) continue;
        
        for (const arg of action.args) {
          if (arg.name === 'device' && arg.filter && arg.filter.startsWith('driver_id=')) {
            const currentDriverId = arg.filter.replace('driver_id=', '');
            
            // Check if it matches the folder name
            if (currentDriverId !== driverFolder) {
              console.log(`  📁 ${driverFolder}/`);
              console.log(`     Action: ${action.id}`);
              console.log(`     ❌ Wrong: driver_id=${currentDriverId}`);
              console.log(`     ✅ Fixed: driver_id=${driverFolder}\n`);
              
              arg.filter = `driver_id=${driverFolder}`;
              fileModified = true;
              totalFixed++;
            }
          }
        }
      }
    }
    
    // Fix triggers
    if (data.triggers && Array.isArray(data.triggers)) {
      for (const trigger of data.triggers) {
        if (!trigger.args) continue;
        
        for (const arg of trigger.args) {
          if (arg.name === 'device' && arg.filter && arg.filter.startsWith('driver_id=')) {
            const currentDriverId = arg.filter.replace('driver_id=', '');
            
            if (currentDriverId !== driverFolder) {
              console.log(`  📁 ${driverFolder}/`);
              console.log(`     Trigger: ${trigger.id}`);
              console.log(`     ❌ Wrong: driver_id=${currentDriverId}`);
              console.log(`     ✅ Fixed: driver_id=${driverFolder}\n`);
              
              arg.filter = `driver_id=${driverFolder}`;
              fileModified = true;
              totalFixed++;
            }
          }
        }
      }
    }
    
    if (fileModified) {
      fs.writeFileSync(flowFilePath, JSON.stringify(data, null, 2), 'utf8');
      filesModified++;
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${driverFolder}:`, error.message);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`✅ COMPLETED`);
console.log(`   Drivers checked: ${driverFolders.length}`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total filters fixed: ${totalFixed}`);
console.log(`${'='.repeat(70)}\n`);

process.exit(0);
