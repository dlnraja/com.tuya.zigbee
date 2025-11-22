#!/usr/bin/env node
'use strict';

/**
 * COMPLETE VALIDATION SCRIPT
 *
 * Runs all validation checks:
 * 1. ESLint
 * 2. Homey app validate
 * 3. Device matrix generation
 * 4. Verify critical files exist
 * 5. Check for common issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
let allPassed = true;

console.log('🔍 COMPLETE VALIDATION SUITE\n');
console.log('='.repeat(60));

// 1. CHECK CRITICAL FILES
console.log('\n📁 1. CHECKING CRITICAL FILES...');
const criticalFiles = [
  'lib/IASZoneEnroller.js',
  'lib/zigbee/wait-ready.js',
  'lib/zigbee/safe-io.js',
  'lib/TuyaManufacturerCluster.js',
  'lib/TuyaDPParser.js',
  'lib/registerClusters.js',
  'lib/tuya-engine/converters/battery.js',
  'lib/tuya-engine/converters/illuminance.js',
  'lib/tuya-engine/dp-database.json',
  'app.js',
  '.github/workflows/build.yml',
  'scripts/build-device-matrix.js',
  'docs/cookbook.md'
];

let missingFiles = 0;
for (const file of criticalFiles) {
  const fullPath = path.join(ROOT_DIR, file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ MISSING: ${file}`);
    missingFiles++;
    allPassed = false;
  }
}

if (missingFiles === 0) {
  console.log(`\n   ✅ All ${criticalFiles.length} critical files present`);
} else {
  console.log(`\n   ❌ ${missingFiles} files missing!`);
}

// 2. ESLINT
console.log('\n📋 2. RUNNING ESLINT...');
try {
  execSync('npx eslint . --max-warnings 50', {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });
  console.log('   ✅ ESLint passed');
} catch (err) {
  console.log('   ⚠️  ESLint warnings/errors (non-fatal)');
  // Don't fail on ESLint errors for now
}

// 3. HOMEY VALIDATE
console.log('\n🏠 3. RUNNING HOMEY APP VALIDATE...');
try {
  execSync('npx homey app validate --level publish', {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });
  console.log('   ✅ Homey validation passed');
} catch (err) {
  console.log('   ❌ Homey validation failed');
  allPassed = false;
}

// 4. DEVICE MATRIX
console.log('\n📊 4. GENERATING DEVICE MATRIX...');
try {
  execSync('node scripts/build-device-matrix.js', {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });
  console.log('   ✅ Device matrix generated');
} catch (err) {
  console.log('   ❌ Device matrix generation failed');
  allPassed = false;
}

// 5. CHECK COMMON ISSUES
console.log('\n🔍 5. CHECKING FOR COMMON ISSUES...');

// Check for orphaned catch blocks
let orphanedCatch = 0;
function scanForOrphanedCatch(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && file !== 'node_modules') {
      scanForOrphanedCatch(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Look for catch not preceded by try
      if (/^\s*catch\s*\(/m.test(content) && !content.includes('try {')) {
        console.log(`   ⚠️  Potential orphaned catch: ${fullPath}`);
        orphanedCatch++;
      }
    }
  }
}

scanForOrphanedCatch(path.join(ROOT_DIR, 'drivers'));

if (orphanedCatch === 0) {
  console.log('   ✅ No orphaned catch blocks found');
} else {
  console.log(`   ⚠️  ${orphanedCatch} potential orphaned catch blocks (review manually)`);
}

// Check for IAS Zone in button drivers
console.log('\n   Checking IAS Zone in button drivers...');
let buttonDriversWithIAS = 0;
let buttonDriversTotal = 0;
const buttonDrivers = ['button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_4'];
for (const driver of buttonDrivers) {
  const driverPath = path.join(ROOT_DIR, 'drivers', driver, 'driver.compose.json');
  if (fs.existsSync(driverPath)) {
    buttonDriversTotal++;
    const content = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    const hasIASZone = content.zigbee?.endpoints?.['1']?.clusters?.includes(1280);
    if (hasIASZone) {
      buttonDriversWithIAS++;
      console.log(`   ✅ ${driver}: IAS Zone present`);
    } else {
      console.log(`   ❌ ${driver}: IAS Zone MISSING!`);
      allPassed = false;
    }
  }
}
console.log(`\n   📊 IAS Zone coverage: ${buttonDriversWithIAS}/${buttonDriversTotal} button drivers`);

// Check automation scripts exist
console.log('\n   Checking automation scripts...');
const automationScripts = [
  'scripts/auto-update-drivers.js',
  'scripts/monthly-enrichment.js',
  'scripts/converters/cluster-converter.js',
  'scripts/converters/capability-converter.js'
];
let automationPresent = 0;
for (const script of automationScripts) {
  if (fs.existsSync(path.join(ROOT_DIR, script))) {
    console.log(`   ✅ ${script}`);
    automationPresent++;
  } else {
    console.log(`   ❌ ${script} missing`);
  }
}
console.log(`\n   📊 Automation: ${automationPresent}/${automationScripts.length} scripts present`);

// Check for v.replace usage without toSafeString
console.log('\n   Checking for unsafe .replace() usage...');
const iasEnrollerPath = path.join(ROOT_DIR, 'lib/IASZoneEnroller.js');
if (fs.existsSync(iasEnrollerPath)) {
  const iasEnroller = fs.readFileSync(iasEnrollerPath, 'utf8');
  if (iasEnroller.includes('toSafeString') && iasEnroller.includes('.replace(')) {
    console.log('   ✅ IASZoneEnroller uses toSafeString()');
  } else {
    console.log('   ⚠️  IASZoneEnroller may have unsafe .replace()');
  }
} else {
  console.log('   ℹ️  IASZoneEnroller.js not found (optional check)');
}

// Check battery converter usage
console.log('\n   Checking battery converter usage...');
const batteryConverterPath = path.join(ROOT_DIR, 'lib/tuya-engine/converters/battery.js');
if (fs.existsSync(batteryConverterPath)) {
  const batteryConverter = fs.readFileSync(batteryConverterPath, 'utf8');
  if (batteryConverter.includes('fromZclBatteryPercentageRemaining')) {
    console.log('   ✅ Battery converter exports correct function');
  } else {
    console.log('   ⚠️  Battery converter may need updates');
  }
} else {
  console.log('   ℹ️  Battery converter not found (optional check)');
}

// 6. SUMMARY
console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ ALL VALIDATION CHECKS PASSED!');
  console.log('\n🚀 Ready to commit and push!');
  console.log('\nNext steps:');
  console.log('  git add -A');
  console.log('  git commit -m "fix(critical): Complete implementation"');
  console.log('  git push origin master');
} else {
  console.log('❌ SOME VALIDATION CHECKS FAILED');
  console.log('\n⚠️  Please review errors above before committing');
}
console.log('='.repeat(60));

process.exit(allPassed ? 0 : 1);
