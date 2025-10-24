#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔍 DETECTING INCOMPLETE DRIVERS\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir)
  .filter(d => fs.statSync(path.join(driversDir, d)).isDirectory());

const incomplete = [];

drivers.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  const assetsPath = path.join(driverPath, 'assets');
  const imagesPath = path.join(assetsPath, 'images');
  
  // Check structure
  const hasAssets = fs.existsSync(assetsPath);
  const hasImages = fs.existsSync(imagesPath);
  
  if (!hasAssets || !hasImages) {
    incomplete.push(driverName);
    console.log(`❌ ${driverName}: ${!hasAssets ? 'No assets/' : 'No images/'}`);
    return;
  }
  
  // Check image files
  try {
    const images = fs.readdirSync(imagesPath);
    const hasSmall = images.some(f => f === 'small.png');
    const hasLarge = images.some(f => f === 'large.png');
    
    if (!hasSmall || !hasLarge) {
      incomplete.push(driverName);
      console.log(`❌ ${driverName}: Missing ${!hasSmall ? 'small.png' : ''} ${!hasLarge ? 'large.png' : ''}`);
    }
  } catch (err) {
    incomplete.push(driverName);
    console.log(`❌ ${driverName}: Error reading images (${err.message})`);
  }
});

console.log(`\n📊 Total: ${incomplete.length} incomplete drivers`);
console.log(`\nIncomplete drivers list:`);
incomplete.forEach(d => console.log(`  - ${d}`));
