#!/usr/bin/env node
'use strict';
/**
 * Fix Detected Variants - v1.1.0
 * Reads missing-variants-detected.json and auto-adds missing variants
 * Run: node scripts/automation/fix-detected-variants.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DETECTED_PATH = path.join(__dirname, '../../data/community-sync/missing-variants-detected.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const DRY_RUN = process.argv.includes('--dry-run');

function main() {
  console.log('=== Fix Detected Variants' + (DRY_RUN ? ' (DRY RUN )' : '') + ' ===\n')      ;
  
  if (!fs.existsSync(DETECTED_PATH)) {
    console.error('Detected file not found: ' + DETECTED_PATH);
    console.error('Run detect-missing-variants.js first');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(DETECTED_PATH, 'utf8'));
  let totalAdded = 0;
  let totalDrivers = 0;
  
  for (const entry of data.drivers) {
    const { driver, variants } = entry;
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      console.error('Driver not found: ' + driver);
      continue;
    }
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || []       ;
      const existingSet = new Set(mfrs.map(m => m.trim()));
      
      const toAdd = variants.filter(v => !existingSet.has(v));
      
      if (toAdd.length > 0) {
        compose.zigbee.manufacturerName.push(...toAdd );
        
        if (!DRY_RUN) {
          fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
        }
        
        console.log(driver + ': +' + toAdd.length);
        totalAdded += toAdd.length;
        totalDrivers++;
      }
    } catch (e) {
      console.error('Error in ' + driver + ': ' + e.message);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log('Drivers modified:', totalDrivers);
  console.log('Total variants added:', totalAdded);
  
  if (DRY_RUN) {
    console.log('\n(DRY RUN - no files were modified)');
  }
  
  return totalAdded;
}

main();
