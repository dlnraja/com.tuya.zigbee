#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATION DES IMAGES DE DRIVERS\n');
console.log('='.repeat(70));

// Load app.json
const appPath = path.join(__dirname, '../../app.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));

const stats = {
  totalDrivers: 0,
  withImagesConfig: 0,
  withoutImagesConfig: 0,
  missingImageFiles: [],
  driversWithAllImages: 0,
  invalidPaths: []
};

const errors = [];
const warnings = [];

app.drivers.forEach(driver => {
  stats.totalDrivers++;
  
  // Check if images are configured in app.json
  if (!driver.images || !driver.images.small || !driver.images.large || !driver.images.xlarge) {
    stats.withoutImagesConfig++;
    errors.push(`❌ ${driver.id}: Missing images configuration in app.json`);
    return;
  }
  
  stats.withImagesConfig++;
  
  // Check if image files exist
  const imageSizes = ['small', 'large', 'xlarge'];
  const expectedImages = ['small.png', 'large.png', 'xlarge.png'];
  let allImagesExist = true;
  
  imageSizes.forEach((size, idx) => {
    const configPath = driver.images[size];
    
    // Validate path format
    const expectedPath = `drivers/${driver.id}/assets/images/${expectedImages[idx]}`;
    
    if (configPath !== expectedPath) {
      // Check if it starts with / (incorrect)
      if (configPath.startsWith('/')) {
        stats.invalidPaths.push({
          driver: driver.id,
          size,
          actual: configPath,
          expected: expectedPath
        });
        warnings.push(`⚠️  ${driver.id}: Image path starts with '/' (should be relative): ${configPath}`);
      }
    }
    
    // Build file path (handle both relative and absolute)
    const filePath = configPath.startsWith('/') 
      ? path.join(__dirname, '../..', configPath.substring(1))
      : path.join(__dirname, '../..', configPath);
    
    if (!fs.existsSync(filePath)) {
      stats.missingImageFiles.push(`${driver.id}/${expectedImages[idx]}`);
      errors.push(`❌ ${driver.id}: Missing ${size} image at ${configPath}`);
      allImagesExist = false;
    }
  });
  
  if (allImagesExist) {
    stats.driversWithAllImages++;
  }
});

// Display results
console.log('\n📊 STATISTIQUES\n');
console.log(`Total drivers: ${stats.totalDrivers}`);
console.log(`Drivers avec configuration images: ${stats.withImagesConfig}`);
console.log(`Drivers sans configuration images: ${stats.withoutImagesConfig}`);
console.log(`Drivers avec toutes les images présentes: ${stats.driversWithAllImages}`);
console.log(`Fichiers images manquants: ${stats.missingImageFiles.length}`);
console.log(`Chemins invalides (avec /): ${stats.invalidPaths.length}`);

// Display errors
if (errors.length > 0) {
  console.log('\n\n❌ ERREURS (' + errors.length + ')\n');
  errors.slice(0, 20).forEach(err => console.log(err));
  if (errors.length > 20) {
    console.log(`... et ${errors.length - 20} autres erreurs`);
  }
}

// Display warnings
if (warnings.length > 0) {
  console.log('\n\n⚠️  AVERTISSEMENTS (' + warnings.length + ')\n');
  warnings.slice(0, 20).forEach(warn => console.log(warn));
  if (warnings.length > 20) {
    console.log(`... et ${warnings.length - 20} autres avertissements`);
  }
}

// Success summary
if (errors.length === 0 && warnings.length === 0) {
  console.log('\n\n✅ PARFAIT! Tous les drivers ont leurs images correctement configurées!\n');
} else if (errors.length === 0) {
  console.log('\n\n✅ Pas d\'erreurs critiques, mais quelques avertissements à corriger.\n');
} else {
  console.log('\n\n⚠️  Des erreurs ont été détectées et doivent être corrigées.\n');
}

console.log('='.repeat(70));

// Exit code
process.exit(errors.length > 0 ? 1 : 0);
