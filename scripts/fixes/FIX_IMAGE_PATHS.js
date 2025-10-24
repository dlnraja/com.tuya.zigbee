#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🖼️  FIXING IMAGE PATHS IN app.json\n');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

let fixedCount = 0;

if (appJson.drivers) {
  for (const driver of appJson.drivers) {
    // Fix image paths
    if (driver.images) {
      const oldImages = JSON.stringify(driver.images);
      
      for (const imageSize in driver.images) {
        let imagePath = driver.images[imageSize];
        
        // Apply same fixes as folder names
        if (/ikea_ikea_/.test(imagePath)) {
          imagePath = String(imagePath).replace(/ikea_ikea_/g, 'ikea_');
        }
        if (/_other_other/.test(imagePath)) {
          imagePath = String(imagePath).replace(/_other_other/g, '_other');
        }
        if (/_aaa_aaa/.test(imagePath)) {
          imagePath = String(imagePath).replace(/_aaa_aaa/g, '_aaa');
        }
        if (/_aa_aa/.test(imagePath)) {
          imagePath = String(imagePath).replace(/_aa_aa/g, '_aa');
        }
        if (/_internal_internal/.test(imagePath)) {
          imagePath = String(imagePath).replace(/_internal_internal/g, '_internal');
        }
        
        driver.images[imageSize] = imagePath;
      }
      
      const newImages = JSON.stringify(driver.images);
      if (oldImages !== newImages) {
        console.log(`  🖼️  Driver: ${driver.id}`);
        console.log(`     Updated image paths\n`);
        fixedCount++;
      }
    }
    
    // Fix icon path
    if (driver.icon) {
      const oldIcon = driver.icon;
      let newIcon = oldIcon;
      
      if (/ikea_ikea_/.test(newIcon)) {
        newIcon = String(newIcon).replace(/ikea_ikea_/g, 'ikea_');
      }
      if (/_other_other/.test(newIcon)) {
        newIcon = String(newIcon).replace(/_other_other/g, '_other');
      }
      if (/_aaa_aaa/.test(newIcon)) {
        newIcon = String(newIcon).replace(/_aaa_aaa/g, '_aaa');
      }
      if (/_aa_aa/.test(newIcon)) {
        newIcon = String(newIcon).replace(/_aa_aa/g, '_aa');
      }
      if (/_internal_internal/.test(newIcon)) {
        newIcon = String(newIcon).replace(/_internal_internal/g, '_internal');
      }
      
      if (oldIcon !== newIcon) {
        driver.icon = newIcon;
        console.log(`  📦 Driver: ${driver.id}`);
        console.log(`     Updated icon path\n`);
        fixedCount++;
      }
    }
  }
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ Fixed ${fixedCount} image/icon path references\n`);

process.exit(0);
