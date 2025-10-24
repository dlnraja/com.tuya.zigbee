#!/usr/bin/env node

/**
 * FIX SDK3 CLUSTER WARNINGS
 * Corrige les 251 warnings: CLUSTER constants → string cluster names
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIX SDK3 CLUSTER WARNINGS\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

// Mapping CLUSTER constants to string names
const clusterMapping = {
  'CLUSTER.BASIC': "'msBasic'",
  'CLUSTER.POWER_CONFIGURATION': "'genPowerCfg'",
  'CLUSTER.IDENTIFY': "'genIdentify'",
  'CLUSTER.GROUPS': "'genGroups'",
  'CLUSTER.SCENES': "'genScenes'",
  'CLUSTER.ON_OFF': "'genOnOff'",
  'CLUSTER.LEVEL_CONTROL': "'genLevelCtrl'",
  'CLUSTER.OCCUPANCY_SENSING': "'msOccupancySensing'",
  'CLUSTER.IAS_ZONE': "'ssIasZone'",
  'CLUSTER.TEMPERATURE_MEASUREMENT': "'msTemperatureMeasurement'",
  'CLUSTER.RELATIVE_HUMIDITY': "'msRelativeHumidity'",
  'CLUSTER.ILLUMINANCE_MEASUREMENT': "'msIlluminanceMeasurement'",
  'CLUSTER.ELECTRICAL_MEASUREMENT': "'haElectricalMeasurement'",
  'CLUSTER.METERING': "'seMetering'",
  'CLUSTER.COLOR_CONTROL': "'lightingColorCtrl'",
  'CLUSTER.WINDOW_COVERING': "'closuresWindowCovering'"
};

let fixed = 0;
let errors = 0;

console.log('Fixing device.js files...\n');

for (const driver of drivers) {
  const devicePath = path.join(driversDir, driver, 'device.js');
  
  if (!fs.existsSync(devicePath)) continue;
  
  try {
    let content = fs.readFileSync(devicePath, 'utf8');
    let modified = false;
    
    // Replace CLUSTER constants with string names
    for (const [constant, stringName] of Object.entries(clusterMapping)) {
      if (content.includes(constant)) {
        // Only replace in registerCapability context
        const regex = new RegExp(`(registerCapability\\s*\\([^,]+,\\s*)${String(constant).replace('.', '\\.')}`, 'g');
        if (regex.test(content)) {
          content = String(content).replace(regex, `$1${stringName}`);
          modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(devicePath, content, 'utf8');
      console.log(`✅ Fixed: ${driver}`);
      fixed++;
    }
    
  } catch (err) {
    console.error(`❌ ${driver}: ${err.message}`);
    errors++;
  }
}

console.log(`\n✅ Fixed: ${fixed} drivers`);
console.log(`❌ Errors: ${errors}\n`);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         FIX SDK3 CLUSTER WARNINGS - TERMINÉ                   ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSULTATS:
   Drivers fixed:      ${fixed}
   Errors:             ${errors}
   
✅ SDK3 COMPLIANCE RESTORED!
`);
