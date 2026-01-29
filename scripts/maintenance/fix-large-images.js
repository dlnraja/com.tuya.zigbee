#!/usr/bin/env node
/**
 * FIX LARGE IMAGES - Workaround for Homey CLI bug
 * 
 * The Homey CLI doesn't copy large.png files to .homeybuild
 * This script copies them manually after build
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const BUILD_DIR = path.join(ROOT, '.homeybuild', 'drivers');

// Only run if .homeybuild exists (after build)
if (!fs.existsSync(BUILD_DIR)) {
  console.log('⏭️  .homeybuild not found, skipping image fix');
  process.exit(0);
}

let copied = 0;

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
);

for (const driver of drivers) {
  // Check both possible locations for large.png
  const sources = [
    path.join(DRIVERS_DIR, driver, 'assets', 'images', 'large.png'),
    path.join(DRIVERS_DIR, driver, 'assets', 'large.png')
  ];
  
  for (const src of sources) {
    if (fs.existsSync(src)) {
      const dstDir = path.join(BUILD_DIR, driver, 'assets', 'images');
      const dst = path.join(dstDir, 'large.png');
      
      // Create directory if needed
      if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(src, dst);
      copied++;
      break; // Found and copied, move to next driver
    }
  }
}

console.log(`✅ Copied ${copied} large.png files to .homeybuild`);
