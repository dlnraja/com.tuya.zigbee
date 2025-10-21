#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

console.log('\n🔧 FIXING DUPLICATE DEVICE ARGS IN driver.flow.compose.json FILES\n');

async function getAllDriverFlowFiles(dir) {
  const files = [];
  const items = await readdir(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      const subFiles = await getAllDriverFlowFiles(fullPath);
      files.push(...subFiles);
    } else if (item === 'driver.flow.compose.json') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixDuplicateDeviceArgs(actions) {
  let fixedCount = 0;
  
  for (const action of actions) {
    if (!action.args) continue;
    
    const deviceArgs = action.args.filter(arg => arg.name === 'device');
    
    if (deviceArgs.length > 1) {
      console.log(`  ⚠️  Found duplicate in action: ${action.id}`);
      
      // Collect all unique driver_id filters
      const allDriverIds = deviceArgs
        .map(arg => arg.filter)
        .filter(f => f && f.startsWith('driver_id='))
        .map(f => f.replace('driver_id=', ''))
        .filter((v, i, a) => a.indexOf(v) === i); // unique
      
      if (allDriverIds.length > 0) {
        // Remove all device args
        action.args = action.args.filter(arg => arg.name !== 'device');
        
        // Add back a single device arg with merged filters
        action.args.unshift({
          "name": "device",
          "type": "device",
          "filter": `driver_id=${allDriverIds.join('|')}`
        });
        
        console.log(`  ✅ Fixed: merged ${deviceArgs.length} → 1 with filter: ${allDriverIds.join('|')}\n`);
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

async function main() {
  const driversDir = path.join(__dirname, '..', '..', 'drivers');
  const flowFiles = await getAllDriverFlowFiles(driversDir);
  
  console.log(`Found ${flowFiles.length} driver.flow.compose.json files\n`);
  
  let totalFixed = 0;
  let filesModified = 0;
  
  for (const filePath of flowFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.actions && Array.isArray(data.actions)) {
        const fixedInFile = fixDuplicateDeviceArgs(data.actions);
        
        if (fixedInFile > 0) {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
          console.log(`📁 ${path.relative(driversDir, filePath)}: ${fixedInFile} actions fixed\n`);
          totalFixed += fixedInFile;
          filesModified++;
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ COMPLETED`);
  console.log(`   Files checked: ${flowFiles.length}`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Total actions fixed: ${totalFixed}`);
  console.log(`${'='.repeat(60)}\n`);
  
  process.exit(totalFixed > 0 ? 0 : 0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
