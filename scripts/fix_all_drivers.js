#!/usr/bin/env node
/**
 * Fix All Drivers - Ensure all driver.js files properly extend ZigBeeDriver
 * v5.3.46
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

// Standard driver.js template
const createDriverJs = (driverName) => {
  // Convert driver name to class name (snake_case to PascalCase)
  const className = driverName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Driver';

  return `'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDriver {

  async onInit() {
    this.log('${className} initialized');
  }

}

module.exports = ${className};
`;
};

// Get all driver directories
const drivers = fs.readdirSync(driversDir).filter(d => {
  const stat = fs.statSync(path.join(driversDir, d));
  return stat.isDirectory();
});

let fixed = 0;
let skipped = 0;

console.log('🔧 Fixing driver.js files...\n');

for (const driver of drivers) {
  const driverJsPath = path.join(driversDir, driver, 'driver.js');

  if (!fs.existsSync(driverJsPath)) {
    console.log(`❌ ${driver}: No driver.js found - CREATING`);
    fs.writeFileSync(driverJsPath, createDriverJs(driver));
    fixed++;
    continue;
  }

  const content = fs.readFileSync(driverJsPath, 'utf8');

  // Check if it properly extends ZigBeeDriver
  const hasProperExtend = content.includes('extends ZigBeeDriver');
  const hasProperImport = content.includes("require('homey-zigbeedriver')");

  if (!hasProperExtend || !hasProperImport) {
    console.log(`🔧 ${driver}: Fixing driver.js (was not extending ZigBeeDriver properly)`);
    fs.writeFileSync(driverJsPath, createDriverJs(driver));
    fixed++;
  } else {
    skipped++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Fixed: ${fixed}`);
console.log(`⏭️ Skipped (already OK): ${skipped}`);
console.log(`📊 Total drivers: ${drivers.length}`);
console.log('='.repeat(60));
