#!/usr/bin/env node

/**
 * VERIFY ALL IMAGES - Vérification complète dimensions et existence
 * 
 * Vérifie pour tous les drivers:
 * - Existence des 3 images (small, large, xlarge)
 * - Dimensions correctes (75x75, 500x500, 1000x1000)
 * - Format PNG
 * 
 * Usage: node scripts/images/verify-all-images.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const APP_JSON_PATH = path.join(PROJECT_ROOT, 'app.json');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

const EXPECTED_DIMENSIONS = {
  small: { width: 75, height: 75 },
  large: { width: 500, height: 500 },
  xlarge: { width: 1000, height: 1000 }
};

console.log('🔍 VERIFY ALL DRIVER IMAGES\n');
console.log('Checking existence and dimensions...\n');
console.log('='.repeat(60));

function getImageDimensions(imagePath) {
  try {
    const output = execSync(`magick identify -format "%wx%h" "${imagePath}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    const [width, height] = output.split('x').map(Number);
    return { width, height };
  } catch (err) {
    return null;
  }
}

const app = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
const drivers = app.drivers;

let totalChecks = 0;
let passed = 0;
let missing = 0;
let wrongSize = 0;
let errors = [];

console.log(`\nChecking ${drivers.length} drivers...\n`);

for (const driver of drivers) {
  const driverPath = path.join(DRIVERS_DIR, driver.id);
  const imagesDir = path.join(driverPath, 'assets', 'images');
  
  for (const [sizeName, expected] of Object.entries(EXPECTED_DIMENSIONS)) {
    totalChecks++;
    const imagePath = path.join(imagesDir, `${sizeName}.png`);
    
    if (!fs.existsSync(imagePath)) {
      missing++;
      errors.push(`❌ Missing: ${driver.id}/${sizeName}.png`);
      continue;
    }
    
    const dimensions = getImageDimensions(imagePath);
    if (!dimensions) {
      errors.push(`⚠️  Cannot read: ${driver.id}/${sizeName}.png`);
      continue;
    }
    
    if (dimensions.width !== expected.width || dimensions.height !== expected.height) {
      wrongSize++;
      errors.push(
        `❌ Wrong size: ${driver.id}/${sizeName}.png ` +
        `(${dimensions.width}x${dimensions.height} vs ${expected.width}x${expected.height})`
      );
    } else {
      passed++;
    }
  }
  
  // Progress
  const progress = ((passed + missing + wrongSize) / totalChecks * 100).toFixed(0);
  process.stdout.write(`\rProgress: ${progress}% | Passed: ${passed} | Errors: ${missing + wrongSize}  `);
}

console.log('\n\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY:\n');
console.log(`  ✅ Passed: ${passed}/${totalChecks}`);
console.log(`  ❌ Missing: ${missing}`);
console.log(`  ⚠️  Wrong size: ${wrongSize}`);
console.log(`  📈 Success rate: ${(passed / totalChecks * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (errors.length > 0 && errors.length <= 20) {
  console.log('\n❌ ERRORS:\n');
  errors.forEach(err => console.log(`  ${err}`));
} else if (errors.length > 20) {
  console.log('\n❌ ERRORS (showing first 20):\n');
  errors.slice(0, 20).forEach(err => console.log(`  ${err}`));
  console.log(`\n  ... and ${errors.length - 20} more errors`);
}

if (passed === totalChecks) {
  console.log('\n🎉 SUCCESS! All images are correct\n');
  console.log('All drivers have:');
  console.log('  ✅ 3 images each (small, large, xlarge)');
  console.log('  ✅ Correct dimensions (75x75, 500x500, 1000x1000)');
  console.log('  ✅ PNG format');
  console.log('');
  console.log('Ready for validation:');
  console.log('  npm run validate:publish');
  console.log('');
  process.exit(0);
} else {
  console.log('\n⚠️  Some images need attention\n');
  console.log('To fix:');
  console.log('  npm run images:regenerate');
  console.log('');
  process.exit(1);
}
