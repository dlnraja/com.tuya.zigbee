#!/usr/bin/env node
'use strict';

/**
 * Driver Image Checker - Modernized
 *
 * Consolidates functionality from:
 *   - scripts/legacy/fix_driver_images.js
 *
 * Features:
 *   - Validates driver images exist (small.png, large.png, xlarge.png)
 *   - Checks image file sizes
 *   - Reports missing images
 *   - --json output for CI integration
 *   - --dry-run mode
 *   - Proper error handling and logging
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Homey image requirements
const IMAGE_SPECS = {
  'small.png': { width: 75, height: 75, maxSizeKB: 50 },
  'large.png': { width: 500, height: 500, maxSizeKB: 200 },
  'xlarge.png': { width: 1000, height: 1000, maxSizeKB: 500 },
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    json: args.includes('--json'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

/**
 * Check images for a single driver
 */
function checkDriverImages(driverName) {
  const imagesPath = path.join(DRIVERS_DIR, driverName, 'assets', 'images');
  const result = {
    driver: driverName,
    missing: [],
    oversized: [],
    valid: [],
    hasImages: false,
  };

  if (!fs.existsSync(imagesPath)) {
    result.missing = Object.keys(IMAGE_SPECS);
    return result;
  }

  for (const [filename, spec] of Object.entries(IMAGE_SPECS)) {
    const filePath = path.join(imagesPath, filename);

    if (!fs.existsSync(filePath)) {
      result.missing.push(filename);
    } else {
      const stat = fs.statSync(filePath);
      const sizeKB = stat.size / 1024;

      if (sizeKB > spec.maxSizeKB) {
        result.oversized.push({
          file: filename,
          sizeKB: Math.round(sizeKB),
          maxSizeKB: spec.maxSizeKB,
        });
      } else {
        result.valid.push(filename);
      }
    }
  }

  result.hasImages = result.valid.length > 0;
  return result;
}

/**
 * Main checker function
 */
function runDriverImageChecker(opts = {}) {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DRIVER IMAGE CHECKER - Modernized v2.0.0                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Scan drivers
  const entries = fs.readdirSync(DRIVERS_DIR);
  const drivers = entries.filter(entry => {
    const driverPath = path.join(DRIVERS_DIR, entry);
    return fs.statSync(driverPath).isDirectory() && !entry.startsWith('.');
  });

  console.log(`   Drivers scanned: ${drivers.length}\n`);

  // Check each driver
  const results = [];
  const missingDrivers = [];
  const oversizedDrivers = [];

  for (const driver of drivers) {
    const result = checkDriverImages(driver);
    results.push(result);

    if (result.missing.length > 0) {
      missingDrivers.push(result);
    }
    if (result.oversized.length > 0) {
      oversizedDrivers.push(result);
    }
  }

  const duration = Date.now() - startTime;
  const totalMissing = missingDrivers.reduce((sum, d) => sum + d.missing.length, 0);
  const totalOversized = oversizedDrivers.reduce((sum, d) => sum + d.oversized.length, 0);
  const passed = totalMissing === 0 && totalOversized === 0;

  // Build result
  const result = {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    passed,
    summary: {
      driversScanned: drivers.length,
      driversWithAllImages: results.filter(r => r.missing.length === 0).length,
      driversWithMissingImages: missingDrivers.length,
      totalMissingImages: totalMissing,
      driversWithOversizedImages: oversizedDrivers.length,
      totalOversizedImages: totalOversized,
    },
    missingImages: missingDrivers.map(d => ({
      driver: d.driver,
      missing: d.missing,
    })),
    oversizedImages: oversizedDrivers.map(d => ({
      driver: d.driver,
      oversized: d.oversized,
    })),
  };

  // Output
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (missingDrivers.length > 0) {
      console.log('   MISSING IMAGES:');
      for (const driver of missingDrivers.slice(0, 20)) {
        console.log(`     ${driver.driver}: ${driver.missing.join(', ')}`);
      }
      if (missingDrivers.length > 20) {
        console.log(`     ... and ${missingDrivers.length - 20} more`);
      }
    }

    if (oversizedDrivers.length > 0 && opts.verbose) {
      console.log('\n   OVERSIZED IMAGES:');
      for (const driver of oversizedDrivers.slice(0, 10)) {
        for (const img of driver.oversized) {
          console.log(`     ${driver.driver}/${img.file}: ${img.sizeKB}KB (max ${img.maxSizeKB}KB)`);
        }
      }
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log(`║  RESULT: ${passed ? 'PASSED' : 'FAILED'} - ${totalMissing} missing, ${totalOversized} oversized            ║`);
    console.log(`║  Duration: ${duration}ms                                           ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }

  return result;
}

// Run if called directly
if (require.main === module) {
  const opts = parseArgs();
  const result = runDriverImageChecker(opts);
  process.exit(result.passed ? 0 : 1);
}

module.exports = { runDriverImageChecker, checkDriverImages };
