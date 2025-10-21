#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🖼️  FIXING DRIVERS WITH MISSING IMAGES\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const appJsonPath = path.join(__dirname, '..', 'app.json');

// Scan all drivers for missing images
const drivers = fs.readdirSync(driversDir)
  .filter(d => fs.statSync(path.join(driversDir, d)).isDirectory());

const toRemove = [];

drivers.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  const assetsImagesPath = path.join(driverPath, 'assets', 'images');
  
  // Check if assets/images exists and has required files
  if (!fs.existsSync(assetsImagesPath)) {
    console.log(`❌ ${driverName}: No assets/images folder`);
    toRemove.push(driverName);
    return;
  }
  
  const images = fs.readdirSync(assetsImagesPath);
  const hasSmall = images.includes('small.png');
  const hasLarge = images.includes('large.png');
  
  if (!hasSmall || !hasLarge) {
    console.log(`❌ ${driverName}: Missing images (small: ${hasSmall}, large: ${hasLarge})`);
    toRemove.push(driverName);
  }
});

console.log(`\n📊 Found ${toRemove.length} drivers with missing images\n`);

if (toRemove.length > 0) {
  // Remove folders
  toRemove.forEach(driverName => {
    const fullPath = path.join(driversDir, driverName);
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`  🗑️  Deleted: ${driverName}`);
  });
  
  // Update app.json
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
  const before = appJson.drivers.length;
  appJson.drivers = appJson.drivers.filter(d => !toRemove.includes(d.id));
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log(`\n✅ Cleaned ${toRemove.length} incomplete drivers`);
  console.log(`📊 app.json: ${before} → ${appJson.drivers.length} drivers\n`);
} else {
  console.log('✅ All drivers have valid images\n');
}
