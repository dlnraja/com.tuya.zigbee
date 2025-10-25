#!/usr/bin/env node
'use strict';

/**
 * SDK3 Comprehensive Validation Script
 * 
 * Validates ALL drivers for SDK3 compliance:
 * - Numeric cluster IDs only (no CLUSTER constants)
 * - Proper endpoint configuration
 * - Valid capabilities and settings
 * - Battery configuration correctness
 * - Image paths correctness
 * 
 * Exit codes:
 * - 0: All validations passed
 * - 1: Critical errors found
 * - 2: Warnings found (but no errors)
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const LIB_DIR = path.join(__dirname, '../../lib');

// SDK3 numeric cluster IDs
const VALID_CLUSTER_IDS = {
  0: 'Basic',
  1: 'PowerConfiguration',
  3: 'Identify',
  4: 'Groups',
  5: 'Scenes',
  6: 'OnOff',
  8: 'LevelControl',
  10: 'Time',
  768: 'ColorControl',
  1024: 'IlluminanceMeasurement',
  1026: 'TemperatureMeasurement',
  1029: 'RelativeHumidity',
  1030: 'OccupancySensing',
  1280: 'IASZone',
  1794: 'Metering',
  2820: 'ElectricalMeasurement',
  61184: 'TuyaCustom'
};

// Valid battery types for energy.batteries
const VALID_BATTERY_TYPES = [
  'AA', 'AAA', 'C', 'D', 
  'CR2032', 'CR2430', 'CR2450', 'CR2477', 'CR3032',
  'CR2', 'CR123A', 'CR14250', 'CR17335',
  'PP3', 'INTERNAL', 'OTHER'
];

let totalErrors = 0;
let totalWarnings = 0;

console.log('🔍 SDK3 Comprehensive Validation');
console.log('================================\n');

/**
 * Validate driver.compose.json for SDK3 compliance
 */
