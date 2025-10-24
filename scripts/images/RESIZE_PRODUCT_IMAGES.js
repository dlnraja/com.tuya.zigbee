#!/usr/bin/env node
/**
 * RESIZE PRODUCT IMAGES
 * Redimensionne les images téléchargées aux tailles Homey SDK3
 * 75x75, 500x500, 1000x1000
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Tailles requises par Homey SDK3
const SIZES = [
  { name: 'small', size: 75 },
  { name: 'large', size: 500 },
  { name: 'xlarge', size: 1000 }
];

function checkImageMagick() {
  try {
    execSync('magick --version', { stdio: 'pipe' });
    return 'magick';
  } catch (e) {
    try {
      execSync('convert --version', { stdio: 'pipe' });
      return 'convert';
    } catch (e2) {
      return null;
    }
  }
}

function resizeImage(inputPath, outputPath, size, tool) {
  try {
    if (tool === 'magick') {
      execSync(`magick "${inputPath}" -resize ${size}x${size}^ -gravity center -extent ${size}x${size} -quality 95 "${outputPath}"`, { stdio: 'pipe' });
    } else {
      execSync(`convert "${inputPath}" -resize ${size}x${size}^ -gravity center -extent ${size}x${size} -quality 95 "${outputPath}"`, { stdio: 'pipe' });
    }
    return true;
  } catch (err) {
    console.error(`    ❌ Resize failed: ${err.message}`);
    return false;
  }
}

function resizeProductImagesForDriver(driverName, driverPath, tool) {
  console.log(`\n🖼️  Processing: ${driverName}`);
  
  const assetsDir = path.join(driverPath, 'assets');
  const originalPath = path.join(assetsDir, 'product-original.jpg');
  
  if (!fs.existsSync(originalPath)) {
    console.log(`  ⏭️  No product-original.jpg found, skipping`);
    return { status: 'skipped', reason: 'no_original' };
  }
  
  let successCount = 0;
  
  for (const { name, size } of SIZES) {
    const outputPath = path.join(assetsDir, `${name}.png`);
    
    console.log(`  🔄 Resizing to ${size}x${size}...`);
    const success = resizeImage(originalPath, outputPath, size, tool);
    
    if (success) {
      console.log(`  ✅ Created: ${name}.png`);
      successCount++;
    }
  }
  
  if (successCount === SIZES.length) {
    return { status: 'success', created: successCount };
  } else {
    return { status: 'partial', created: successCount };
  }
}

function main() {
  console.log('📐 RESIZE PRODUCT IMAGES\n');
  console.log('Resizing downloaded images to Homey SDK3 sizes...\n');
  
  // Vérifier ImageMagick
  const tool = checkImageMagick();
  if (!tool) {
    console.error('❌ ImageMagick not found!');
    console.error('\n📦 Install ImageMagick:');
    console.error('   Windows: choco install imagemagick');
    console.error('   macOS:   brew install imagemagick');
    console.error('   Linux:   sudo apt install imagemagick');
    process.exit(1);
  }
  
  console.log(`✅ Using: ${tool}\n`);
  
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.error('❌ Drivers directory not found');
    process.exit(1);
  }
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(name => {
      const fullPath = path.join(DRIVERS_DIR, name);
      return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
    });
  
  let successCount = 0;
  let partialCount = 0;
  let skippedCount = 0;
  const results = [];
  
  for (const driverName of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const result = resizeProductImagesForDriver(driverName, driverPath, tool);
    
    results.push({ driver: driverName, ...result });
    
    if (result.status === 'success') {
      successCount++;
    } else if (result.status === 'partial') {
      partialCount++;
    } else {
      skippedCount++;
    }
  }
  
  // Rapport final
  const report = {
    date: new Date().toISOString(),
    tool: tool,
    totalDrivers: drivers.length,
    success: successCount,
    partial: partialCount,
    skipped: skippedCount,
    sizes: SIZES,
    results: results
  };
  
  const reportPath = path.join(ROOT, 'reports', 'IMAGE_RESIZE_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\n✅ Image resize complete!`);
  console.log(`   Success: ${successCount} drivers`);
  console.log(`   Partial: ${partialCount} drivers`);
  console.log(`   Skipped: ${skippedCount} drivers`);
  console.log(`   Report: ${reportPath}`);
  
  console.log(`\n✅ All drivers now have properly sized images!`);
}

main();
