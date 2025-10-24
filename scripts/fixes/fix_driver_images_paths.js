#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DES CHEMINS D\'IMAGES DE DRIVERS\n');
console.log('='.repeat(70));

// Load app.json
const appPath = path.join(__dirname, '../../app.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));

let fixedCount = 0;
let addedCount = 0;

app.drivers.forEach(driver => {
  const driverId = driver.id;
  
  // Fix paths that start with /
  if (driver.images) {
    ['small', 'large', 'xlarge'].forEach(size => {
      if (driver.images[size] && driver.images[size].startsWith('/')) {
        const oldPath = driver.images[size];
        driver.images[size] = driver.images[size].substring(1); // Remove leading /
        console.log(`✅ ${driverId}: Fixed ${size} path`);
        console.log(`   ${oldPath} → ${driver.images[size]}`);
        fixedCount++;
      }
    });
  }
  
  // Add missing images configuration
  if (!driver.images || !driver.images.small || !driver.images.large || !driver.images.xlarge) {
    driver.images = {
      small: `drivers/${driverId}/assets/images/small.png`,
      large: `drivers/${driverId}/assets/images/large.png`,
      xlarge: `drivers/${driverId}/assets/images/xlarge.png`
    };
    console.log(`✅ ${driverId}: Added images configuration`);
    addedCount++;
  }
});

// Save app.json
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n', 'utf8');

console.log('\n' + '='.repeat(70));
console.log(`\n✅ TERMINÉ!`);
console.log(`   - ${fixedCount} chemins corrigés (/ enlevé)`);
console.log(`   - ${addedCount} configurations images ajoutées`);
console.log(`   - Total modifications: ${fixedCount + addedCount}\n`);
console.log('='.repeat(70));
