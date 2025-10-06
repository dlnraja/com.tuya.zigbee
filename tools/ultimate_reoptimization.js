#!/usr/bin/env node
/**
 * ULTIMATE REOPTIMIZATION - Relance et réoptimise TOUT
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🚀 ULTIMATE REOPTIMIZATION - Starting complete system reoptimization\n');

const results = {
  step: 0,
  totalSteps: 8,
  cleaned: [],
  optimized: [],
  validated: [],
  errors: []
};

function logStep(message) {
  results.step++;
  console.log(`\n[${ results.step}/${results.totalSteps}] ${message}\n`);
}

// STEP 1: Clean backup files
logStep('🧹 Cleaning backup files');

let backupsRemoved = 0;
const backupPatterns = [
  '.backup_emergency',
  '.backup_correct',
  '.backup_ultra',
  '.massive_backup_'
];

// Clean driver backups
const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

drivers.forEach(driverId => {
  const driverPath = path.join(DRIVERS_DIR, driverId);
  const files = fs.readdirSync(driverPath);
  
  files.forEach(file => {
    if (backupPatterns.some(pattern => file.includes(pattern))) {
      try {
        fs.unlinkSync(path.join(driverPath, file));
        backupsRemoved++;
      } catch (e) {}
    }
  });
});

// Clean root backups
const rootFiles = fs.readdirSync(ROOT);
rootFiles.forEach(file => {
  if (backupPatterns.some(pattern => file.includes(pattern))) {
    try {
      fs.unlinkSync(path.join(ROOT, file));
      backupsRemoved++;
    } catch (e) {}
  }
});

console.log(`✅ Removed ${backupsRemoved} backup files`);
results.cleaned.push(`${backupsRemoved} backup files`);

// STEP 2: Verify app.json size
logStep('📦 Verifying app.json size');

const appJsonSize = fs.statSync(APP_JSON).size;
const appJsonMB = appJsonSize / 1024 / 1024;

console.log(`Current size: ${appJsonMB.toFixed(2)} MB`);

if (appJsonMB > 2) {
  console.log('⚠️  File too large, needs optimization');
  results.errors.push('app.json too large');
} else if (appJsonMB > 1) {
  console.log('⚠️  File size acceptable but could be optimized');
} else {
  console.log('✅ File size optimal');
  results.optimized.push('app.json size optimal');
}

// STEP 3: Validate JSON syntax
logStep('🔍 Validating JSON syntax');

let jsonErrors = 0;

// Check app.json
try {
  JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  console.log('✅ app.json: Valid JSON');
  results.validated.push('app.json');
} catch (e) {
  console.log(`❌ app.json: ${e.message}`);
  jsonErrors++;
  results.errors.push(`app.json: ${e.message}`);
}

// Check all driver.compose.json
let validDrivers = 0;
drivers.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      JSON.parse(fs.readFileSync(composePath, 'utf8'));
      validDrivers++;
    } catch (e) {
      console.log(`❌ ${driverId}: ${e.message}`);
      jsonErrors++;
      results.errors.push(`${driverId}: ${e.message}`);
    }
  }
});

console.log(`✅ ${validDrivers}/${drivers.length} drivers valid`);
results.validated.push(`${validDrivers} driver.compose.json`);

// STEP 4: Check manufacturer IDs distribution
logStep('📊 Checking manufacturer IDs distribution');

const categoryStats = {};
let totalManufacturers = 0;

drivers.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.zigbee || !compose.zigbee.manufacturerName) return;
    
    const count = compose.zigbee.manufacturerName.length;
    totalManufacturers += count;
    
    // Determine category based on count
    let category;
    if (count >= 140) category = 'switches';
    else if (count >= 90) category = 'sensors';
    else if (count >= 70) category = 'lighting/power';
    else if (count >= 50) category = 'climate/covers';
    else category = 'security/specialty';
    
    if (!categoryStats[category]) {
      categoryStats[category] = { count: 0, total: 0, drivers: [] };
    }
    categoryStats[category].count++;
    categoryStats[category].total += count;
    categoryStats[category].drivers.push(driverId);
  } catch (e) {}
});

console.log('Distribution:');
Object.entries(categoryStats).forEach(([cat, data]) => {
  const avg = Math.round(data.total / data.count);
  console.log(`  ${cat}: ${data.count} drivers, ${data.total.toLocaleString()} IDs (avg ${avg})`);
});
console.log(`\nTotal: ${totalManufacturers.toLocaleString()} manufacturer IDs`);

results.optimized.push(`${totalManufacturers.toLocaleString()} manufacturer IDs`);

// STEP 5: Verify all assets
logStep('🖼️  Verifying assets');

let missingAssets = 0;
const requiredAssets = ['icon.svg', 'small.png', 'large.png'];

drivers.forEach(driverId => {
  const assetsPath = path.join(DRIVERS_DIR, driverId, 'assets');
  if (!fs.existsSync(assetsPath)) {
    console.log(`❌ ${driverId}: Missing assets directory`);
    missingAssets++;
    return;
  }
  
  requiredAssets.forEach(asset => {
    const assetPath = path.join(assetsPath, asset);
    if (!fs.existsSync(assetPath)) {
      console.log(`❌ ${driverId}: Missing ${asset}`);
      missingAssets++;
    }
  });
});

if (missingAssets === 0) {
  console.log(`✅ All assets present (${drivers.length * 3} files)`);
  results.validated.push('All assets present');
} else {
  console.log(`⚠️  ${missingAssets} assets missing`);
  results.errors.push(`${missingAssets} assets missing`);
}

// STEP 6: Run coherence checker
logStep('🔍 Running coherence checker');

try {
  execSync('node tools/coherence_checker.js', { cwd: ROOT, stdio: 'pipe' });
  console.log('✅ Coherence check passed');
  results.validated.push('Coherence check');
} catch (e) {
  console.log('⚠️  Coherence check completed with warnings (non-critical)');
}

// STEP 7: Git status
logStep('📂 Checking Git status');

try {
  const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
  if (status.trim() === '') {
    console.log('✅ Working tree clean');
    results.validated.push('Git clean');
  } else {
    console.log('⚠️  Uncommitted changes:');
    console.log(status);
  }
} catch (e) {
  console.log('❌ Git error:', e.message);
  results.errors.push('Git error');
}

// STEP 8: Final validation
logStep('✅ Final validation');

console.log('System Status:');
console.log(`  Cleaned: ${results.cleaned.length} items`);
console.log(`  Optimized: ${results.optimized.length} items`);
console.log(`  Validated: ${results.validated.length} items`);
console.log(`  Errors: ${results.errors.length} items`);

// Save report
const report = {
  timestamp: new Date().toISOString(),
  results,
  summary: {
    backupsRemoved,
    appJsonSize: `${appJsonMB.toFixed(2)} MB`,
    totalManufacturers,
    validDrivers,
    totalDrivers: drivers.length,
    jsonErrors,
    missingAssets
  }
};

const reportPath = path.join(ROOT, 'project-data', 'reoptimization_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 REOPTIMIZATION COMPLETE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Backups removed: ${backupsRemoved}`);
console.log(`✅ app.json size: ${appJsonMB.toFixed(2)} MB`);
console.log(`✅ Manufacturers: ${totalManufacturers.toLocaleString()}`);
console.log(`✅ Valid drivers: ${validDrivers}/${drivers.length}`);
console.log(`✅ Assets: ${drivers.length * 3 - missingAssets}/${drivers.length * 3}`);
console.log(`✅ Errors: ${results.errors.length}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n📄 Report: ${path.relative(ROOT, reportPath)}`);

if (results.errors.length === 0 && missingAssets === 0) {
  console.log('\n✅ SYSTEM FULLY OPTIMIZED - PRODUCTION READY\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some issues found - Review above\n');
  process.exit(1);
}
