#!/usr/bin/env node
'use strict';

/**
 * SDK3 VALIDATION: Bindings Configuration
 * 
 * Vérifie que les bindings sont correctement configurés selon les capabilities:
 * - onoff → binding [6]
 * - dim → binding [8]
 * - light_hue/saturation/temperature → binding [768]
 * - measure_temperature → binding [1026]
 * - etc.
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 SDK3 VALIDATION: Bindings Configuration\n');

// Mapping capability → bindings requis
const CAPABILITY_BINDINGS = {
  'onoff': [6],
  'dim': [8],
  'light_hue': [768],
  'light_saturation': [768],
  'light_temperature': [768],
  'light_mode': [768],
  'measure_temperature': [1026],
  'measure_humidity': [1029],
  'measure_luminance': [1024],
  'measure_power': [2820],
  'meter_power': [1794],
  'alarm_motion': [1030]
};

const appJsonPath = path.join(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

let issues = [];
let checked = 0;

appJson.drivers.forEach(driver => {
  if (!driver.zigbee || !driver.zigbee.endpoints) return;
  if (!driver.capabilities) return;
  
  checked++;
  
  // Get all bindings from all endpoints
  const allBindings = [];
  Object.values(driver.zigbee.endpoints).forEach(ep => {
    if (ep.bindings) allBindings.push(...ep.bindings);
  });
  
  // Check each capability
  driver.capabilities.forEach(cap => {
    const requiredBindings = CAPABILITY_BINDINGS[cap];
    if (!requiredBindings) return; // Unknown capability
    
    // Check if required bindings are present
    const missingBindings = requiredBindings.filter(b => !allBindings.includes(b));
    
    if (missingBindings.length > 0) {
      issues.push({
        driver: driver.id,
        capability: cap,
        missing: missingBindings,
        current: allBindings
      });
    }
  });
});

console.log('='.repeat(60));
console.log('VALIDATION RESULTS');
console.log('='.repeat(60) + '\n');

console.log(`📊 Drivers checked: ${checked}`);
console.log(`⚠️  Issues found: ${issues.length}\n`);

if (issues.length > 0) {
  console.log('🔴 MISSING BINDINGS:\n');
  
  issues.slice(0, 20).forEach(issue => {
    console.log(`   Driver: ${issue.driver}`);
    console.log(`   Capability: ${issue.capability}`);
    console.log(`   Missing bindings: ${issue.missing.join(', ')}`);
    console.log(`   Current bindings: ${issue.current.join(', ') || 'none'}`);
    console.log('');
  });
  
  if (issues.length > 20) {
    console.log(`   ... and ${issues.length - 20} more\n`);
  }
}

// Display cluster reference
console.log('='.repeat(60));
console.log('CLUSTER REFERENCE');
console.log('='.repeat(60) + '\n');

console.log('Common Zigbee Clusters:');
console.log('  6     - On/Off');
console.log('  8     - Level Control (Dim)');
console.log('  768   - Color Control (RGB/CCT)');
console.log('  1026  - Temperature Measurement');
console.log('  1029  - Humidity Measurement');
console.log('  1024  - Illuminance Measurement');
console.log('  1030  - Occupancy Sensing');
console.log('  2820  - Electrical Measurement (Power)');
console.log('  1794  - Metering (Energy)');
console.log('  1280  - IAS Zone (Security)');
console.log('');

// Recommendations
console.log('='.repeat(60));
console.log('RECOMMENDATIONS');
console.log('='.repeat(60) + '\n');

console.log('✅ Bindings enable automatic reporting from device to Homey');
console.log('✅ Without bindings, you need manual polling (less efficient)');
console.log('✅ Add bindings matching your device capabilities\n');

console.log('Example configuration:');
console.log('{');
console.log('  "endpoints": {');
console.log('    "1": {');
console.log('      "clusters": [0, 3, 4, 5, 6, 8, 768],');
console.log('      "bindings": [6, 8, 768]  // On/Off + Dim + Color');
console.log('    }');
console.log('  }');
console.log('}\n');

if (issues.length === 0) {
  console.log('✅ All bindings are correctly configured!\n');
  process.exit(0);
} else {
  // Save report
  const reportPath = path.join(__dirname, '../../docs/audit/bindings-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
  console.log(`📄 Report saved to: docs/audit/bindings-report.json\n`);
  
  console.log(`ℹ️  ${issues.length} drivers may benefit from additional bindings\n`);
  process.exit(0);
}
