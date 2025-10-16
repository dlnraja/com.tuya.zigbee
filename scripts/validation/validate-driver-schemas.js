#!/usr/bin/env node
'use strict';

/**
 * Validate Driver Schemas
 * Checks all driver.compose.json files for required fields and valid structure
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = ['id', 'name', 'class', 'capabilities', 'zigbee'];
const REQUIRED_ZIGBEE_FIELDS = ['manufacturerName', 'productId', 'endpoints', 'learnmode'];

let totalDrivers = 0;
let validDrivers = 0;
let invalidDrivers = 0;
const errors = [];

console.log('========================================');
console.log('  DRIVER SCHEMA VALIDATION');
console.log('========================================\n');

// Get all driver directories
const driversPath = path.join(process.cwd(), 'drivers');
const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`Found ${driverDirs.length} driver directories\n`);

// Validate each driver
driverDirs.forEach(driverName => {
  totalDrivers++;
  
  const driverPath = path.join(driversPath, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  // Check if driver.compose.json exists
  if (!fs.existsSync(composePath)) {
    invalidDrivers++;
    errors.push({
      driver: driverName,
      error: 'Missing driver.compose.json'
    });
    console.log(`❌ ${driverName}: Missing driver.compose.json`);
    return;
  }
  
  try {
    // Parse JSON
    const driverData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Validate required fields
    const missingFields = [];
    REQUIRED_FIELDS.forEach(field => {
      if (!driverData[field]) {
        missingFields.push(field);
      }
    });
    
    // Validate Zigbee fields
    if (driverData.zigbee) {
      REQUIRED_ZIGBEE_FIELDS.forEach(field => {
        if (!driverData.zigbee[field]) {
          missingFields.push(`zigbee.${field}`);
        }
      });
    }
    
    if (missingFields.length > 0) {
      invalidDrivers++;
      errors.push({
        driver: driverName,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
      console.log(`❌ ${driverName}: Missing ${missingFields.join(', ')}`);
    } else {
      validDrivers++;
      console.log(`✅ ${driverName}`);
    }
    
  } catch (err) {
    invalidDrivers++;
    errors.push({
      driver: driverName,
      error: `Invalid JSON: ${err.message}`
    });
    console.log(`❌ ${driverName}: Invalid JSON - ${err.message}`);
  }
});

// Summary
console.log('\n========================================');
console.log('  VALIDATION SUMMARY');
console.log('========================================\n');
console.log(`Total Drivers:   ${totalDrivers}`);
console.log(`Valid:           ${validDrivers} (${Math.round(validDrivers/totalDrivers*100)}%)`);
console.log(`Invalid:         ${invalidDrivers} (${Math.round(invalidDrivers/totalDrivers*100)}%)`);

if (errors.length > 0) {
  console.log('\n========================================');
  console.log('  ERRORS DETAILS');
  console.log('========================================\n');
  errors.forEach(err => {
    console.log(`Driver: ${err.driver}`);
    console.log(`Error:  ${err.error}\n`);
  });
}

// Write JSON report
const report = {
  timestamp: new Date().toISOString(),
  total: totalDrivers,
  valid: validDrivers,
  invalid: invalidDrivers,
  health_score: Math.round(validDrivers/totalDrivers*100),
  errors: errors
};

fs.writeFileSync('schema-validation-report.json', JSON.stringify(report, null, 2));
console.log('Report saved to: schema-validation-report.json');

// Exit with error code if there are invalid drivers
process.exit(invalidDrivers > 0 ? 1 : 0);
