#!/usr/bin/env node
/**
 * FIX ALL IMAGES FINAL - DIMENSIONS CORRECTES
 * 
 * Homey SDK3 requirements RÉELS:
 * - small: 75x75 (carré)
 * - large: 500x500 (carré aussi!)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootPath = __dirname;
const driversPath = path.join(rootPath, 'drivers');
const assetsPath = path.join(rootPath, 'assets');

async function createPNG(size, text, outputPath) {
  const svg = `
    <svg width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="#1E88E5"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" 
            font-family="Arial" font-size="${size / 8}" 
            fill="white" font-weight="bold">${text}</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

async function main() {
  console.log('🎨 FIX ALL IMAGES FINAL - CARRÉS 75x75 et 500x500');
  console.log('='.repeat(80));
  console.log('');
  
  // APP images
  console.log('📸 APP images...');
  await createPNG(75, 'TUYA', path.join(assetsPath, 'small.png'));
  console.log('   ✅ small.png: 75x75');
  
  await createPNG(500, 'TUYA\nZIGBEE', path.join(assetsPath, 'large.png'));
  console.log('   ✅ large.png: 500x500');
  
  console.log('');
  console.log('📸 DRIVERS images (163 drivers)...');
  
  const driverFolders = fs.readdirSync(driversPath).filter(f => {
    return fs.statSync(path.join(driversPath, f)).isDirectory();
  });
  
  let count = 0;
  for (const driverFolder of driverFolders) {
    const driverAssetsPath = path.join(driversPath, driverFolder, 'assets');
    
    if (!fs.existsSync(driverAssetsPath)) {
      fs.mkdirSync(driverAssetsPath, { recursive: true });
    }
    
    await createPNG(75, 'T', path.join(driverAssetsPath, 'small.png'));
    await createPNG(500, driverFolder.substring(0, 12), path.join(driverAssetsPath, 'large.png'));
    
    count++;
    if (count % 50 === 0) {
      console.log(`   ${count}/${driverFolders.length}...`);
    }
  }
  
  console.log(`   ✅ ${count} drivers - images 75x75 + 500x500`);
  console.log('');
  console.log('='.repeat(80));
  console.log('✅ TOUTES LES IMAGES GÉNÉRÉES - DIMENSIONS CORRECTES');
  console.log('='.repeat(80));
  console.log('');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