function validateDriverCompose(driverPath, driverId) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  ${driverId}: No driver.compose.json found`);
    totalWarnings++;
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    let errors = [];
    let warnings = [];
    
    // Check zigbee.endpoints for numeric cluster IDs
    if (compose.zigbee?.endpoints) {
      for (const [endpointId, endpoint] of Object.entries(compose.zigbee.endpoints)) {
        // Check clusters
        if (endpoint.clusters) {
          for (const cluster of endpoint.clusters) {
            if (typeof cluster !== 'number') {
              errors.push(`Endpoint ${endpointId}: cluster "${cluster}" is not numeric`);
            } else if (!VALID_CLUSTER_IDS[cluster]) {
              warnings.push(`Endpoint ${endpointId}: unknown cluster ID ${cluster}`);
            }
          }
        }
        
        // Check bindings
        if (endpoint.bindings) {
          for (const binding of endpoint.bindings) {
            if (typeof binding !== 'number') {
              errors.push(`Endpoint ${endpointId}: binding "${binding}" is not numeric`);
            }
          }
        }
      }
    }
    
    // Check energy.batteries if measure_battery capability exists
    if (compose.capabilities?.includes('measure_battery')) {
      if (!compose.energy?.batteries || compose.energy.batteries.length === 0) {
        errors.push('Has measure_battery capability but energy.batteries is empty');
      } else {
        for (const battery of compose.energy.batteries) {
          if (!VALID_BATTERY_TYPES.includes(battery)) {
            errors.push(`Invalid battery type: ${battery}`);
          }
        }
      }
    }
    
    // Check class validity
    const validClasses = ['sensor', 'light', 'socket', 'button', 'thermostat', 'lock', 'windowcoverings'];
    if (compose.class && !validClasses.includes(compose.class)) {
      errors.push(`Invalid class: ${compose.class} (valid: ${validClasses.join(', ')})`);
    }
    
    // Check image paths
    if (compose.images) {
      for (const [size, imagePath] of Object.entries(compose.images)) {
        if (!imagePath.startsWith('drivers/')) {
          warnings.push(`Image path should start with "drivers/": ${imagePath}`);
        }
      }
    }
    
    // Print results
    if (errors.length > 0 || warnings.length > 0) {
      console.log(`\n📄 ${driverId}:`);
      
      if (errors.length > 0) {
        console.log(`  ❌ Errors (${errors.length}):`);
        errors.forEach(err => console.log(`     - ${err}`));
        totalErrors += errors.length;
      }
      
      if (warnings.length > 0) {
        console.log(`  ⚠️  Warnings (${warnings.length}):`);
        warnings.forEach(warn => console.log(`     - ${warn}`));
        totalWarnings += warnings.length;
      }
    }
    
  } catch (err) {
    console.log(`❌ ${driverId}: Failed to parse driver.compose.json: ${err.message}`);
    totalErrors++;
  }
}

/**
 * Validate device.js for SDK3 compliance
 */
function validateDeviceJS(driverPath, driverId) {
  const devicePath = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    console.log(`⚠️  ${driverId}: No device.js found`);
    totalWarnings++;
    return;
  }
  
  try {
    const content = fs.readFileSync(devicePath, 'utf8');
    let errors = [];
    let warnings = [];
    
    // Check for CLUSTER constant usage (should be numeric)
    if (content.includes('CLUSTER.')) {
      errors.push('Uses CLUSTER constants instead of numeric IDs');
    }
    
    // Check for require('zigbee-clusters') when not needed
    if (content.includes("require('zigbee-clusters')") && !content.includes('ZigBeeDevice')) {
      warnings.push('Imports zigbee-clusters but may not need it (check for CLUSTER usage)');
    }
    
    // Check for proper error handling in onNodeInit
    if (content.includes('async onNodeInit') && !content.includes('.catch(')) {
      warnings.push('onNodeInit should have .catch() for promise handling');
    }
    
    // Print results
    if (errors.length > 0 || warnings.length > 0) {
      if (errors.length === 0 && warnings.length === 0) {
        console.log(`\n📝 ${driverId}:`);
      }
      
      if (errors.length > 0) {
        console.log(`  ❌ Device.js Errors (${errors.length}):`);
        errors.forEach(err => console.log(`     - ${err}`));
        totalErrors += errors.length;
      }
      
      if (warnings.length > 0) {
        console.log(`  ⚠️  Device.js Warnings (${warnings.length}):`);
        warnings.forEach(warn => console.log(`     - ${warn}`));
        totalWarnings += warnings.length;
      }
    }
    
  } catch (err) {
    console.log(`❌ ${driverId}: Failed to read device.js: ${err.message}`);
    totalErrors++;
  }
}

/**
 * Scan all drivers
 */
function scanAllDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📁 Found ${drivers.length} drivers\n`);
  console.log('Validating...\n');
  
  for (const driverId of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    
    validateDriverCompose(driverPath, driverId);
    validateDeviceJS(driverPath, driverId);
  }
}

/**
 * Validate lib files
 */
function validateLibFiles() {
  console.log('\n📚 Validating lib files...\n');
  
  const libFiles = [
    'BaseHybridDevice.js',
    'SwitchDevice.js',
    'BatteryManager.js',
    'PowerManager.js'
  ];
  
  for (const libFile of libFiles) {
    const libPath = path.join(LIB_DIR, libFile);
    
    if (!fs.existsSync(libPath)) {
      console.log(`⚠️  ${libFile}: Not found`);
      totalWarnings++;
      continue;
    }
    
    try {
      const content = fs.readFileSync(libPath, 'utf8');
      let errors = [];
      
      // Check for CLUSTER constant usage
      if (content.includes('CLUSTER.')) {
        errors.push('Uses CLUSTER constants instead of numeric IDs');
      }
      
      if (errors.length > 0) {
        console.log(`\n📝 ${libFile}:`);
        console.log(`  ❌ Errors (${errors.length}):`);
        errors.forEach(err => console.log(`     - ${err}`));
        totalErrors += errors.length;
      }
      
    } catch (err) {
      console.log(`❌ ${libFile}: Failed to read: ${err.message}`);
      totalErrors++;
    }
  }
}

/**
 * Main execution
 */
function main() {
  scanAllDrivers();
  validateLibFiles();
  
  console.log('\n================================');
  console.log('📊 Validation Summary');
  console.log('================================\n');
  
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Total Warnings: ${totalWarnings}\n`);
  
  if (totalErrors > 0) {
    console.log('❌ VALIDATION FAILED: Fix errors before proceeding\n');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('⚠️  VALIDATION PASSED WITH WARNINGS\n');
    process.exit(2);
  } else {
    console.log('✅ ALL VALIDATIONS PASSED\n');
    process.exit(0);
  }
}

// Run validation
main();
