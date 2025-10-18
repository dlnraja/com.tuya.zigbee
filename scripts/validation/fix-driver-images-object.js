#!/usr/bin/env node

/**
 * FIX DRIVER IMAGES OBJECT - Ajoute objet images pour tous les drivers
 * 
 * CRITIQUE: Sans cet objet, Homey utilise les images app (250x175) 
 * au lieu des images driver (75x75), causant échec validation publish
 * 
 * Découvert: Session 18 Oct 2025
 * 
 * Usage: node scripts/validation/fix-driver-images-object.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const APP_JSON_PATH = path.join(PROJECT_ROOT, 'app.json');

console.log('🖼️  FIX DRIVER IMAGES OBJECT\n');
console.log('Adding images object to all drivers in app.json...\n');

// Backup app.json
const backupPath = APP_JSON_PATH + '.backup';
fs.copyFileSync(APP_JSON_PATH, backupPath);
console.log(`📦 Backup created: ${backupPath}`);

// Load app.json
const app = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixed = 0;
let skipped = 0;
let updated = 0;

for (const driver of app.drivers) {
  const driverId = driver.id;
  
  const correctImages = {
    small: `/drivers/${driverId}/assets/images/small.png`,
    large: `/drivers/${driverId}/assets/images/large.png`,
    xlarge: `/drivers/${driverId}/assets/images/xlarge.png`
  };
  
  if (!driver.images) {
    // Ajouter objet images
    driver.images = correctImages;
    fixed++;
    console.log(`✅ Added images: ${driverId}`);
    
  } else {
    // Vérifier si les chemins sont corrects
    if (driver.images.small !== correctImages.small ||
        driver.images.large !== correctImages.large ||
        driver.images.xlarge !== correctImages.xlarge) {
      
      driver.images = correctImages;
      updated++;
      console.log(`🔄 Updated images: ${driverId}`);
    } else {
      skipped++;
    }
  }
}

// Save app.json
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(app, null, 2) + '\n', 'utf8');

console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ:\n');
console.log(`  ✅ Added:   ${fixed} drivers`);
console.log(`  🔄 Updated: ${updated} drivers`);
console.log(`  ⏭️  Skipped: ${skipped} drivers (already correct)`);
console.log(`  📝 Total:   ${app.drivers.length} drivers`);
console.log('='.repeat(60));

if (fixed > 0 || updated > 0) {
  console.log('\n🎉 SUCCESS! All drivers now have correct images object\n');
  console.log('Next steps:');
  console.log('  1. Remove-Item -Recurse -Force .homeybuild');
  console.log('  2. homey app build');
  console.log('  3. homey app validate --level publish');
  console.log('');
} else {
  console.log('\n✅ All drivers already have correct images object\n');
}

console.log(`💾 Backup available at: ${backupPath}`);
console.log('   To restore: Copy-Item app.json.backup app.json\n');
