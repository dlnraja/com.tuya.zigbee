#!/usr/bin/env node

/**
 * Fix SDK3 Compliance: alarm_battery → measure_battery
 * 
 * SDK3 DEPRECATED: alarm_battery
 * SDK3 REQUIRED: measure_battery + energy.batteries
 * 
 * This script:
 * 1. Scans all driver.compose.json files
 * 2. Replaces alarm_battery with measure_battery
 * 3. Ensures energy.batteries is present
 * 4. Updates device.js files to use correct capability
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

let stats = {
  driversScanned: 0,
  driversFixed: 0,
  capabilitiesFixed: 0,
  energyAdded: 0,
  deviceJsFixed: 0,
  errors: []
};

/**
 * Fix driver.compose.json
 */
function fixDriverCompose(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const driver = JSON.parse(content);
    let modified = false;

    // Fix capabilities
    if (driver.capabilities && Array.isArray(driver.capabilities)) {
      const alarmBatteryIndex = driver.capabilities.indexOf('alarm_battery');
      if (alarmBatteryIndex !== -1) {
        driver.capabilities[alarmBatteryIndex] = 'measure_battery';
        stats.capabilitiesFixed++;
        modified = true;
        console.log(`  ✓ Fixed capability: alarm_battery → measure_battery`);
      }
    }

    // Ensure energy.batteries exists for battery-powered devices
    if (driver.capabilities && driver.capabilities.includes('measure_battery')) {
      if (!driver.energy) {
        driver.energy = {};
        modified = true;
      }
      
      if (!driver.energy.batteries) {
        // Determine battery type from driver name
        const driverName = path.basename(path.dirname(filePath));
        let batteries = ['CR2032']; // Default
        
        if (driverName.includes('cr2450')) {
          batteries = ['CR2450'];
        } else if (driverName.includes('aaa')) {
          batteries = ['AAA'];
        } else if (driverName.includes('aa') && !driverName.includes('aaa')) {
          batteries = ['AA'];
        } else if (driverName.includes('hybrid') || driverName.includes('button_') || driverName.includes('sensor_')) {
          // Hybrid drivers support multiple battery types
          batteries = ['CR2032', 'CR2450', 'AAA'];
        }
        
        driver.energy.batteries = batteries;
        stats.energyAdded++;
        modified = true;
        console.log(`  ✓ Added energy.batteries: ${JSON.stringify(batteries)}`);
      }
    }

    // Fix capabilitiesOptions if present
    if (driver.capabilitiesOptions) {
      if (driver.capabilitiesOptions.alarm_battery) {
        driver.capabilitiesOptions.measure_battery = driver.capabilitiesOptions.alarm_battery;
        delete driver.capabilitiesOptions.alarm_battery;
        modified = true;
        console.log(`  ✓ Fixed capabilitiesOptions: alarm_battery → measure_battery`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(driver, null, 2));
      stats.driversFixed++;
      return true;
    }
    
    return false;
  } catch (err) {
    stats.errors.push({ file: filePath, error: err.message });
    console.error(`  ✗ Error processing ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * Fix device.js files
 */
function fixDeviceJs(dirPath) {
  const deviceJsPath = path.join(dirPath, 'device.js');
  
  if (!fs.existsSync(deviceJsPath)) {
    return false;
  }

  try {
    let content = fs.readFileSync(deviceJsPath, 'utf8');
    let modified = false;

    // Replace alarm_battery with measure_battery in code
    const patterns = [
      { from: /['"]alarm_battery['"]/g, to: "'measure_battery'" },
      { from: /\.alarm_battery/g, to: '.measure_battery' },
      { from: /\['alarm_battery'\]/g, to: "['measure_battery']" },
      { from: /\["alarm_battery"\]/g, to: "['measure_battery']" },
      { from: /registerCapability\('alarm_battery'/g, to: "registerCapability('measure_battery'" },
      { from: /setCapabilityValue\('alarm_battery'/g, to: "setCapabilityValue('measure_battery'" },
      { from: /getCapabilityValue\('alarm_battery'/g, to: "getCapabilityValue('measure_battery'" }
    ];

    patterns.forEach(pattern => {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(deviceJsPath, content);
      stats.deviceJsFixed++;
      console.log(`  ✓ Fixed device.js: alarm_battery → measure_battery`);
      return true;
    }

    return false;
  } catch (err) {
    stats.errors.push({ file: deviceJsPath, error: err.message });
    console.error(`  ✗ Error processing ${deviceJsPath}: ${err.message}`);
    return false;
  }
}

/**
 * Scan all drivers
 */
function scanAndFixDrivers() {
  console.log('🔍 Scanning all drivers for SDK3 compliance issues...\n');

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(name => {
    const fullPath = path.join(DRIVERS_DIR, name);
    return fs.statSync(fullPath).isDirectory();
  });

  driverDirs.forEach(driverName => {
    const driverDir = path.join(DRIVERS_DIR, driverName);
    const composeFile = path.join(driverDir, 'driver.compose.json');

    if (!fs.existsSync(composeFile)) {
      return; // Skip if no driver.compose.json
    }

    stats.driversScanned++;
    
    console.log(`📁 ${driverName}`);
    
    const composeFixed = fixDriverCompose(composeFile);
    const deviceFixed = fixDeviceJs(driverDir);
    
    if (!composeFixed && !deviceFixed) {
      console.log(`  ✓ Already SDK3 compliant`);
    }
    
    console.log('');
  });
}

/**
 * Generate report
 */
function generateReport() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SDK3 COMPLIANCE FIX REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Drivers scanned:        ${stats.driversScanned}`);
  console.log(`Drivers fixed:          ${stats.driversFixed}`);
  console.log(`Capabilities fixed:     ${stats.capabilitiesFixed}`);
  console.log(`Energy.batteries added: ${stats.energyAdded}`);
  console.log(`Device.js files fixed:  ${stats.deviceJsFixed}`);
  console.log(`Errors encountered:     ${stats.errors.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERRORS:');
    stats.errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }

  // Save report
  const reportPath = path.join(__dirname, '..', 'SDK3_COMPLIANCE_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    date: new Date().toISOString(),
    stats,
    summary: {
      totalDrivers: stats.driversScanned,
      fixedDrivers: stats.driversFixed,
      complianceRate: `${((stats.driversScanned - stats.driversFixed) / stats.driversScanned * 100).toFixed(1)}%`
    }
  }, null, 2));
  
  console.log(`\n✅ Report saved: SDK3_COMPLIANCE_REPORT.json`);
}

// Main execution
console.log('🚀 SDK3 COMPLIANCE FIX TOOL\n');
console.log('This will replace all alarm_battery with measure_battery');
console.log('and ensure energy.batteries is present.\n');

scanAndFixDrivers();
generateReport();

console.log('\n✅ SDK3 compliance fix complete!');
console.log('\nNext steps:');
console.log('1. Run: homey app validate --level publish');
console.log('2. Test battery-powered devices');
console.log('3. Commit changes');
