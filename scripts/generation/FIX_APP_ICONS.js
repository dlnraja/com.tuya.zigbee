#!/usr/bin/env node
'use strict';

/**
 * FIX_APP_ICONS.js
 * Génère les icônes app correctes depuis icon.svg
 * Homey Requirements: 
 * - small.png (250x175)
 * - large.png (500x350) 
 * - xlarge.png (1000x700)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ASSETS_DIR = path.join(__dirname, '../../assets/images');

// Homey App Icon Requirements (official)
// Each size has its own optimized SVG
const SIZES = {
  small: { 
    width: 250, 
    height: 175,
    svg: path.join(ASSETS_DIR, 'icon-small.svg')
  },
  large: { 
    width: 500, 
    height: 350,
    svg: path.join(ASSETS_DIR, 'icon-large.svg')
  },
  xlarge: { 
    width: 1000, 
    height: 700,
    svg: path.join(ASSETS_DIR, 'icon-xlarge.svg')
  }
};

console.log('🎨 Fixing App Icons for Homey');
console.log('═'.repeat(60));

// Vérifier si les SVG existent
console.log('\n📋 Checking SVG files...');
let missingFiles = [];
for (const [name, config] of Object.entries(SIZES)) {
  if (!fs.existsSync(config.svg)) {
    console.error(`  ❌ ${name}: ${path.basename(config.svg)} not found!`);
    missingFiles.push(name);
  } else {
    console.log(`  ✅ ${name}: ${path.basename(config.svg)}`);
  }
}

if (missingFiles.length > 0) {
  console.error('\n❌ Missing SVG files! Cannot continue.');
  process.exit(1);
}

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
    for (const [name, config] of Object.entries(SIZES)) {
      const outputPath = path.join(ASSETS_DIR, `${name}.png`);
      
      sharp(config.svg)
        .resize(config.width, config.height)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath)
        .then(() => {
          const stats = fs.statSync(outputPath);
          console.log(`  ✅ ${name}.png (${config.width}x${config.height}) - ${Math.round(stats.size / 1024)}KB`);
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

for (const [name, config] of Object.entries(SIZES)) {
  const outputPath = path.join(ASSETS_DIR, `${name}.png`);
  
  try {
    // Convertir SVG spécifique en PNG (dimensions déjà optimales)
    execSync(
      `magick convert -background none "${config.svg}" "${outputPath}"`,
      { stdio: 'ignore' }
    );
    
    const stats = fs.statSync(outputPath);
    console.log(`  ✅ ${name}.png (${config.width}x${config.height}) - ${Math.round(stats.size / 1024)}KB`);
    
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
