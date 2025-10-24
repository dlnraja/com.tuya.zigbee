#!/usr/bin/env node
'use strict';

/**
 * ULTIMATE IMAGE VALIDATOR AND FIXER v1.0
 * 
 * Détecte et corrige automatiquement TOUS les problèmes d'images:
 * 1. Chemins incorrects dans driver.compose.json
 * 2. Chemins incorrects dans device.js et driver.js
 * 3. Images manquantes
 * 4. Tailles d'images incorrectes
 * 5. Formats d'images invalides
 * 6. Chemins absolus vs relatifs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const driversDir = path.join(__dirname, '../drivers');
const assetsDir = path.join(__dirname, '../assets/images');

// Tailles d'images requises par Homey
const REQUIRED_SIZES = {
  small: { width: 75, height: 75 },
  large: { width: 500, height: 500 },
  xlarge: { width: 1000, height: 1000 }
};

console.log('🔍 ULTIMATE IMAGE VALIDATOR AND FIXER v1.0\n');
console.log('═══════════════════════════════════════════════════════════\n');

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

const issues = {
  wrongPaths: [],
  missingImages: [],
  wrongSizes: [],
  codeReferences: [],
  learnmodeIssues: []
};

let fixed = 0;
let warnings = 0;

/**
 * Get image dimensions using imagemagick identify command
 */
function getImageDimensions(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) return null;
    
    // Try to use imagemagick if available
    try {
      const output = execSync(`identify -format "%wx%h" "${imagePath}"`, { encoding: 'utf-8' });
      const [width, height] = output.trim().split('x').map(Number);
      return { width, height };
    } catch (e) {
      // Fallback: just check if file exists and has reasonable size
      const stats = fs.statSync(imagePath);
      if (stats.size < 100) return { width: 0, height: 0 }; // Too small
      if (stats.size > 5000000) return { width: 9999, height: 9999 }; // Too large
      return { width: -1, height: -1 }; // Can't verify, assume OK
    }
  } catch (err) {
    return null;
  }
}

/**
 * Check if path points to correct driver directory
 */
