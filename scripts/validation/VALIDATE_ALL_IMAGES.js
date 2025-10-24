#!/usr/bin/env node

/**
 * VALIDATE ALL IMAGES
 * Vérifie et corrige TOUTES les images selon specs Homey SDK3
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const ASSETS_DIR = path.join(ROOT, 'assets');

(async () => {

console.log('🖼️  VALIDATING ALL IMAGES\n');
console.log('='.repeat(70) + '\n');

// Homey SDK3 image specifications
const SPECS = {
  app: {
    small: { width: 250, height: 175 },
    large: { width: 500, height: 350 },
    xlarge: { width: 1000, height: 700 }
  },
  driver: {
    small: { width: 75, height: 75 },
    large: { width: 500, height: 500 },
    xlarge: { width: 1000, height: 1000 }
  }
};

const issues = {
  appImages: [],
  driverImages: [],
  fixed: []
};

/**
 * Resize image to target dimensions
 */
async function resizeImage(inputPath, outputPath, width, height) {
  try {
    const image = await loadImage(inputPath);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate scaling to fit
    const scale = Math.min(width / image.width, height / image.height);
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    
    // Draw image centered
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
    
    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    return true;
  } catch (err) {
    console.error(`Error resizing ${inputPath}:`, err.message);
    return false;
  }
}

/**
 * Check image dimensions
 */
function checkImageSize(imagePath, expectedWidth, expectedHeight) {
  if (!fs.existsSync(imagePath)) {
    return { valid: false, reason: 'missing' };
  }
  
  try {
    const { PNG } = require('pngjs');
    const data = fs.readFileSync(imagePath);
    const png = PNG.sync.read(data);
    
    if (png.width !== expectedWidth || png.height !== expectedHeight) {
      return {
        valid: false,
        reason: 'wrong_size',
        actual: { width: png.width, height: png.height },
        expected: { width: expectedWidth, height: expectedHeight }
      };
    }
    
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: 'corrupt', error: err.message };
  }
}

console.log('📋 Step 1: Checking App Images\n');

// Check app images
['small', 'large', 'xlarge'].forEach(size => {
  const imagePath = path.join(ASSETS_DIR, 'images', `${size}.png`);
  const spec = SPECS.app[size];
  
  const result = checkImageSize(imagePath, spec.width, spec.height);
  
  if (!result.valid) {
    console.log(`❌ App ${size}.png: ${result.reason}`);
    if (result.actual) {
      console.log(`   Expected: ${result.expected.width}x${result.expected.height}`);
      console.log(`   Actual: ${result.actual.width}x${result.actual.height}`);
    }
    issues.appImages.push({ size, path: imagePath, result });
  } else {
    console.log(`✅ App ${size}.png: ${spec.width}x${spec.height}`);
  }
});

console.log('\n📋 Step 2: Checking Driver Images\n');

// Check driver images
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
});

let checkedDrivers = 0;
let validDrivers = 0;

drivers.forEach(driverName => {
  const assetsPath = path.join(DRIVERS_DIR, driverName, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    return;
  }
  
  checkedDrivers++;
  let driverValid = true;
  
  ['small', 'large', 'xlarge'].forEach(size => {
    const imagePath = path.join(assetsPath, `${size}.png`);
    const spec = SPECS.driver[size];
    
    const result = checkImageSize(imagePath, spec.width, spec.height);
    
    if (!result.valid) {
      driverValid = false;
      console.log(`❌ ${driverName}/${size}.png: ${result.reason}`);
      if (result.actual) {
        console.log(`   Expected: ${result.expected.width}x${result.expected.height}`);
        console.log(`   Actual: ${result.actual.width}x${result.actual.height}`);
      }
      issues.driverImages.push({
        driver: driverName,
        size,
        path: imagePath,
        result
      });
    }
  });
  
  if (driverValid) {
    validDrivers++;
  }
});

console.log(`\n✅ Valid drivers: ${validDrivers}/${checkedDrivers}\n`);

// Fix issues if any
if (issues.appImages.length > 0 || issues.driverImages.length > 0) {
  console.log('🔧 Step 3: Fixing Image Issues\n');
  
  // Try to fix app images
  for (const issue of issues.appImages) {
    const spec = SPECS.app[issue.size];
    
    // Try to find source image (use large as source)
    let sourcePath = path.join(ASSETS_DIR, 'images', 'large.png');
    if (!fs.existsSync(sourcePath)) {
      sourcePath = path.join(ASSETS_DIR, 'images', 'small.png');
    }
    
    if (fs.existsSync(sourcePath)) {
      console.log(`🔧 Fixing app ${issue.size}.png...`);
      const success = await resizeImage(sourcePath, issue.path, spec.width, spec.height);
      if (success) {
        console.log(`✅ Fixed app ${issue.size}.png`);
        issues.fixed.push(`app/${issue.size}.png`);
      }
    }
  }
  
  // Try to fix driver images
  for (const issue of issues.driverImages) {
    const spec = SPECS.driver[issue.size];
    const driverPath = path.join(DRIVERS_DIR, issue.driver, 'assets');
    
    // Try to find source (use large as source)
    let sourcePath = path.join(driverPath, 'large.png');
    if (!fs.existsSync(sourcePath)) {
      sourcePath = path.join(driverPath, 'small.png');
    }
    
    if (fs.existsSync(sourcePath)) {
      console.log(`🔧 Fixing ${issue.driver}/${issue.size}.png...`);
      const success = await resizeImage(sourcePath, issue.path, spec.width, spec.height);
      if (success) {
        console.log(`✅ Fixed ${issue.driver}/${issue.size}.png`);
        issues.fixed.push(`${issue.driver}/${issue.size}.png`);
      }
    }
  }
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('\n📊 VALIDATION SUMMARY\n');
console.log(`App images issues: ${issues.appImages.length}`);
console.log(`Driver images issues: ${issues.driverImages.length}`);
console.log(`Fixed: ${issues.fixed.length}`);

// Save report
const report = {
  timestamp: new Date().toISOString(),
  specs: SPECS,
  checked: {
    drivers: checkedDrivers,
    valid: validDrivers
  },
  issues: {
    app: issues.appImages.length,
    drivers: issues.driverImages.length,
    total: issues.appImages.length + issues.driverImages.length
  },
  fixed: issues.fixed
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'IMAGE_VALIDATION.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📝 Report saved to: reports/IMAGE_VALIDATION.json\n');

if (issues.appImages.length > 0 || issues.driverImages.length > 0) {
  if (issues.fixed.length > 0) {
    console.log('✅ Issues found and fixed!\n');
    process.exit(0);
  } else {
    console.log('❌ Issues found but could not fix!\n');
    process.exit(1);
  }
} else {
  console.log('✅ All images valid!\n');
  process.exit(0);
}

})();
