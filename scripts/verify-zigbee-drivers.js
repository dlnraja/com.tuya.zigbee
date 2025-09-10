/**
 * Verify Zigbee Drivers Script
 * 
 * This script checks that all drivers in the project are properly configured as Zigbee drivers
 * and have the required configuration in app.json and driver.compose.json files.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

// Track issues
const issues = {
  missingZigbeeConfig: [],
  missingDriverCompose: [],
  invalidDriverCompose: [],
  missingDeviceJS: [],
  invalidDeviceJS: [],
  missingAppJsonEntry: [],
  invalidAppJsonEntry: []
};

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get all driver directories
 */
async function getDriverDirs() {
  const driverDirs = [];
  
  async function scanDir(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Check if this is a driver directory (contains driver.compose.json)
        const hasDriverCompose = await fileExists(path.join(fullPath, 'driver.compose.json'));
        
        if (hasDriverCompose) {
          driverDirs.push(fullPath);
        } else {
          // Recursively scan subdirectories
          await scanDir(fullPath);
        }
      }
    }
  }
  
  await scanDir(DRIVERS_DIR);
  return driverDirs;
}

/**
 * Verify a driver directory
 */
async function verifyDriver(driverDir) {
  const driverId = path.basename(driverDir);
  const driverComposePath = path.join(driverDir, 'driver.compose.json');
  const deviceJsPath = path.join(driverDir, 'device.js');
  
  // 1. Check driver.compose.json exists
  if (!await fileExists(driverComposePath)) {
    issues.missingDriverCompose.push(driverDir);
    return;
  }
  
  // 2. Check driver.compose.json is valid
  let driverCompose;
  try {
    const content = await readFile(driverComposePath, 'utf8');
    driverCompose = JSON.parse(content);
    
    // Check for required fields
    if (!driverCompose.id || !driverCompose.name || !driverCompose.class) {
      issues.invalidDriverCompose.push({
        path: driverComposePath,
        issue: 'Missing required fields (id, name, or class)'
      });
    }
    
    // Check for Zigbee configuration
    if (!driverCompose.zigbee) {
      issues.missingZigbeeConfig.push({
        path: driverComposePath,
        driver: driverCompose.id || driverId
      });
    } else {
      // Validate Zigbee configuration
      const zigbee = driverCompose.zigbee;
      if (!zigbee.manufacturerName || !Array.isArray(zigbee.manufacturerName) || zigbee.manufacturerName.length === 0) {
        issues.invalidDriverCompose.push({
          path: driverComposePath,
          issue: 'Missing or invalid manufacturerName in Zigbee config'
        });
      }
      
      if (!zigbee.productId || !Array.isArray(zigbee.productId) || zigbee.productId.length === 0) {
        issues.invalidDriverCompose.push({
          path: driverComposePath,
          issue: 'Missing or invalid productId in Zigbee config'
        });
      }
      
      if (!zigbee.endpoints || typeof zigbee.endpoints !== 'object') {
        issues.invalidDriverCompose.push({
          path: driverComposePath,
          issue: 'Missing or invalid endpoints in Zigbee config'
        });
      }
    }
    
  } catch (err) {
    issues.invalidDriverCompose.push({
      path: driverComposePath,
      issue: `Failed to parse JSON: ${err.message}`
    });
    return;
  }
  
  // 3. Check device.js exists
  if (!await fileExists(deviceJsPath)) {
    issues.missingDeviceJS.push(driverDir);
    return;
  }
  
  // 4. Check device.js extends a Zigbee device class
  try {
    const content = await readFile(deviceJsPath, 'utf8');
    
    // Simple check for Zigbee device class extension
    const isZigbeeDevice = content.includes('extends BaseZigbeeDevice') || 
                          content.includes('extends ZigBeeDevice') ||
                          content.includes('extends ZigbeeDevice');
    
    if (!isZigbeeDevice) {
      issues.invalidDeviceJS.push({
        path: deviceJsPath,
        issue: 'Device class does not extend a Zigbee device base class'
      });
    }
  } catch (err) {
    issues.invalidDeviceJS.push({
      path: deviceJsPath,
      issue: `Failed to read/parse device.js: ${err.message}`
    });
  }
}

/**
 * Verify app.json entries
 */
