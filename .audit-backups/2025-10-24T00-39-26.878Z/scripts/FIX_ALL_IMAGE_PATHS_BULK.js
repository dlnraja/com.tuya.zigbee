#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🖼️  BULK FIX ALL IMAGE PATHS\n');

const driversDir = path.join(__dirname, '..', 'drivers');
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
    const original = content;
    
    // Fix image paths
    content = content.replace(/"(small|large|xlarge)":\s*"drivers\/([^"\/]+)\/assets\/images\/(small|large|xlarge)\.png"/g, (match, type, pathDriver, file) => {
      if (pathDriver !== driverName) {
        console.log(`   ❌ ${driverName}: Fixed ${type} (was ${pathDriver})`);
        modified = true;
        return `"${type}": "drivers/${driverName}/assets/images/${file}.png"`;
      }
      return match;
    });
    
    // Fix learnmode image paths
    content = content.replace(/"image":\s*"\/drivers\/([^"\/]+)\/assets\/(large|small)\.png"/g, (match, pathDriver, file) => {
      if (pathDriver !== driverName) {
        console.log(`   ❌ ${driverName}: Fixed learnmode (was ${pathDriver})`);
        modified = true;
        return `"image": "/drivers/${driverName}/assets/${file}.png"`;
      }
      return match;
    });
    
    if (modified) {
      fs.writeFileSync(composePath, content);
      fixed++;
      console.log(`✅ ${driverName}\n`);
    }
    
  } catch (err) {
    console.log(`❌ ${driverName} - ERROR: ${err.message}`);
  }
});

console.log(`\n✅ Fixed ${fixed} drivers\n`);
