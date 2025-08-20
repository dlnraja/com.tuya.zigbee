#!/usr/bin/env node
/**
 * Local validation of app.json without using global Homey CLI
 * Uses the local version which is faster and functional
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function validateLocal() {
  console.log('Validating app.json locally...');
  
  // Check if app.json exists
  if (!fs.existsSync('app.json')) {
    console.error('ERROR: app.json not found. Run build first.');
    return { success: false, output: 'app.json not found' };
  }
  
  // Parse and validate structure
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  } catch (e) {
    console.error('ERROR: Invalid JSON in app.json');
    return { success: false, output: 'Invalid JSON: ' + e.message };
  }
  
  // Basic validation checks
  const errors = [];
  const warnings = [];
  
  // Required fields
  if (!manifest.id) errors.push('Missing required field: id');
  if (!manifest.name) errors.push('Missing required field: name');
  if (!manifest.version) errors.push('Missing required field: version');
  if (!manifest.sdk) errors.push('Missing required field: sdk');
  if (!manifest.compatibility) errors.push('Missing required field: compatibility');
  
  // Validate SDK version
  if (manifest.sdk && manifest.sdk !== 3) {
    warnings.push(`SDK version ${manifest.sdk} may not be compatible`);
  }
  
  // Validate drivers
  if (manifest.drivers && Array.isArray(manifest.drivers)) {
    manifest.drivers.forEach((driver, i) => {
      const prefix = `Driver[${i}] (${driver.id || 'unknown'})`;
      
      if (!driver.id) errors.push(`${prefix}: Missing id`);
      if (!driver.name) errors.push(`${prefix}: Missing name`);
      if (!driver.class) errors.push(`${prefix}: Missing class`);
      if (!driver.capabilities) warnings.push(`${prefix}: No capabilities defined`);
      
      // Check for driver files
      if (driver.id) {
        const driverPath = path.join('drivers', driver.id);
        if (!fs.existsSync(driverPath)) {
          errors.push(`${prefix}: Driver folder not found`);
        } else {
          if (!fs.existsSync(path.join(driverPath, 'device.js'))) {
            errors.push(`${prefix}: Missing device.js`);
          }
          if (!fs.existsSync(path.join(driverPath, 'driver.js'))) {
            warnings.push(`${prefix}: Missing driver.js (will use default)`);
          }
        }
        
        // Check images
        if (driver.images) {
          ['small', 'large', 'xlarge'].forEach(size => {
            if (driver.images[size]) {
              const imgPath = driver.images[size];
              if (!fs.existsSync(imgPath)) {
                warnings.push(`${prefix}: Missing image ${size}: ${imgPath}`);
              }
            }
          });
        }
      }
      
      // Validate Zigbee configuration
      if (driver.zigbee) {
        if (!driver.zigbee.manufacturerName && !driver.zigbee.productId) {
          warnings.push(`${prefix}: No Zigbee fingerprints defined`);
        }
      }
    });
  } else {
    warnings.push('No drivers defined');
  }
  
  // Try to use local homey validate if available
  const localHomeyPath = path.join('node_modules', '.bin', 'homey');
  let homeyOutput = '';
  
  if (fs.existsSync(localHomeyPath)) {
    console.log('Running local homey validate...');
    const result = spawnSync('node', [localHomeyPath, 'app', 'validate'], {
      encoding: 'utf8',
      timeout: 30000
    });
    
    if (result.stdout) homeyOutput = result.stdout;
    if (result.stderr) homeyOutput += '\n' + result.stderr;
    
    // Parse homey output for additional validation
    if (homeyOutput.includes('Validation result: OK')) {
      console.log('✓ Homey validation passed');
    } else if (homeyOutput.includes('error') || homeyOutput.includes('Error')) {
      const homeyErrors = homeyOutput.match(/error:?.*/gi) || [];
      homeyErrors.forEach(e => errors.push('Homey: ' + e));
    }
  }
  
  // Output results
  if (errors.length > 0) {
    console.error('\n❌ ERRORS:');
    errors.forEach(e => console.error('  - ' + e));
  }
  
  if (warnings.length > 0) {
    console.warn('\n⚠️  WARNINGS:');
    warnings.forEach(w => console.warn('  - ' + w));
  }
  
  const success = errors.length === 0;
  
  if (success) {
    console.log('\n✓ Validation result: OK');
    console.log(`  Drivers: ${manifest.drivers?.length || 0}`);
    console.log(`  SDK: ${manifest.sdk}`);
    console.log(`  Version: ${manifest.version}`);
  } else {
    console.error('\n✗ Validation result: FAILED');
  }
  
  return {
    success,
    output: homeyOutput || `Errors: ${errors.length}, Warnings: ${warnings.length}`,
    errors,
    warnings
  };
}

// Run if called directly
if (require.main === module) {
  const result = validateLocal();
  process.exit(result.success ? 0 : 1);
}

module.exports = { validateLocal };
