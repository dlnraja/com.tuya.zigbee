#!/usr/bin/env node
'use strict';

/**
 * Copy generic images to drivers missing images
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');
const assetsDir = path.join(__dirname, '../assets/images');

console.log('🖼️  Copying images to drivers missing them...\n');

// Use app-level images as templates
const templateImages = {
  small: path.join(assetsDir, 'small.png'),
  large: path.join(assetsDir, 'large.png'),
  xlarge: path.join(assetsDir, 'xlarge.png')
};

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

let copied = 0;
let errors = 0;

for (const driverId of drivers) {
  const imagesDir = path.join(driversDir, driverId, 'assets', 'images');
  
  // Ensure images directory exists
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  let driverCopied = false;
  
  for (const [size, templatePath] of Object.entries(templateImages)) {
    const targetPath = path.join(imagesDir, `${size}.png`);
    
    if (!fs.existsSync(targetPath)) {
      try {
        if (fs.existsSync(templatePath)) {
          fs.copyFileSync(templatePath, targetPath);
          driverCopied = true;
        }
      } catch (err) {
        console.error(`❌ ${driverId}/${size}: ${err.message}`);
        errors++;
      }
    }
  }
  
  if (driverCopied) {
    console.log(`✅ ${driverId}: Copied missing images`);
    copied++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   COPY SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Drivers with copied images: ${copied}`);
console.log(`❌ Errors: ${errors}`);
console.log(`📦 Total checked: ${drivers.length}`);

console.log('\n✅ Image copy complete!');
