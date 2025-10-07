#!/usr/bin/env node
/**
 * FIX IMAGES CORRECT DIMENSIONS
 * 
 * HOMEY SDK3 REQUIREMENTS (VÉRIFIÉS):
 * 
 * APP IMAGES (assets/):
 * - small: 250x175
 * - large: 500x350
 * 
 * DRIVER IMAGES (drivers/DRIVERNAME/assets/):
 * - small: 75x75
 * - large: 500x500
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootPath = __dirname;
const driversPath = path.join(rootPath, 'drivers');
const assetsPath = path.join(rootPath, 'assets');

async function createPNG(width, height, text, outputPath) {
  const fontSize = Math.min(width, height) / 8;
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#1E88E5"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" 
            font-family="Arial" font-size="${fontSize}" 
            fill="white" font-weight="bold">${text}</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

async function main() {
  console.log('🎨 FIX IMAGES CORRECT DIMENSIONS');
  console.log('='.repeat(80));
  console.log('');
  
  // ==================== APP IMAGES ====================
  console.log('📸 APP IMAGES (assets/)');
  console.log('   Dimensions requises: small=250x175, large=500x350');
  console.log('');
  
  await createPNG(250, 175, 'TUYA', path.join(assetsPath, 'small.png'));
  console.log('   ✅ small.png: 250x175');
  
  await createPNG(500, 350, 'Universal Tuya Zigbee', path.join(assetsPath, 'large.png'));
  console.log('   ✅ large.png: 500x350');
  
  console.log('');
  
  // ==================== DRIVER IMAGES ====================
  console.log('📸 DRIVER IMAGES (drivers/*/assets/)');
  console.log('   Dimensions requises: small=75x75, large=500x500');
  console.log('');
  
  const driverFolders = fs.readdirSync(driversPath).filter(f => {
    return fs.statSync(path.join(driversPath, f)).isDirectory();
  });
  
  console.log(`   Processing ${driverFolders.length} drivers...`);
  
  let count = 0;
  for (const driverFolder of driverFolders) {
    const driverAssetsPath = path.join(driversPath, driverFolder, 'assets');
    
    if (!fs.existsSync(driverAssetsPath)) {
      fs.mkdirSync(driverAssetsPath, { recursive: true });
    }
    
    // Driver images: small=75x75, large=500x500
    await createPNG(75, 75, 'T', path.join(driverAssetsPath, 'small.png'));
    await createPNG(500, 500, driverFolder.substring(0, 10), path.join(driverAssetsPath, 'large.png'));
    
    count++;
    if (count % 50 === 0) {
      console.log(`   ${count}/${driverFolders.length}...`);
    }
  }
  
  console.log(`   ✅ ${count} drivers completed`);
  console.log('');
  
  // ==================== RÉSUMÉ ====================
  console.log('='.repeat(80));
  console.log('✅ TOUTES LES IMAGES GÉNÉRÉES');
  console.log('='.repeat(80));
  console.log('');
  console.log('📋 APP IMAGES:');
  console.log('   - small.png: 250x175 ✅');
  console.log('   - large.png: 500x350 ✅');
  console.log('');
  console.log('📋 DRIVER IMAGES (×163):');
  console.log('   - small.png: 75x75 ✅');
  console.log('   - large.png: 500x500 ✅');
  console.log('');
  console.log('📋 PROCHAINE ÉTAPE:');
  console.log('   homey app build && homey app validate --level=publish');
  console.log('');
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
