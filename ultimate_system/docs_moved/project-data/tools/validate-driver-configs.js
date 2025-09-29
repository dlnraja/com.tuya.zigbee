#!/usr/bin/env node

/**
 * Script to validate Tuya Zigbee driver configurations
 * Ensures all drivers have the required files and configurations
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const chalk = require('chalk');
const { exec } = require('child_process');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const execPromise = promisify(exec);

// Configuration
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const REQUIRED_FILES = [
  'device.js',
  'driver.compose.json',
  'icon.svg',
  'images/large.png',
  'images/small.png',
];

// Required capabilities for different device types
const REQUIRED_CAPABILITIES = {
  'sensor': ['measure_battery', 'alarm_battery'],
  'light': ['onoff', 'dim'],
  'switch': ['onoff'],
  'plug': ['onoff', 'measure_power', 'meter_power'],
  'motion': ['alarm_motion'],
  'contact': ['alarm_contact'],
  'temperature': ['measure_temperature'],
  'humidity': ['measure_humidity'],
};

// Helper functions
const isDirectory = async (filePath) => {
  try {
    const stats = await stat(filePath);
    return stats.isDirectory();
  } catch (err) {
    return false;
  }
};

const fileExists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch (err) {
    return false;
  }
};

const validateDriver = async (driverName) => {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const errors = [];
  const warnings = [];
  
  // Check for required files
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(driverPath, file);
    if (!await fileExists(filePath)) {
      errors.push(`Missing required file: ${file}`);
    }
  }
  
  // Check driver.compose.json
  const composePath = path.join(driverPath, 'driver.compose.json');
  if (await fileExists(composePath)) {
    try {
      const composeData = JSON.parse(await fs.promises.readFile(composePath, 'utf8'));
      
      // Check required fields
      const requiredFields = ['id', 'name', 'icon', 'images', 'capabilities', 'capabilitiesOptions'];
      for (const field of requiredFields) {
        if (!(field in composeData)) {
          errors.push(`Missing required field in driver.compose.json: ${field}`);
        }
      }
      
      // Check for recommended fields
      const recommendedFields = ['description', 'author', 'source', 'homeyCommunityTopicId'];
      for (const field of recommendedFields) {
        if (!(field in composeData)) {
          warnings.push(`Recommended field missing in driver.compose.json: ${field}`);
        }
      }
      
      // Check for required capabilities based on device type
      if (composeData.capabilities) {
        const deviceType = Object.keys(REQUIRED_CAPABILITIES).find(type => 
          driverName.toLowerCase().includes(type)
        );
        
        if (deviceType && REQUIRED_CAPABILITIES[deviceType]) {
          for (const capability of REQUIRED_CAPABILITIES[deviceType]) {
            if (!composeData.capabilities.includes(capability)) {
              warnings.push(`Recommended capability missing for ${deviceType}: ${capability}`);
            }
          }
        }
      }
      
    } catch (err) {
      errors.push(`Error parsing driver.compose.json: ${err.message}`);
    }
  }
  
  // Check device.js
  const deviceJsPath = path.join(driverPath, 'device.js');
  if (await fileExists(deviceJsPath)) {
    try {
      const deviceJs = await fs.promises.readFile(deviceJsPath, 'utf8');
      
      // Check for required methods
      const requiredMethods = ['onInit', 'onAdded', 'onDeleted', 'onSettings'];
      for (const method of requiredMethods) {
        if (!deviceJs.includes(`async ${method}(`)) {
          warnings.push(`Recommended method missing in device.js: ${method}`);
        }
      }
      
      // Check for error handling
      if (!deviceJs.includes('try/catch') && !deviceJs.includes('catch (')) {
        warnings.push('Consider adding error handling with try/catch blocks in device.js');
      }
      
    } catch (err) {
      errors.push(`Error reading device.js: ${err.message}`);
    }
  }
  
  return { errors, warnings };
};

const main = async () => {
  console.log(chalk.blue('\n🔍 Validating Tuya Zigbee driver configurations...\n'));
  
  try {
    const files = await readdir(DRIVERS_DIR);
    const drivers = [];
    
    // Find all driver directories
    for (const file of files) {
      const filePath = path.join(DRIVERS_DIR, file);
      if (await isDirectory(filePath)) {
        drivers.push(file);
      }
    }
    
    if (drivers.length === 0) {
      console.log(chalk.yellow('No driver directories found.'));
      process.exit(0);
    }
    
    console.log(`Found ${drivers.length} drivers to validate.\n`);
    
    let hasErrors = false;
    let hasWarnings = false;
    
    // Validate each driver
    for (const driver of drivers) {
      console.log(chalk.underline(`\nValidating driver: ${driver}`));
      
      const { errors, warnings } = await validateDriver(driver);
      
      if (errors.length > 0) {
        hasErrors = true;
        console.log(chalk.red('  ❌ Validation errors:'));
        for (const error of errors) {
          console.log(`    • ${error}`);
        }
      } else {
        console.log(chalk.green('  ✅ No validation errors'));
      }
      
      if (warnings.length > 0) {
        hasWarnings = true;
        console.log(chalk.yellow('  ⚠️  Validation warnings:'));
        for (const warning of warnings) {
          console.log(`    • ${warning}`);
        }
      } else {
        console.log(chalk.green('  ✅ No validation warnings'));
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold('\nValidation Summary:'));
    
    if (hasErrors) {
      console.log(chalk.red('❌ Some drivers have validation errors that need to be fixed.'));
    } else if (hasWarnings) {
      console.log(chalk.yellow('⚠️  Some drivers have validation warnings that should be reviewed.'));
    } else {
      console.log(chalk.green('✅ All drivers passed validation with no errors or warnings!'));
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Exit with appropriate status code
    if (hasErrors) {
      process.exit(1);
    } else if (hasWarnings) {
      process.exit(0); // Warnings don't fail the build
    } else {
      process.exit(0);
    }
    
  } catch (err) {
    console.error(chalk.red('\n❌ Error during validation:'), err);
    process.exit(1);
  }
};

// Run the main function
main();
