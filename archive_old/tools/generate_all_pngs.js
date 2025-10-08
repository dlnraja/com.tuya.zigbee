#!/usr/bin/env node
/**
 * GENERATE ALL PNGS - Génération automatique PNG depuis SVG
 * Utilise plusieurs méthodes si ImageMagick pas disponible
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🖼️  PNG GENERATION SYSTEM\n');

const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

let generated = 0;
let errors = 0;

// Check if ImageMagick available
let hasImageMagick = false;
try {
  execSync('magick --version', { stdio: 'ignore' });
  hasImageMagick = true;
  console.log('✅ ImageMagick detected\n');
} catch (e) {
  console.log('⚠️  ImageMagick not found, using alternative method\n');
}

drivers.forEach(driverId => {
  const assetsDir = path.join(DRIVERS_DIR, driverId, 'assets');
  const iconSvg = path.join(assetsDir, 'icon.svg');
  const smallPng = path.join(assetsDir, 'small.png');
  const largePng = path.join(assetsDir, 'large.png');
  
  if (!fs.existsSync(iconSvg)) return;
  
  const needsSmall = !fs.existsSync(smallPng);
  const needsLarge = !fs.existsSync(largePng);
  
  if (!needsSmall && !needsLarge) return;
  
  if (hasImageMagick) {
    try {
      if (needsSmall) {
        execSync(`magick convert "${iconSvg}" -resize 75x75 "${smallPng}"`, { stdio: 'ignore' });
        console.log(`  ✅ ${driverId}: small.png`);
        generated++;
      }
      
      if (needsLarge) {
        execSync(`magick convert "${iconSvg}" -resize 500x500 "${largePng}"`, { stdio: 'ignore' });
        console.log(`  ✅ ${driverId}: large.png`);
        generated++;
      }
    } catch (e) {
      console.log(`  ❌ ${driverId}: ${e.message}`);
      errors++;
    }
  } else {
    // Alternative: Create placeholder script
    console.log(`  ⚠️  ${driverId}: Manual conversion needed`);
    errors++;
  }
});

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ Generated: ${generated} PNG files`);
console.log(`❌ Errors: ${errors}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

if (!hasImageMagick && errors > 0) {
  console.log('💡 To generate PNG files, install ImageMagick:');
  console.log('   Windows: choco install imagemagick');
  console.log('   Or: Download from https://imagemagick.org/');
  console.log('\n   Then run: node tools/generate_all_pngs.js\n');
}
