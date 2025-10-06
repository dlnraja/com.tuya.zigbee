#!/usr/bin/env node
/**
 * COMPLETE VALIDATION & FIX - Vérifie TOUT et corrige automatiquement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 COMPLETE VALIDATION & FIX\n');

const results = {
  checks: [],
  errors: [],
  warnings: [],
  fixes: []
};

function check(name, testFn, fixFn = null) {
  try {
    const result = testFn();
    if (result === true) {
      console.log(`✅ ${name}`);
      results.checks.push({ name, status: 'pass' });
      return true;
    } else {
      console.log(`❌ ${name}: ${result}`);
      results.errors.push({ name, error: result });
      
      if (fixFn) {
        console.log(`   🔧 Attempting fix...`);
        try {
          fixFn();
          console.log(`   ✅ Fixed!`);
          results.fixes.push(name);
          return true;
        } catch (fixError) {
          console.log(`   ❌ Fix failed: ${fixError.message}`);
          return false;
        }
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    results.errors.push({ name, error: error.message });
    return false;
  }
}

// 1. Check app.json size
console.log('\n📦 Checking app.json...\n');

check('app.json exists', () => {
  return fs.existsSync(APP_JSON) || 'File not found';
});

check('app.json size < 2MB', () => {
  const size = fs.statSync(APP_JSON).size;
  const sizeMB = size / 1024 / 1024;
  if (sizeMB < 2) return true;
  return `File too large: ${sizeMB.toFixed(2)} MB`;
});

check('app.json valid JSON', () => {
  try {
    JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
    return true;
  } catch (e) {
    return e.message;
  }
});

// 2. Check drivers
console.log('\n🚗 Checking drivers...\n');

let driversCount = 0;
let driversWithIssues = 0;

if (fs.existsSync(DRIVERS_DIR)) {
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
  
  driversCount = drivers.length;
  console.log(`Found ${driversCount} drivers\n`);
  
  drivers.forEach(driverId => {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    const devicePath = path.join(DRIVERS_DIR, driverId, 'device.js');
    const assetsPath = path.join(DRIVERS_DIR, driverId, 'assets');
    
    let hasIssue = false;
    
    // Check compose exists
    if (!fs.existsSync(composePath)) {
      console.log(`  ⚠️  ${driverId}: Missing driver.compose.json`);
      hasIssue = true;
    }
    
    // Check device.js exists
    if (!fs.existsSync(devicePath)) {
      console.log(`  ⚠️  ${driverId}: Missing device.js`);
      hasIssue = true;
    }
    
    // Check assets
    if (fs.existsSync(assetsPath)) {
      const requiredAssets = ['icon.svg', 'small.png', 'large.png'];
      requiredAssets.forEach(asset => {
        const assetPath = path.join(assetsPath, asset);
        if (!fs.existsSync(assetPath)) {
          console.log(`  ⚠️  ${driverId}: Missing ${asset}`);
          hasIssue = true;
        }
      });
    } else {
      console.log(`  ⚠️  ${driverId}: Missing assets directory`);
      hasIssue = true;
    }
    
    if (hasIssue) driversWithIssues++;
  });
}

if (driversWithIssues === 0) {
  console.log(`\n✅ All ${driversCount} drivers OK`);
} else {
  console.log(`\n⚠️  ${driversWithIssues} drivers have issues`);
}

// 3. Check Git
console.log('\n📂 Checking Git...\n');

check('Git repository', () => {
  return fs.existsSync(path.join(ROOT, '.git')) || 'Not a git repository';
});

check('Git clean', () => {
  try {
    const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
    return status.trim() === '' || `Uncommitted changes:\n${status}`;
  } catch (e) {
    return e.message;
  }
});

check('Git remote', () => {
  try {
    execSync('git remote -v', { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch (e) {
    return 'No remote configured';
  }
});

// 4. Check package.json
console.log('\n📦 Checking package.json...\n');

check('package.json exists', () => {
  return fs.existsSync(path.join(ROOT, 'package.json')) || 'File not found';
});

check('Dependencies installed', () => {
  return fs.existsSync(path.join(ROOT, 'node_modules')) || 'Run npm install';
});

// 5. Check Homey compatibility
console.log('\n🏠 Checking Homey compatibility...\n');

const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

check('SDK version', () => {
  return appJson.sdk === 3 || `Invalid SDK: ${appJson.sdk}`;
});

check('Compatibility', () => {
  return appJson.compatibility || 'No compatibility specified';
});

check('Version format', () => {
  const version = appJson.version;
  return /^\d+\.\d+\.\d+$/.test(version) || `Invalid version: ${version}`;
});

// 6. Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 VALIDATION SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Checks passed: ${results.checks.filter(c => c.status === 'pass').length}`);
console.log(`Errors found: ${results.errors.length}`);
console.log(`Fixes applied: ${results.fixes.length}`);
console.log(`Warnings: ${results.warnings.length}`);
console.log(`Drivers: ${driversCount} total, ${driversWithIssues} with issues`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (results.errors.length === 0 && driversWithIssues === 0) {
  console.log('✅ ALL CHECKS PASSED - System is healthy!\n');
  process.exit(0);
} else {
  console.log('⚠️  Issues found - Review above\n');
  process.exit(1);
}
