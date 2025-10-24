#!/usr/bin/env node

/**
 * FIX ALL IMAGE PATHS v4.0.0
 * Corrects all incorrect image paths in driver.compose.json files
 */

const fs = require('fs');
const path = require('path');

console.log('\n🖼️  FIX ALL IMAGE PATHS v4.0.0\n');

const rootDir = path.join(__dirname, '..');
const driversDir = path.join(rootDir, 'drivers');

const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let fixed = 0;

drivers.forEach(driverName => {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    let content = fs.readFileSync(composePath, 'utf-8');
    let modified = false;
    
    // Find all image paths that don't match the driver name
    const imageRegex = /"(small|large|xlarge)":\s*"drivers\/([^"]+)\/assets\/images\/(small|large|xlarge)\.png"/g;
    
    content = String(content).replace(imageRegex, (match, type, pathDriver, file) => {
      if (pathDriver !== driverName) {
        console.log(`   ❌ ${driverName}: Fixed ${type} path from ${pathDriver}`);
        modified = true;
        return `"${type}": "drivers/${driverName}/assets/images/${file}.png"`;
      }
      return match;
    });
    
    // Also fix learnmode image paths
    const learnRegex = /"image":\s*"\/drivers\/([^"]+)\/assets\/(large|small)\.png"/g;
    content = String(content).replace(learnRegex, (match, pathDriver, file) => {
      if (pathDriver !== driverName) {
        console.log(`   ❌ ${driverName}: Fixed learnmode image from ${pathDriver}`);
        modified = true;
        return `"image": "/drivers/${driverName}/assets/${file}.png"`;
      }
      return match;
    });
    
    if (modified) {
      fs.writeFileSync(composePath, content);
      fixed++;
      console.log(`✅ ${driverName}`);
    }
    
  } catch (err) {
    console.log(`❌ ${driverName} - ERROR: ${err.message}`);
  }
});

console.log(`\n✅ Fixed ${fixed} drivers with incorrect image paths\n`);
