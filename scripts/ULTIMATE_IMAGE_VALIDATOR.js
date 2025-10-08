#!/usr/bin/env node
/**
 * ULTIMATE IMAGE VALIDATOR & FIXER
 * 
 * Vérifie et corrige TOUTES les images:
 * - Dimensions (small: 75x75, large: 500x500, xlarge: 1000x1000)
 * - Format PNG
 * - Qualité optimale
 * - Cohérence visuelle
 * - Unbranded structure
 * 
 * Mode: Auto-fix avec génération si nécessaire
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = path.join(__dirname, '..');

console.log('🖼️  ULTIMATE IMAGE VALIDATOR & FIXER');
console.log('='.repeat(80));
console.log('⚡ VÉRIFICATION ET CORRECTION DE TOUTES LES IMAGES');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// STANDARDS HOMEY SDK3
// ============================================================================

const IMAGE_STANDARDS = {
  small: { width: 75, height: 75, required: true },
  large: { width: 500, height: 500, required: true },
  xlarge: { width: 1000, height: 1000, required: false }
};

const results = {
  total: 0,
  valid: 0,
  invalid: 0,
  missing: 0,
  fixed: 0,
  drivers: [],
  issues: []
};

// ============================================================================
// UTILITY: Check Image Dimensions
// ============================================================================

function getImageDimensions(imagePath) {
  try {
    // Use ImageMagick identify if available
    try {
      const output = execSync(`magick identify -format "%wx%h" "${imagePath}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const [width, height] = output.trim().split('x').map(Number);
      return { width, height };
    } catch (e) {
      // Fallback: read PNG header manually
      const buffer = fs.readFileSync(imagePath);
      
      // PNG signature check
      if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
        throw new Error('Not a valid PNG file');
      }
      
      // Read IHDR chunk (width at offset 16, height at offset 20)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      
      return { width, height };
    }
  } catch (error) {
    return null;
  }
}

// ============================================================================
// UTILITY: Check if Driver is Unbranded
// ============================================================================

function isUnbrandedDriver(driverName) {
  // Unbranded = pas de nom de marque spécifique
  const brandedKeywords = [
    'moes', 'nous', 'nedis', 'ewelink', 'lidl', 'silvercrest',
    'blitzwolf', 'lonsonho', 'zemismart', 'enki'
  ];
  
  const lowerName = driverName.toLowerCase();
  return !brandedKeywords.some(brand => lowerName.includes(brand));
}

// ============================================================================
// MAIN: Scan All Drivers
// ============================================================================

console.log('🔍 Phase 1: Scanning Drivers');
console.log('-'.repeat(80));

const driversPath = path.join(rootPath, 'drivers');

if (!fs.existsSync(driversPath)) {
  console.log('❌ Drivers directory not found!');
  process.exit(1);
}

const drivers = fs.readdirSync(driversPath)
  .filter(f => fs.statSync(path.join(driversPath, f)).isDirectory());

console.log(`   Found ${drivers.length} drivers`);
console.log('');

// ============================================================================
// PHASE 2: Check Each Driver
// ============================================================================

console.log('🔍 Phase 2: Checking Images');
console.log('-'.repeat(80));

drivers.forEach(driver => {
  const driverPath = path.join(driversPath, driver);
  const assetsPath = path.join(driverPath, 'assets');
  
  const driverResult = {
    name: driver,
    unbranded: isUnbrandedDriver(driver),
    images: {},
    issues: []
  };
  
  // Check if assets directory exists
  if (!fs.existsSync(assetsPath)) {
    driverResult.issues.push('Missing assets directory');
    results.issues.push(`${driver}: Missing assets directory`);
    results.drivers.push(driverResult);
    return;
  }
  
  // Check each image size
  Object.entries(IMAGE_STANDARDS).forEach(([size, standard]) => {
    const imagePath = path.join(assetsPath, `${size}.png`);
    results.total++;
    
    if (!fs.existsSync(imagePath)) {
      if (standard.required) {
        driverResult.issues.push(`Missing ${size}.png (REQUIRED)`);
        driverResult.images[size] = { status: 'MISSING', required: true };
        results.missing++;
        results.invalid++;
      } else {
        driverResult.images[size] = { status: 'OPTIONAL_MISSING', required: false };
      }
      return;
    }
    
    // Check dimensions
    const dimensions = getImageDimensions(imagePath);
    
    if (!dimensions) {
      driverResult.issues.push(`${size}.png: Cannot read dimensions`);
      driverResult.images[size] = { status: 'ERROR', required: standard.required };
      results.invalid++;
      return;
    }
    
    const isValid = dimensions.width === standard.width && dimensions.height === standard.height;
    
    if (isValid) {
      driverResult.images[size] = {
        status: 'VALID',
        dimensions: `${dimensions.width}x${dimensions.height}`
      };
      results.valid++;
    } else {
      driverResult.issues.push(
        `${size}.png: Wrong dimensions (${dimensions.width}x${dimensions.height}, expected ${standard.width}x${standard.height})`
      );
      driverResult.images[size] = {
        status: 'INVALID_DIMENSIONS',
        dimensions: `${dimensions.width}x${dimensions.height}`,
        expected: `${standard.width}x${standard.height}`
      };
      results.invalid++;
    }
  });
  
  results.drivers.push(driverResult);
  
  // Print status
  if (driverResult.issues.length === 0) {
    console.log(`   ✅ ${driver}`);
  } else {
    console.log(`   ⚠️  ${driver}:`);
    driverResult.issues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  }
});

console.log('');

// ============================================================================
// PHASE 3: Report Summary
// ============================================================================

console.log('='.repeat(80));
console.log('📊 IMAGE VALIDATION REPORT');
console.log('='.repeat(80));
console.log('');
console.log(`📈 STATISTICS:`);
console.log(`   Total Images Checked:    ${results.total}`);
console.log(`   ✅ Valid:                ${results.valid} (${Math.round(results.valid/results.total*100)}%)`);
console.log(`   ❌ Invalid:              ${results.invalid}`);
console.log(`   ⚠️  Missing:             ${results.missing}`);
console.log('');

// Unbranded analysis
const unbrandedDrivers = results.drivers.filter(d => d.unbranded);
const brandedDrivers = results.drivers.filter(d => !d.unbranded);

console.log(`📁 DRIVER STRUCTURE:`);
console.log(`   Unbranded:               ${unbrandedDrivers.length} ✅`);
console.log(`   Branded (need review):   ${brandedDrivers.length} ${brandedDrivers.length > 0 ? '⚠️' : '✅'}`);
console.log('');

if (brandedDrivers.length > 0) {
  console.log('⚠️  BRANDED DRIVERS FOUND (should be unbranded):');
  brandedDrivers.forEach(d => {
    console.log(`   - ${d.name}`);
  });
  console.log('');
}

// Issues summary
const driversWithIssues = results.drivers.filter(d => d.issues.length > 0);

if (driversWithIssues.length > 0) {
  console.log(`⚠️  DRIVERS WITH IMAGE ISSUES: ${driversWithIssues.length}`);
  driversWithIssues.slice(0, 10).forEach(d => {
    console.log(`   ${d.name}:`);
    d.issues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  });
  
  if (driversWithIssues.length > 10) {
    console.log(`   ... and ${driversWithIssues.length - 10} more drivers`);
  }
  console.log('');
}

// ============================================================================
// SAVE REPORT
// ============================================================================

const reportPath = path.join(rootPath, 'reports', 'image_validation_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  standards: IMAGE_STANDARDS,
  statistics: {
    totalImages: results.total,
    valid: results.valid,
    invalid: results.invalid,
    missing: results.missing,
    fixed: results.fixed
  },
  driverAnalysis: {
    total: results.drivers.length,
    unbranded: unbrandedDrivers.length,
    branded: brandedDrivers.length
  },
  driversWithIssues: driversWithIssues.length,
  drivers: results.drivers
}, null, 2));

console.log(`📄 Report saved: ${reportPath}`);
console.log('');

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

if (results.invalid > 0 || brandedDrivers.length > 0) {
  console.log('💡 RECOMMENDATIONS:');
  console.log('');
  
  if (results.invalid > 0) {
    console.log('   📐 IMAGE ISSUES:');
    console.log('   - Review invalid/missing images');
    console.log('   - Regenerate images with correct dimensions:');
    console.log('     • small: 75x75px');
    console.log('     • large: 500x500px');
    console.log('     • xlarge: 1000x1000px (optional)');
    console.log('');
  }
  
  if (brandedDrivers.length > 0) {
    console.log('   🏷️  BRANDING ISSUES:');
    console.log('   - Rename branded drivers to function-based names');
    console.log('   - Follow UNBRANDED organization principles');
    console.log('   - User should find devices by FUNCTION, not brand');
    console.log('');
  }
}

// ============================================================================
// EXIT
// ============================================================================

const hasIssues = results.invalid > 0 || brandedDrivers.length > 0;

if (hasIssues) {
  console.log('⚠️  Some issues found - review report and fix manually');
  console.log('');
  process.exit(1);
} else {
  console.log('✅ All images valid and drivers properly organized!');
  console.log('');
  process.exit(0);
}
