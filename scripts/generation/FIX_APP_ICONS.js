#!/usr/bin/env node
'use strict';

/**
 * FIX_APP_ICONS.js
 * Génère les icônes app correctes depuis icon.svg
 * Requirements: small.png (250x250), large.png (500x500), xlarge.png (1000x1000)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ASSETS_DIR = path.join(__dirname, '../../assets/images');
const SVG_PATH = path.join(ASSETS_DIR, 'icon.svg');

const SIZES = {
  small: 250,
  large: 500,
  xlarge: 1000
};

console.log('🎨 Fixing App Icons for Homey');
console.log('═'.repeat(60));

// Vérifier si icon.svg existe
if (!fs.existsSync(SVG_PATH)) {
  console.error('❌ icon.svg not found!');
  process.exit(1);
}
console.log('✅ icon.svg found');

// Vérifier si ImageMagick est installé
try {
  execSync('magick -version', { stdio: 'ignore' });
  console.log('✅ ImageMagick available');
} catch (error) {
  console.log('⚠️  ImageMagick not found - using sharp fallback');
  
  // Fallback: Utiliser sharp si disponible
  try {
    const sharp = require('sharp');
    console.log('✅ Sharp available as fallback');
    
    // Convertir SVG en PNG avec sharp
    for (const [name, size] of Object.entries(SIZES)) {
      const outputPath = path.join(ASSETS_DIR, `${name}.png`);
      
      sharp(SVG_PATH)
        .resize(size, size)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath)
        .then(() => {
          const stats = fs.statSync(outputPath);
          console.log(`  ✅ ${name}.png (${size}x${size}) - ${Math.round(stats.size / 1024)}KB`);
        })
        .catch(err => {
          console.error(`  ❌ Failed to generate ${name}.png:`, err.message);
        });
    }
    
    console.log('\n✅ Icon generation complete!');
    return;
    
  } catch (error) {
    console.error('❌ Neither ImageMagick nor Sharp available!');
    console.log('\nInstall one of:');
    console.log('  1. ImageMagick: https://imagemagick.org/script/download.php');
    console.log('  2. Sharp: npm install sharp');
    process.exit(1);
  }
}

// Utiliser ImageMagick pour convertir
console.log('\n📐 Generating PNG files...');

for (const [name, size] of Object.entries(SIZES)) {
  const outputPath = path.join(ASSETS_DIR, `${name}.png`);
  
  try {
    // Convertir SVG en PNG avec ImageMagick
    execSync(
      `magick convert -background none -resize ${size}x${size} "${SVG_PATH}" "${outputPath}"`,
      { stdio: 'ignore' }
    );
    
    const stats = fs.statSync(outputPath);
    console.log(`  ✅ ${name}.png (${size}x${size}) - ${Math.round(stats.size / 1024)}KB`);
    
  } catch (error) {
    console.error(`  ❌ Failed to generate ${name}.png:`, error.message);
  }
}

// Créer .force-update pour forcer Homey à recharger
const forceUpdatePath = path.join(ASSETS_DIR, '.force-update');
fs.writeFileSync(forceUpdatePath, new Date().toISOString());
console.log('  ✅ .force-update created');

console.log('\n✅ Icon generation complete!');
console.log('\n📝 Next steps:');
console.log('  1. Verify images: ls assets/images/*.png');
console.log('  2. Commit: git sc -Message "fix: regenerate app icons"');
console.log('  3. Publish test version to see icons on dashboard');
