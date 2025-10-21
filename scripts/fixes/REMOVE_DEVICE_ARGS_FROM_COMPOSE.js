#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🗑️  REMOVING DEVICE ARGS FROM driver.flow.compose.json FILES\n');
console.log('Homey CLI adds device args automatically - we should not define them!\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const driverFolders = fs.readdirSync(driversDir).filter(item => {
  return fs.statSync(path.join(driversDir, item)).isDirectory();
});

console.log(`Found ${driverFolders.length} driver folders\n`);

let totalRemoved = 0;
let filesModified = 0;

for (const driverFolder of driverFolders) {
  const flowFilePath = path.join(driversDir, driverFolder, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowFilePath)) continue;
  
  try {
    const data = JSON.parse(fs.readFileSync(flowFilePath, 'utf8'));
    let fileModified = false;
    let removedInFile = 0;
    
    // Process actions
    if (data.actions && Array.isArray(data.actions)) {
      for (const action of data.actions) {
        if (!action.args) continue;
        
        const beforeCount = action.args.length;
        action.args = action.args.filter(arg => arg.name !== 'device');
        const afterCount = action.args.length;
        
        if (beforeCount !== afterCount) {
          const removed = beforeCount - afterCount;
          console.log(`  ✂️  ${driverFolder}/`);
          console.log(`     Action: ${action.id}`);
          console.log(`     Removed ${removed} device arg(s)\n`);
          removedInFile += removed;
          fileModified = true;
        }
      }
    }
    
    // Process triggers
    if (data.triggers && Array.isArray(data.triggers)) {
      for (const trigger of data.triggers) {
        if (!trigger.args) continue;
        
        const beforeCount = trigger.args.length;
        trigger.args = trigger.args.filter(arg => arg.name !== 'device');
        const afterCount = trigger.args.length;
        
        if (beforeCount !== afterCount) {
          const removed = beforeCount - afterCount;
          console.log(`  ✂️  ${driverFolder}/`);
          console.log(`     Trigger: ${trigger.id}`);
          console.log(`     Removed ${removed} device arg(s)\n`);
          removedInFile += removed;
          fileModified = true;
        }
      }
    }
    
    // Process conditions
    if (data.conditions && Array.isArray(data.conditions)) {
      for (const condition of data.conditions) {
        if (!condition.args) continue;
        
        const beforeCount = condition.args.length;
        condition.args = condition.args.filter(arg => arg.name !== 'device');
        const afterCount = condition.args.length;
        
        if (beforeCount !== afterCount) {
          const removed = beforeCount - afterCount;
          console.log(`  ✂️  ${driverFolder}/`);
          console.log(`     Condition: ${condition.id}`);
          console.log(`     Removed ${removed} device arg(s)\n`);
          removedInFile += removed;
          fileModified = true;
        }
      }
    }
    
    if (fileModified) {
      fs.writeFileSync(flowFilePath, JSON.stringify(data, null, 2), 'utf8');
      filesModified++;
      totalRemoved += removedInFile;
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${driverFolder}:`, error.message);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`✅ COMPLETED`);
console.log(`   Drivers checked: ${driverFolders.length}`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total device args removed: ${totalRemoved}`);
console.log(`\n   ℹ️  Homey CLI will automatically add the correct device arg`);
console.log(`      based on the driver folder name during build.`);
console.log(`${'='.repeat(70)}\n`);

process.exit(0);