async function verifyAppJson() {
  try {
    const content = await readFile(APP_JSON_PATH, 'utf8');
    const appJson = JSON.parse(content);
    
    if (!appJson.drivers || !Array.isArray(appJson.drivers)) {
      console.error('No drivers array found in app.json');
      return;
    }
    
    // Get all driver directories
    const driverDirs = await getDriverDirs();
    const driverIds = driverDirs.map(dir => path.basename(dir));
    
    // Check each driver in app.json
    for (const driver of appJson.drivers) {
      if (!driver.id) {
        issues.invalidAppJsonEntry.push({
          issue: 'Driver entry missing id',
          driver: JSON.stringify(driver, null, 2)
        });
        continue;
      }
      
      // Check if driver directory exists
      if (!driverIds.includes(driver.id)) {
        issues.missingAppJsonEntry.push({
          driver: driver.id,
          issue: 'Driver directory not found'
        });
      }
      
      // Check Zigbee configuration
      if (!driver.zigbee) {
        issues.missingZigbeeConfig.push({
          path: 'app.json',
          driver: driver.id
        });
      }
    }
    
    // Check for drivers in filesystem not in app.json
    for (const driverId of driverIds) {
      const driverInAppJson = appJson.drivers.some(d => d.id === driverId);
      if (!driverInAppJson) {
        issues.missingAppJsonEntry.push({
          driver: driverId,
          issue: 'Driver not found in app.json'
        });
      }
    }
    
  } catch (err) {
    console.error(`Error processing app.json: ${err.message}`);
  }
}

/**
 * Print report of issues
 */
function printReport() {
  console.log('\n=== Zigbee Driver Verification Report ===\n');
  
  // Missing Zigbee config
  if (issues.missingZigbeeConfig.length > 0) {
    console.log('❌ Missing Zigbee Configuration:');
    issues.missingZigbeeConfig.forEach(issue => {
      console.log(`  - ${issue.driver || 'Unknown'}: ${issue.path || 'Unknown path'}`);
    });
    console.log();
  }
  
  // Missing driver.compose.json
  if (issues.missingDriverCompose.length > 0) {
    console.log('❌ Missing driver.compose.json:');
    issues.missingDriverCompose.forEach(path => {
      console.log(`  - ${path}`);
    });
    console.log();
  }
  
  // Invalid driver.compose.json
  if (issues.invalidDriverCompose.length > 0) {
    console.log('❌ Invalid driver.compose.json:');
    issues.invalidDriverCompose.forEach(({path, issue}) => {
      console.log(`  - ${path}: ${issue}`);
    });
    console.log();
  }
  
  // Missing device.js
  if (issues.missingDeviceJS.length > 0) {
    console.log('❌ Missing device.js:');
    issues.missingDeviceJS.forEach(path => {
      console.log(`  - ${path}`);
    });
    console.log();
  }
  
  // Invalid device.js
  if (issues.invalidDeviceJS.length > 0) {
    console.log('❌ Invalid device.js:');
    issues.invalidDeviceJS.forEach(({path, issue}) => {
      console.log(`  - ${path}: ${issue}`);
    });
    console.log();
  }
  
  // Missing app.json entries
  if (issues.missingAppJsonEntry.length > 0) {
    console.log('❌ App.json Issues:');
    issues.missingAppJsonEntry.forEach(({driver, issue}) => {
      console.log(`  - ${driver}: ${issue}`);
    });
    console.log();
  }
  
  // Invalid app.json entries
  if (issues.invalidAppJsonEntry.length > 0) {
    console.log('❌ Invalid app.json Entries:');
    issues.invalidAppJsonEntry.forEach(({driver, issue}) => {
      console.log(`  - ${driver}: ${issue}`);
    });
    console.log();
  }
  
  // Summary
  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalIssues === 0) {
    console.log('✅ All drivers are properly configured as Zigbee devices!');
  } else {
    console.log(`\nFound ${totalIssues} issues that need to be addressed.`);
    console.log('Please fix the issues listed above before proceeding.');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Verifying Zigbee drivers...');
  
  // Get all driver directories
  const driverDirs = await getDriverDirs();
  
  if (driverDirs.length === 0) {
    console.error('No driver directories found!');
    return;
  }
  
  console.log(`Found ${driverDirs.length} driver directories to verify.`);
  
  // Verify each driver
  for (const dir of driverDirs) {
    await verifyDriver(dir);
  }
  
  // Verify app.json
  await verifyAppJson();
  
  // Print report
  printReport();
  
  // Exit with appropriate status code
  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
  process.exit(totalIssues > 0 ? 1 : 0);
}

// Run the script
main().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
});
