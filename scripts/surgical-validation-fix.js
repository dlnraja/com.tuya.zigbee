#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function surgicalValidationFix() {
  console.log('🔬 SURGICAL VALIDATION FIX - Removing problematic drivers...\n');
  
  const appJsonPath = path.join(process.cwd(), 'app.json');
  const content = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(content);
  
  let modified = false;
  const problematicDrivers = ['sensors-TS0601_motion', 'tuya'];
  
  // Remove problematic drivers entirely
  for (let i = appJson.drivers.length - 1; i >= 0; i--) {
    const driver = appJson.drivers[i];
    if (problematicDrivers.includes(driver.id)) {
      console.log(`🗑️ Removing problematic driver: ${driver.id}`);
      appJson.drivers.splice(i, 1);
      modified = true;
    }
  }
  
  // Also remove utility/template drivers that cause validation issues
  const utilityDrivers = ['_base', '_template', '_templates', 'templates', 'types', 'common', 'manufacturers', 'protocols'];
  
  for (let i = appJson.drivers.length - 1; i >= 0; i--) {
    const driver = appJson.drivers[i];
    if (utilityDrivers.includes(driver.id)) {
      console.log(`🗑️ Removing utility driver: ${driver.id}`);
      appJson.drivers.splice(i, 1);
      modified = true;
    }
  }
  
  if (modified) {
    await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('💾 Saved cleaned app.json');
    console.log(`📊 Removed ${problematicDrivers.length + utilityDrivers.length} problematic drivers`);
  }
  
  // Show remaining drivers
  console.log('\n📋 Remaining drivers:');
  appJson.drivers.forEach(driver => {
    console.log(`  - ${driver.id}: ${driver.name?.en || driver.name || 'No name'}`);
  });
  
  console.log(`\n✅ Total drivers remaining: ${appJson.drivers.length}`);
}

if (require.main === module) {
  surgicalValidationFix()
    .then(() => console.log('\n🚀 Surgical fix completed'))
    .catch(console.error);
}

module.exports = { surgicalValidationFix };
