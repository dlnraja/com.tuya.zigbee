#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * SCRIPT FIX TOUTES LES IMAGES MANQUANTES
 * Copie les images génériques pour tous les drivers sans images
 */

const DEFAULT_IMAGE = path.join(__dirname, '..', 'assets', 'images', 'large.png');
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

function copyDefaultImage(driverPath, imageName) {
  const targetDir = path.join(driverPath, 'assets', 'images');
  const targetPath = path.join(targetDir, imageName);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(DEFAULT_IMAGE, targetPath);
    return true;
  }
  return false;
}

// Get all drivers
const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(d => {
    const stat = fs.statSync(path.join(DRIVERS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.') && !d.includes('archived');
  });

console.log(`🔍 Checking ${drivers.length} drivers for missing images...\n`);

let fixed = 0;
let alreadyOk = 0;

drivers.forEach(driver => {
  const driverPath = path.join(DRIVERS_DIR, driver);
  const images = ['small.png', 'large.png', 'xlarge.png'];
  
  let driverFixed = false;
  images.forEach(image => {
    if (copyDefaultImage(driverPath, image)) {
      if (!driverFixed) {
        console.log(`✅ Fixed: ${driver}`);
        driverFixed = true;
      }
    }
  });
  
  if (driverFixed) {
    fixed++;
  } else {
    alreadyOk++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\nFixed: ${fixed} drivers`);
console.log(`Already OK: ${alreadyOk} drivers`);
console.log(`Total: ${drivers.length} drivers\n`);
