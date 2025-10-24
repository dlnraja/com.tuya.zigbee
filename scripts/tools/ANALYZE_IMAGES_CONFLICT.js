#!/usr/bin/env node
'use strict';

/**
 * ANALYZE IMAGES CONFLICT
 * 
 * Analyse pourquoi les images du dossier assets/ pourraient ecraser
 * celles des drivers individuels dans drivers assets
 * 
 * Vérifie:
 * - app.json images paths
 * - .homeycompose conflits
 * - .homeybuild cache
 * - Drivers individual images
 */

const fs = require('fs-extra');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..', '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

async function getImageDimensions(imagePath) {
  try {
    const buffer = await fs.readFile(imagePath);
    const png = PNG.sync.read(buffer);
    return { width: png.width, height: png.height };
  } catch (err) {
    return null;
  }
}

async function analyzeAppImages() {
  console.log('📊 ANALYZING APP-LEVEL IMAGES\n');
  
  const app = await fs.readJson(APP_JSON);
  const images = app.images || {};
  
  console.log('App.json images configuration:');
  console.log(JSON.stringify(images, null, 2));
  console.log();
  
  // Vérifier les images réelles
  for (const [key, imgPath] of Object.entries(images)) {
    const fullPath = path.join(ROOT, String(imgPath).replace(/^\//, ''));
    if (await fs.pathExists(fullPath)) {
      const dims = await getImageDimensions(fullPath);
      console.log(`✅ ${key}: ${imgPath}`);
      if (dims) {
        console.log(`   → ${dims.width}x${dims.height}px`);
      }
    } else {
      console.log(`❌ ${key}: ${imgPath} (MISSING)`);
    }
  }
  console.log();
}

async function analyzeDriverImages() {
  console.log('📊 ANALYZING DRIVER IMAGES\n');
  
  const drivers = await fs.readdir(DRIVERS_DIR);
  const results = {
    withImages: [],
    withoutImages: [],
    imageSizeIssues: []
  };
  
  for (const driver of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driver);
    const stat = await fs.stat(driverPath);
    
    if (!stat.isDirectory()) continue;
    
    const assetsPath = path.join(driverPath, 'assets');
    const smallPath = path.join(assetsPath, 'small.png');
    const largePath = path.join(assetsPath, 'large.png');
    
    const hasSmall = await fs.pathExists(smallPath);
    const hasLarge = await fs.pathExists(largePath);
    
    if (hasSmall && hasLarge) {
      const smallDims = await getImageDimensions(smallPath);
      const largeDims = await getImageDimensions(largePath);
      
      results.withImages.push({
        driver,
        small: smallDims,
        large: largeDims
      });
      
      // Vérifier les dimensions
      if (smallDims && (smallDims.width !== 75 || smallDims.height !== 75)) {
        results.imageSizeIssues.push({
          driver,
          image: 'small',
          expected: '75x75',
          actual: `${smallDims.width}x${smallDims.height}`
        });
      }
      
      if (largeDims && (largeDims.width !== 500 || largeDims.height !== 500)) {
        results.imageSizeIssues.push({
          driver,
          image: 'large',
          expected: '500x500',
          actual: `${largeDims.width}x${largeDims.height}`
        });
      }
    } else {
      results.withoutImages.push({
        driver,
        hasSmall,
        hasLarge
      });
    }
  }
  
  console.log(`✅ Drivers with proper images: ${results.withImages.length}`);
  console.log(`⚠️  Drivers with missing images: ${results.withoutImages.length}`);
  console.log(`❌ Drivers with size issues: ${results.imageSizeIssues.length}`);
  console.log();
  
  if (results.withoutImages.length > 0) {
    console.log('Missing images:');
    results.withoutImages.slice(0, 10).forEach(d => {
      console.log(`  - ${d.driver} (small: ${d.hasSmall}, large: ${d.hasLarge})`);
    });
    if (results.withoutImages.length > 10) {
      console.log(`  ... and ${results.withoutImages.length - 10} more`);
    }
    console.log();
  }
  
  if (results.imageSizeIssues.length > 0) {
    console.log('Size issues:');
    results.imageSizeIssues.forEach(issue => {
      console.log(`  - ${issue.driver}/${issue.image}: ${issue.actual} (expected ${issue.expected})`);
    });
    console.log();
  }
  
  return results;
}

async function checkHomeyCompose() {
  console.log('📊 CHECKING .homeycompose/\n');
  
  const composeDir = path.join(ROOT, '.homeycompose');
  
  if (await fs.pathExists(composeDir)) {
    console.log('⚠️  .homeycompose/ exists (should be cleaned before validation)');
    
    const files = await fs.readdir(composeDir, { recursive: true });
    console.log(`   Contains ${files.length} files`);
    
    // Chercher des conflits d'images
    const imageFiles = files.filter(f => f.endsWith('.png'));
    if (imageFiles.length > 0) {
      console.log('   Image files in .homeycompose:');
      imageFiles.slice(0, 5).forEach(f => console.log(`     - ${f}`));
      if (imageFiles.length > 5) {
        console.log(`     ... and ${imageFiles.length - 5} more`);
      }
    }
  } else {
    console.log('✅ .homeycompose/ does not exist');
  }
  console.log();
}

async function checkHomeybuild() {
  console.log('📊 CHECKING .homeybuild/\n');
  
  const buildDir = path.join(ROOT, '.homeybuild');
  
  if (await fs.pathExists(buildDir)) {
    console.log('⚠️  .homeybuild/ exists (cached build)');
    
    const assetsPath = path.join(buildDir, 'assets');
    if (await fs.pathExists(assetsPath)) {
      const images = await fs.readdir(path.join(assetsPath, 'images')).catch(() => []);
      if (images.length > 0) {
        console.log('   Images in .homeybuild/assets/images:');
        for (const img of images) {
          const imgPath = path.join(assetsPath, 'images', img);
          const dims = await getImageDimensions(imgPath);
          if (dims) {
            console.log(`     - ${img}: ${dims.width}x${dims.height}px`);
          }
        }
      }
    }
  } else {
    console.log('✅ .homeybuild/ does not exist');
  }
  console.log();
}

async function analyzeAppJsonStructure() {
  console.log('📊 ANALYZING app.json DRIVERS STRUCTURE\n');
  
  const app = await fs.readJson(APP_JSON);
  
  if (!app.drivers) {
    console.log('❌ No drivers in app.json!');
    return;
  }
  
  console.log(`✅ ${app.drivers.length} drivers in app.json`);
  
  // Vérifier les images des drivers
  const driversWithImages = app.drivers.filter(d => d.images);
  const driversWithoutImages = app.drivers.filter(d => !d.images);
  
  console.log(`   - ${driversWithImages.length} with images config`);
  console.log(`   - ${driversWithoutImages.length} without images config`);
  console.log();
  
  // Analyser les paths
  const imagePaths = new Set();
  app.drivers.forEach(driver => {
    if (driver.images) {
      Object.values(driver.images).forEach(path => imagePaths.add(path));
    }
  });
  
  console.log('Image path patterns:');
  const patterns = {};
  imagePaths.forEach(p => {
    const pattern = String(p).replace(/\/[^/]+\//, '/{driver}/');
    patterns[pattern] = (patterns[pattern] || 0) + 1;
  });
  
  Object.entries(patterns).forEach(([pattern, count]) => {
    console.log(`  ${pattern}: ${count} occurrences`);
  });
  console.log();
}

async function findConflicts() {
  console.log('🔍 SEARCHING FOR IMAGE CONFLICTS\n');
  
  const app = await fs.readJson(APP_JSON);
  const appImages = app.images || {};
  
  // Vérifier si les images app pointent vers assets/
  const pointsToAssets = Object.values(appImages).some(p => p.includes('/assets/images/'));
  
  if (pointsToAssets) {
    console.log('⚠️  POTENTIAL CONFLICT DETECTED:');
    console.log('   App-level images point to /assets/images/');
    console.log('   This could override driver-specific images during build');
    console.log();
    console.log('   Recommendation:');
    console.log('   - App images should be in assets/images/');
    console.log('   - Driver images should be in drivers/*/assets/');
    console.log('   - Homey build process keeps them separate');
    console.log();
  } else {
    console.log('✅ No obvious conflict pattern detected');
    console.log();
  }
  
  // Vérifier les drivers sans images propres
  const driversWithoutOwnImages = [];
  for (const driver of app.drivers) {
    if (!driver.images) {
      driversWithoutOwnImages.push(driver.id);
    }
  }
  
  if (driversWithoutOwnImages.length > 0) {
    console.log(`⚠️  ${driversWithoutOwnImages.length} drivers without explicit image paths:`);
    driversWithoutOwnImages.slice(0, 5).forEach(id => console.log(`   - ${id}`));
    if (driversWithoutOwnImages.length > 5) {
      console.log(`   ... and ${driversWithoutOwnImages.length - 5} more`);
    }
    console.log();
    console.log('   → These will fall back to app-level images or auto-detection');
    console.log();
  }
}

async function main() {
  console.log('🔍 IMAGE CONFLICT ANALYZER\n');
  console.log('='.repeat(60));
  console.log();
  
  await analyzeAppImages();
  await analyzeDriverImages();
  await checkHomeyCompose();
  await checkHomeybuild();
  await analyzeAppJsonStructure();
  await findConflicts();
  
  console.log('='.repeat(60));
  console.log('\n✅ Analysis complete!');
  console.log('\n📝 RECOMMENDATIONS:');
  console.log('   1. Clean .homeybuild and .homeycompose before validation');
  console.log('   2. Ensure all drivers have proper assets/small.png and assets/large.png');
  console.log('   3. App-level images are for the app icon in Homey App Store');
  console.log('   4. Driver-level images are for device pairing UI');
  console.log('   5. These are kept separate by Homey build process');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
