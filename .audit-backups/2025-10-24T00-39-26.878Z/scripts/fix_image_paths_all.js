#!/usr/bin/env node
'use strict';

/**
 * Fix all incorrect image paths in driver.compose.json files
 * Ensures paths point to the correct driver directory
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Fixing all image paths in driver.compose.json files...\n');

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

let fixed = 0;
let errors = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    let modified = false;
    
    // Fix main images property
    if (compose.images) {
      for (const size of ['small', 'large', 'xlarge']) {
        if (compose.images[size]) {
          const currentPath = compose.images[size];
          
          // Check if path is incorrect (points to different driver directory)
          if (currentPath.includes('drivers/') && !currentPath.includes(`drivers/${driverId}/`)) {
            // Extract the incorrect driver name and replace with correct one
            const correctPath = currentPath.replace(/drivers\/[^\/]+\//, `drivers/${driverId}/`);
            compose.images[size] = correctPath;
            console.log(`✅ ${driverId}: Fixed ${size} image path`);
            console.log(`   From: ${currentPath}`);
            console.log(`   To:   ${correctPath}`);
            modified = true;
          }
          
          // Also check for relative paths that should be absolute
          else if (currentPath.startsWith('./drivers/')) {
            compose.images[size] = currentPath.substring(2); // Remove './'
            modified = true;
          }
        }
      }
    }
    
    // Fix learnmode image if present
    if (compose.learnmode && compose.learnmode.image) {
      const currentPath = compose.learnmode.image;
      
      if (currentPath.includes('/drivers/') && !currentPath.includes(`/drivers/${driverId}/`)) {
        const correctPath = currentPath.replace(/\/drivers\/[^\/]+\//, `/drivers/${driverId}/`);
        compose.learnmode.image = correctPath;
        console.log(`✅ ${driverId}: Fixed learnmode image path`);
        console.log(`   From: ${currentPath}`);
        console.log(`   To:   ${correctPath}`);
        modified = true;
      }
    }
    
    // Fix pair images if present
    if (compose.pair) {
      for (let i = 0; i < compose.pair.length; i++) {
        if (compose.pair[i].images) {
          for (const size of ['small', 'large']) {
            if (compose.pair[i].images[size]) {
              const currentPath = compose.pair[i].images[size];
              
              if (currentPath.includes('/drivers/') && !currentPath.includes(`/drivers/${driverId}/`)) {
                const correctPath = currentPath.replace(/\/drivers\/[^\/]+\//, `/drivers/${driverId}/`);
                compose.pair[i].images[size] = correctPath;
                modified = true;
              }
            }
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      fixed++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
    errors++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   FIX SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Fixed: ${fixed} drivers`);
console.log(`❌ Errors: ${errors}`);
console.log(`📦 Total checked: ${drivers.length}`);

console.log('\n✅ All image paths fixed!');
