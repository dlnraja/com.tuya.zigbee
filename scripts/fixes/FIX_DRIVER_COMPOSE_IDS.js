#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIXING driver.compose.json FILES\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

let totalFixed = 0;

for (const driverFolder of drivers) {
  const fullPath = path.join(driversDir, driverFolder);
  const stat = fs.statSync(fullPath);
  
  if (!stat.isDirectory()) continue;
  
  const composeFile = path.join(fullPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) continue;
  
  try {
    let content = fs.readFileSync(composeFile, 'utf8');
    const originalContent = content;
    
    // Apply all fixes
    content = String(content).replace(/ikea_ikea_/g, 'ikea_');
    content = String(content).replace(/_other_other/g, '_other');
    content = String(content).replace(/_aaa_aaa/g, '_aaa');
    content = String(content).replace(/_aa_aa/g, '_aa');
    content = String(content).replace(/_internal_internal/g, '_internal');
    
    if (content !== originalContent) {
      fs.writeFileSync(composeFile, content, 'utf8');
      console.log(`  ✅ Fixed: ${driverFolder}/driver.compose.json`);
      totalFixed++;
    }
    
  } catch (error) {
    console.error(`  ❌ Error in ${driverFolder}:`, error.message);
  }
}

console.log(`\n✅ Fixed ${totalFixed} driver.compose.json files\n`);

process.exit(0);
