const fs = require('fs');
const path = require('path');

console.log('🎭 ORCHESTRATOR FINAL - v2.15.110\n');

// PHASE 1: Diagnostic
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
console.log(`📊 Version: ${appJson.version}`);
console.log(`📦 Drivers: ${Object.keys(appJson.drivers).length}\n`);

// PHASE 2: Fix IAS Zone bugs
console.log('🔧 Fixing IAS Zone bugs...');

const iasDrivers = [
  'motion_temp_humidity_illumination_multi_battery',
  'sos_emergency_button_cr2032'
];

let fixed = 0;
for (const driver of iasDrivers) {
  const devicePath = path.join(__dirname, 'drivers', driver, 'device.js');
  if (fs.existsSync(devicePath)) {
    let content = fs.readFileSync(devicePath, 'utf8');
    
    // Fix: v.replace is not a function
    if (content.includes('homeyIeee.replace')) {
      content = String(content).replace(
        /homeyIeee\.replace\(/g,
        'String(homeyIeee).replace('
      );
      fs.writeFileSync(devicePath, content);
      console.log(`  ✓ Fixed ${driver}`);
      fixed++;
    }
  }
}

console.log(`✅ ${fixed} IAS bugs fixed\n`);

// PHASE 3: Clean temp files
console.log('🧹 Cleaning temp files...');
const tempFiles = fs.readdirSync(__dirname).filter(f => 
  f.match(/\.(cmd|bat)$/) && !f.includes('ORCHESTRATOR')
);
console.log(`✅ ${tempFiles.length} temp files found\n`);

// PHASE 4: Summary
console.log('📋 SUMMARY:');
console.log(`  Drivers: ${Object.keys(appJson.drivers).length}`);
console.log(`  IAS fixes: ${fixed}`);
console.log(`  Version: ${appJson.version}`);
console.log('\n✅ Orchestration complete!\n');
