#!/usr/bin/env node
'use strict';

/**
 * FIX MISSING DRIVER IDs
 * 
 * Adds missing "id" field to driver.compose.json files
 * The ID should match the driver folder name
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Fixing Missing Driver IDs...\n');

let fixed = 0;
let alreadyHaveId = 0;
let errors = 0;

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory());

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    if (!compose.id) {
      // Add ID matching the folder name
      compose.id = driverId;
      
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      
      console.log(`✅ ${driverId}`);
      fixed++;
    } else {
      alreadyHaveId++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
    errors++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ IDs added: ${fixed}`);
console.log(`⏭️  Already had ID: ${alreadyHaveId}`);
console.log(`❌ Errors: ${errors}`);
console.log(`📦 Total drivers: ${drivers.length}\n`);

if (fixed > 0) {
  console.log('🎉 Driver IDs fixed! Rebuild app.json now.\n');
}
