#!/usr/bin/env node
'use strict';

/**
 * FIX ALL DRIVER IMAGES
 * Ensure all drivers have correct image sizes: 75x75 (small) and 500x500 (large)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function fixDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const assetsPath = path.join(driverPath, 'assets');
  const imagesPath = path.join(assetsPath, 'images');
  
  // Check if images directory exists
  if (!fs.existsSync(imagesPath)) {
    console.log(`⚠️  ${driverName}: No images directory`);
    return false;
  }
  
  const smallPath = path.join(imagesPath, 'small.png');
  const largePath = path.join(imagesPath, 'large.png');
  
  // Check if images exist
  if (!fs.existsSync(smallPath) || !fs.existsSync(largePath)) {
    console.log(`⚠️  ${driverName}: Missing images`);
    return false;
  }
  
  try {
    // Use ImageMagick or sharp to resize if available
    // For now, just verify size
    const sharp = require('sharp');
    
    // Fix small.png
    sharp(smallPath)
      .resize(75, 75, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(smallPath + '.tmp')
      .then(() => {
        fs.renameSync(smallPath + '.tmp', smallPath);
        console.log(`✅ ${driverName}: Fixed small.png (75x75)`);
      })
      .catch(err => {
        console.log(`❌ ${driverName}: Error fixing small.png -`, err.message);
      });
    
    // Fix large.png
    sharp(largePath)
      .resize(500, 500, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(largePath + '.tmp')
      .then(() => {
        fs.renameSync(largePath + '.tmp', largePath);
        console.log(`✅ ${driverName}: Fixed large.png (500x500)`);
      })
      .catch(err => {
        console.log(`❌ ${driverName}: Error fixing large.png -`, err.message);
      });
    
    return true;
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🖼️  FIXING ALL DRIVER IMAGES\n');
  console.log('='.repeat(60));
  
  try {
    require('sharp');
  } catch (err) {
    console.log('❌ Sharp module not found. Installing...');
    execSync('npm install sharp', { cwd: ROOT, stdio: 'inherit' });
  }
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(f => fs.statSync(path.join(DRIVERS_DIR, f)).isDirectory());
  
  console.log(`\nFound ${drivers.length} drivers\n`);
  
  let fixed = 0;
  for (const driver of drivers) {
    if (fixDriver(driver)) {
      fixed++;
    }
  }
  
  // Wait for all async operations
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Fixed ${fixed} drivers`);
  console.log('\nRun: homey app validate');
}

main().catch(console.error);