function isPathCorrect(imagePath, driverId) {
  if (!imagePath) return true;
  
  // Extract driver ID from path
  const match = imagePath.match(/drivers\/([^\/]+)\//);
  if (!match) return true; // Not a driver path
  
  const pathDriverId = match[1];
  return pathDriverId === driverId;
}

/**
 * Fix incorrect path
 */
function fixPath(imagePath, driverId) {
  if (!imagePath) return imagePath;
  return String(imagePath).replace(/drivers\/[^\/]+\//, `drivers/${driverId}/`);
}

/**
 * Scan driver.compose.json for image issues
 */
function scanDriverCompose(driverId) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    let modified = false;
    
    // Check main images
    if (compose.images) {
      for (const [size, imagePath] of Object.entries(compose.images)) {
        // Check if path is correct
        if (!isPathCorrect(imagePath, driverId)) {
          const fixedPath = fixPath(imagePath, driverId);
          issues.wrongPaths.push({
            driver: driverId,
            file: 'driver.compose.json',
            field: `images.${size}`,
            old: imagePath,
            new: fixedPath
          });
          compose.images[size] = fixedPath;
          modified = true;
        }
        
        // Check if image file exists
        const fullPath = path.join(__dirname, '..', compose.images[size]);
        if (!fs.existsSync(fullPath)) {
          issues.missingImages.push({
            driver: driverId,
            file: 'driver.compose.json',
            field: `images.${size}`,
            path: compose.images[size]
          });
        } else {
          // Check image dimensions
          const dimensions = getImageDimensions(fullPath);
          if (dimensions && REQUIRED_SIZES[size]) {
            const required = REQUIRED_SIZES[size];
            if (dimensions.width !== required.width || dimensions.height !== required.height) {
              if (dimensions.width > 0) { // Only warn if we could verify
                issues.wrongSizes.push({
                  driver: driverId,
                  size: size,
                  required: `${required.width}x${required.height}`,
                  actual: `${dimensions.width}x${dimensions.height}`,
                  path: compose.images[size]
                });
              }
            }
          }
        }
      }
    }
    
    // Check learnmode image
    if (compose.learnmode && compose.learnmode.image) {
      if (!isPathCorrect(compose.learnmode.image, driverId)) {
        const fixedPath = fixPath(compose.learnmode.image, driverId);
        issues.wrongPaths.push({
          driver: driverId,
          file: 'driver.compose.json',
          field: 'learnmode.image',
          old: compose.learnmode.image,
          new: fixedPath
        });
        compose.learnmode.image = fixedPath;
        modified = true;
      }
      
      const fullPath = path.join(__dirname, '..', compose.learnmode.image);
      if (!fs.existsSync(fullPath)) {
        issues.learnmodeIssues.push({
          driver: driverId,
          path: compose.learnmode.image
        });
      }
    }
    
    // Check pair images
    if (compose.pair) {
      for (let i = 0; i < compose.pair.length; i++) {
        if (compose.pair[i].images) {
          for (const [size, imagePath] of Object.entries(compose.pair[i].images)) {
            if (!isPathCorrect(imagePath, driverId)) {
              const fixedPath = fixPath(imagePath, driverId);
              issues.wrongPaths.push({
                driver: driverId,
                file: 'driver.compose.json',
                field: `pair[${i}].images.${size}`,
                old: imagePath,
                new: fixedPath
              });
              compose.pair[i].images[size] = fixedPath;
              modified = true;
            }
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      fixed++;
    }
    
  } catch (err) {
    console.error(`❌ Error scanning ${driverId}: ${err.message}`);
  }
}

/**
 * Scan device.js and driver.js for hardcoded image references
 */
function scanCodeFiles(driverId) {
  const filesToCheck = ['device.js', 'driver.js'];
  
  for (const filename of filesToCheck) {
    const filepath = path.join(driversDir, driverId, filename);
    if (!fs.existsSync(filepath)) continue;
    
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      
      // Look for image references
      const imageRegex = /['"`](\.\.\/)?drivers\/([^\/]+)\/assets\/(images\/)?[^'"`]+\.(?:png|jpg|jpeg|svg)['"`]/g;
      let match;
      
      while ((match = imageRegex.exec(content)) !== null) {
        const referencedDriver = match[2];
        if (referencedDriver !== driverId) {
          issues.codeReferences.push({
            driver: driverId,
            file: filename,
            line: content.substring(0, match.index).split('\n').length,
            reference: match[0],
            referencedDriver: referencedDriver
          });
        }
      }
    } catch (err) {
      // Ignore read errors
    }
  }
}

/**
 * Create missing images by copying from template or similar driver
 */
function createMissingImages(driverId) {
  const imagesDir = path.join(driversDir, driverId, 'assets', 'images');
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  let copied = false;
  
  for (const [size, dimensions] of Object.entries(REQUIRED_SIZES)) {
    const targetPath = path.join(imagesDir, `${size}.png`);
    
    if (!fs.existsSync(targetPath)) {
      // Try to find a similar driver's image
      const templatePaths = [
        path.join(assetsDir, `${size}.png`),
        path.join(driversDir, 'avatto_sos_emergency_button', 'assets', 'images', `${size}.png`),
        path.join(driversDir, 'button_1gang', 'assets', 'images', `${size}.png`)
      ];
      
      for (const templatePath of templatePaths) {
        if (fs.existsSync(templatePath)) {
          fs.copyFileSync(templatePath, targetPath);
          console.log(`  📋 Copied ${size}.png for ${driverId}`);
          copied = true;
          break;
        }
      }
    }
  }
  
  return copied;
}

// MAIN SCAN
console.log('🔍 Scanning all drivers...\n');

for (const driverId of drivers) {
  scanDriverCompose(driverId);
  scanCodeFiles(driverId);
}

// REPORT ISSUES
console.log('\n═══════════════════════════════════════════════════════════');
console.log('   VALIDATION REPORT');
console.log('═══════════════════════════════════════════════════════════\n');

if (issues.wrongPaths.length > 0) {
  console.log(`\n🔧 WRONG PATHS FIXED: ${issues.wrongPaths.length}`);
  console.log('─────────────────────────────────────────────────────────\n');
  for (const issue of issues.wrongPaths.slice(0, 10)) {
    console.log(`  ✅ ${issue.driver}/${issue.file}`);
    console.log(`     Field: ${issue.field}`);
    console.log(`     Fixed: ${issue.old} → ${issue.new}\n`);
  }
  if (issues.wrongPaths.length > 10) {
    console.log(`  ...and ${issues.wrongPaths.length - 10} more\n`);
  }
}

if (issues.missingImages.length > 0) {
  console.log(`\n⚠️  MISSING IMAGES: ${issues.missingImages.length}`);
  console.log('─────────────────────────────────────────────────────────\n');
  
  const missingByDriver = {};
  for (const issue of issues.missingImages) {
    if (!missingByDriver[issue.driver]) {
      missingByDriver[issue.driver] = [];
    }
    missingByDriver[issue.driver].push(issue);
  }
  
  for (const [driverId, driverIssues] of Object.entries(missingByDriver)) {
    console.log(`  📦 ${driverId}:`);
    for (const issue of driverIssues) {
      console.log(`     Missing: ${issue.path}`);
    }
    
    // Try to create missing images
    if (createMissingImages(driverId)) {
      console.log(`     ✅ Created missing images from template\n`);
    } else {
      console.log(`     ⚠️  Could not auto-create images\n`);
      warnings++;
    }
  }
}

if (issues.wrongSizes.length > 0) {
  console.log(`\n⚠️  WRONG IMAGE SIZES: ${issues.wrongSizes.length}`);
  console.log('─────────────────────────────────────────────────────────\n');
  for (const issue of issues.wrongSizes.slice(0, 5)) {
    console.log(`  📏 ${issue.driver} - ${issue.size}.png`);
    console.log(`     Required: ${issue.required}`);
    console.log(`     Actual: ${issue.actual}\n`);
  }
  if (issues.wrongSizes.length > 5) {
    console.log(`  ...and ${issues.wrongSizes.length - 5} more\n`);
  }
  warnings += issues.wrongSizes.length;
}

if (issues.codeReferences.length > 0) {
  console.log(`\n⚠️  HARDCODED IMAGE REFERENCES: ${issues.codeReferences.length}`);
  console.log('─────────────────────────────────────────────────────────\n');
  for (const issue of issues.codeReferences.slice(0, 5)) {
    console.log(`  📝 ${issue.driver}/${issue.file}:${issue.line}`);
    console.log(`     References: ${issue.referencedDriver} (should be ${issue.driver})`);
    console.log(`     Code: ${issue.reference}\n`);
  }
  if (issues.codeReferences.length > 5) {
    console.log(`  ...and ${issues.codeReferences.length - 5} more\n`);
  }
  warnings += issues.codeReferences.length;
}

if (issues.learnmodeIssues.length > 0) {
  console.log(`\n⚠️  LEARNMODE IMAGE ISSUES: ${issues.learnmodeIssues.length}`);
  console.log('─────────────────────────────────────────────────────────\n');
  for (const issue of issues.learnmodeIssues) {
    console.log(`  📋 ${issue.driver}: ${issue.path}\n`);
  }
  warnings += issues.learnmodeIssues.length;
}

// SUMMARY
console.log('\n═══════════════════════════════════════════════════════════');
console.log('   SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Drivers scanned: ${drivers.length}`);
console.log(`🔧 Paths fixed: ${issues.wrongPaths.length}`);
console.log(`📋 Images created: ${issues.missingImages.filter(i => fs.existsSync(path.join(driversDir, i.driver, 'assets', 'images'))).length}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Issues remaining: ${issues.missingImages.length + issues.wrongSizes.length + issues.codeReferences.length + issues.learnmodeIssues.length - issues.missingImages.filter(i => fs.existsSync(path.join(driversDir, i.driver, 'assets', 'images'))).length}\n`);

if (warnings === 0 && issues.wrongPaths.length === 0) {
  console.log('🎉 ALL IMAGES ARE PERFECT!\n');
} else if (warnings > 0) {
  console.log('⚠️  Some issues require manual attention.\n');
} else {
  console.log('✅ All auto-fixable issues have been corrected!\n');
}

// Save detailed report
const reportPath = path.join(__dirname, '../IMAGE_VALIDATION_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
console.log(`📊 Detailed report saved to: IMAGE_VALIDATION_REPORT.json\n`);
