#!/usr/bin/env node
'use strict';

/**
 * Add missing images property to driver.compose.json
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🖼️  Adding missing images property to drivers...\n');

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory());

let fixed = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    // Check if images property exists
    if (!compose.images) {
      compose.images = {
        small: `./drivers/${driverId}/assets/images/small.png`,
        large: `./drivers/${driverId}/assets/images/large.png`,
        xlarge: `./drivers/${driverId}/assets/images/xlarge.png`
      };
      
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      console.log(`✅ Added images: ${driverId}`);
      fixed++;
    }
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
  }
}

console.log(`\n✅ Fixed ${fixed} drivers`);
