#!/usr/bin/env node

/**
 * FIX APP IMAGE DIMENSIONS - Corrige dimensions images app
 * 
 * DÉCOUVERTE CRITIQUE (18 Oct 2025):
 * App large.png doit être 500x350, PAS 500x500!
 * 
 * Dimensions correctes:
 * - small.png:  250x175
 * - large.png:  500x350  ← CRITIQUE!
 * - xlarge.png: 1000x700
 * 
 * Usage: node scripts/validation/fix-app-image-dimensions.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const ASSETS_IMAGES = path.join(PROJECT_ROOT, 'assets', 'images');

const SPECS = {
  'small.png': { width: 250, height: 175 },
  'large.png': { width: 500, height: 350 },  // CRITIQUE: PAS 500x500!
  'xlarge.png': { width: 1000, height: 700 }
};

console.log('🖼️  FIX APP IMAGE DIMENSIONS\n');
console.log('Correcting app images to exact Homey SDK3 specifications...\n');

function getImageDimensions(imagePath) {
  try {
    const output = execSync(`magick identify -format "%wx%h" "${imagePath}"`, {
      encoding: 'utf8'
    }).trim();
    const [width, height] = output.split('x').map(Number);
    return { width, height };
  } catch (err) {
    return null;
  }
}

function resizeImage(imagePath, width, height) {
  try {
    // Backup original
    const backupPath = imagePath + '.backup';
    fs.copyFileSync(imagePath, backupPath);
    
    // Resize avec force (!)
    execSync(`magick "${imagePath}" -resize ${width}x${height}! "${imagePath}"`, {
      stdio: 'pipe'
    });
    
    return true;
  } catch (err) {
    console.error(`❌ Error resizing: ${err.message}`);
    return false;
  }
}

let fixed = 0;
let errors = 0;
let alreadyCorrect = 0;

for (const [filename, expected] of Object.entries(SPECS)) {
  const imagePath = path.join(ASSETS_IMAGES, filename);
  
  console.log(`Checking ${filename}...`);
  
  if (!fs.existsSync(imagePath)) {
    console.log(`  ❌ File not found: ${filename}`);
    errors++;
    continue;
  }
  
  const current = getImageDimensions(imagePath);
  if (!current) {
    console.log(`  ❌ Cannot read dimensions: ${filename}`);
    errors++;
    continue;
  }
  
  console.log(`  Current: ${current.width}x${current.height}`);
  console.log(`  Required: ${expected.width}x${expected.height}`);
  
  if (current.width === expected.width && current.height === expected.height) {
    console.log(`  ✅ Already correct\n`);
    alreadyCorrect++;
    continue;
  }
  
  console.log(`  🔧 Resizing...`);
  if (resizeImage(imagePath, expected.width, expected.height)) {
    const newDimensions = getImageDimensions(imagePath);
    if (newDimensions && 
        newDimensions.width === expected.width && 
        newDimensions.height === expected.height) {
      console.log(`  ✅ Fixed: ${newDimensions.width}x${newDimensions.height}`);
      console.log(`  💾 Backup: ${filename}.backup\n`);
      fixed++;
    } else {
      console.log(`  ❌ Resize failed\n`);
      errors++;
    }
  } else {
    errors++;
  }
}

console.log('='.repeat(60));
console.log('📊 RÉSUMÉ:\n');
console.log(`  ✅ Fixed:    ${fixed} images`);
console.log(`  ✓  Correct:  ${alreadyCorrect} images`);
console.log(`  ❌ Errors:   ${errors} images`);
console.log('='.repeat(60));

if (fixed > 0) {
  console.log('\n🎉 SUCCESS! App images now have correct dimensions\n');
  console.log('CRITICAL REMINDER:');
  console.log('  - App large.png = 500x350 (NOT 500x500!)');
  console.log('  - Driver large.png = 500x500 (different!)\n');
  console.log('Next steps:');
  console.log('  1. Verify images: ls -lh assets/images/*.png');
  console.log('  2. Clean build: Remove-Item -Recurse -Force .homeybuild');
  console.log('  3. Build: homey app build');
  console.log('  4. Validate: homey app validate --level publish\n');
} else if (alreadyCorrect === Object.keys(SPECS).length) {
  console.log('\n✅ All app images already have correct dimensions\n');
}

if (errors > 0) {
  console.log('\n⚠️  Some errors occurred. Check output above.\n');
  process.exit(1);
}
