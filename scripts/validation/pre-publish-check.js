#!/usr/bin/env node

/**
 * PRE-PUBLISH CHECK - Validation complète avant publication Homey App Store
 * 
 * Vérifie automatiquement:
 * - Dimensions images app (250x175, 500x350, 1000x700)
 * - Dimensions images drivers (75x75, 500x500, 1000x1000)
 * - Objet images présent pour chaque driver dans app.json
 * - Learnmode présent pour tous drivers Zigbee
 * - Flow card IDs uniques
 * - Build et validation publish
 * 
 * Basé sur découvertes session 18 Oct 2025
 * 
 * Usage: node scripts/validation/pre-publish-check.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const APP_JSON_PATH = path.join(PROJECT_ROOT, 'app.json');
const ASSETS_IMAGES = path.join(PROJECT_ROOT, 'assets', 'images');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

console.log('🔍 PRE-PUBLISH CHECK - Homey SDK3 Validation\n');

let errors = [];
let warnings = [];
let fixed = [];

// ============================================================================
// 1. VÉRIFIER DIMENSIONS IMAGES APP
// ============================================================================

console.log('📐 1. Vérification dimensions images app...');

const APP_IMAGE_SPECS = {
  'small.png': { width: 250, height: 175 },
  'large.png': { width: 500, height: 350 },  // CRITIQUE: PAS 500x500!
  'xlarge.png': { width: 1000, height: 700 }
};

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

for (const [filename, expected] of Object.entries(APP_IMAGE_SPECS)) {
  const imagePath = path.join(ASSETS_IMAGES, filename);
  
  if (!fs.existsSync(imagePath)) {
    errors.push(`❌ Image app manquante: ${filename}`);
    continue;
  }
  
  const dimensions = getImageDimensions(imagePath);
  if (!dimensions) {
    errors.push(`❌ Impossible de lire dimensions: ${filename}`);
    continue;
  }
  
  if (dimensions.width !== expected.width || dimensions.height !== expected.height) {
    errors.push(
      `❌ ${filename}: ${dimensions.width}x${dimensions.height} (requis: ${expected.width}x${expected.height})`
    );
    
    // Auto-fix proposé
    console.log(`   💡 Fix: magick assets/images/${filename} -resize ${expected.width}x${expected.height}! assets/images/${filename}`);
  } else {
    console.log(`   ✅ ${filename}: ${dimensions.width}x${dimensions.height}`);
  }
}

// ============================================================================
// 2. VÉRIFIER OBJET IMAGES DANS APP.JSON POUR CHAQUE DRIVER
// ============================================================================

console.log('\n📝 2. Vérification objet images dans app.json...');

const app = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
let driversWithoutImages = 0;
let driversWithImages = 0;

for (const driver of app.drivers) {
  if (!driver.images) {
    driversWithoutImages++;
    errors.push(`❌ Driver sans images object: ${driver.id}`);
  } else {
    // Vérifier que les chemins sont corrects
    const expectedSmall = `/drivers/${driver.id}/assets/images/small.png`;
    const expectedLarge = `/drivers/${driver.id}/assets/images/large.png`;
    const expectedXlarge = `/drivers/${driver.id}/assets/images/xlarge.png`;
    
    if (driver.images.small !== expectedSmall ||
        driver.images.large !== expectedLarge ||
        driver.images.xlarge !== expectedXlarge) {
      warnings.push(`⚠️  Driver ${driver.id}: chemins images incorrects`);
    } else {
      driversWithImages++;
    }
  }
}

if (driversWithoutImages > 0) {
  console.log(`   ❌ ${driversWithoutImages} drivers sans objet images`);
  console.log(`   💡 Run: node scripts/validation/fix-driver-images-object.js`);
} else {
  console.log(`   ✅ Tous les ${driversWithImages} drivers ont objet images`);
}

// ============================================================================
// 3. VÉRIFIER DIMENSIONS IMAGES DRIVERS (échantillon)
// ============================================================================

console.log('\n📏 3. Vérification dimensions images drivers (échantillon)...');

const DRIVER_IMAGE_SPECS = {
  'small.png': { width: 75, height: 75 },
  'large.png': { width: 500, height: 500 },
  'xlarge.png': { width: 1000, height: 1000 }
};

const sampleDrivers = app.drivers.slice(0, 5); // Vérifier 5 premiers
let driverImageErrors = 0;

for (const driver of sampleDrivers) {
  const driverPath = path.join(DRIVERS_DIR, driver.id);
  
  for (const [filename, expected] of Object.entries(DRIVER_IMAGE_SPECS)) {
    const imagePath = path.join(driverPath, 'assets', 'images', filename);
    
    if (!fs.existsSync(imagePath)) {
      driverImageErrors++;
      continue;
    }
    
    const dimensions = getImageDimensions(imagePath);
    if (dimensions && 
        (dimensions.width !== expected.width || dimensions.height !== expected.height)) {
      driverImageErrors++;
      warnings.push(
        `⚠️  Driver ${driver.id}/${filename}: ${dimensions.width}x${dimensions.height} (requis: ${expected.width}x${expected.height})`
      );
    }
  }
}

if (driverImageErrors === 0) {
  console.log(`   ✅ Images drivers échantillon OK`);
} else {
  console.log(`   ⚠️  ${driverImageErrors} erreurs détectées dans échantillon`);
}

// ============================================================================
// 4. VÉRIFIER LEARNMODE ZIGBEE DRIVERS
// ============================================================================

console.log('\n🔌 4. Vérification learnmode drivers Zigbee...');

let zigbeeDrivers = 0;
let zigbeeWithoutLearnmode = 0;

for (const driver of app.drivers) {
  if (driver.connectivity && driver.connectivity.includes('zigbee')) {
    zigbeeDrivers++;
    
    if (!driver.zigbee || !driver.zigbee.learnmode) {
      zigbeeWithoutLearnmode++;
      errors.push(`❌ Driver Zigbee sans learnmode: ${driver.id}`);
    }
  }
}

if (zigbeeWithoutLearnmode === 0) {
  console.log(`   ✅ Tous les ${zigbeeDrivers} drivers Zigbee ont learnmode`);
} else {
  console.log(`   ❌ ${zigbeeWithoutLearnmode}/${zigbeeDrivers} drivers sans learnmode`);
}

// ============================================================================
// 5. VÉRIFIER FLOW CARD IDs UNIQUES
// ============================================================================

console.log('\n🔀 5. Vérification unicité Flow Card IDs...');

const flowCardIds = new Set();
const duplicateIds = new Set();

if (app.flow) {
  ['triggers', 'actions', 'conditions'].forEach(type => {
    if (app.flow[type]) {
      app.flow[type].forEach(card => {
        if (flowCardIds.has(card.id)) {
          duplicateIds.add(card.id);
        }
        flowCardIds.add(card.id);
      });
    }
  });
}

if (duplicateIds.size > 0) {
  duplicateIds.forEach(id => {
    errors.push(`❌ Flow card ID dupliqué: ${id}`);
  });
  console.log(`   ❌ ${duplicateIds.size} IDs dupliqués`);
} else {
  console.log(`   ✅ Tous les flow card IDs sont uniques (${flowCardIds.size} total)`);
}

// ============================================================================
// 6. BUILD ET VALIDATION
// ============================================================================

console.log('\n🔨 6. Build et validation Homey...');

try {
  console.log('   Cleaning .homeybuild...');
  const homeybuildPath = path.join(PROJECT_ROOT, '.homeybuild');
  if (fs.existsSync(homeybuildPath)) {
    fs.rmSync(homeybuildPath, { recursive: true, force: true });
  }
  
  console.log('   Building app...');
  execSync('homey app build', { cwd: PROJECT_ROOT, stdio: 'pipe' });
  console.log('   ✅ Build successful');
  
  console.log('   Validating at publish level...');
  const validationOutput = execSync('homey app validate --level publish', {
    cwd: PROJECT_ROOT,
    encoding: 'utf8'
  });
  
  if (validationOutput.includes('validated successfully')) {
    console.log('   ✅ Validation PUBLISH passed');
  } else {
    errors.push('❌ Validation publish failed');
    console.log(validationOutput);
  }
  
} catch (err) {
  errors.push(`❌ Build/validation error: ${err.message}`);
  if (err.stdout) console.log(err.stdout.toString());
  if (err.stderr) console.log(err.stderr.toString());
}

// ============================================================================
// RAPPORT FINAL
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 RAPPORT FINAL\n');

if (errors.length > 0) {
  console.log('❌ ERREURS CRITIQUES:\n');
  errors.forEach(err => console.log('  ' + err));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  AVERTISSEMENTS:\n');
  warnings.forEach(warn => console.log('  ' + warn));
  console.log('');
}

if (fixed.length > 0) {
  console.log('✅ CORRECTIONS APPLIQUÉES:\n');
  fixed.forEach(fix => console.log('  ' + fix));
  console.log('');
}

console.log('='.repeat(80));

if (errors.length === 0 && warnings.length === 0) {
  console.log('🎉 SUCCÈS! App prête pour publication Homey App Store\n');
  console.log('Prochaines étapes:');
  console.log('  1. git add -A');
  console.log('  2. git commit -m "chore: pre-publish validation passed"');
  console.log('  3. git push origin master');
  console.log('  4. homey app publish');
  process.exit(0);
} else {
  console.log('❌ ÉCHEC - Corriger les erreurs avant publication\n');
  console.log('Documentation: references/HOMEY_SDK3_COMPLETE_SPECS.json');
  process.exit(1);
}
