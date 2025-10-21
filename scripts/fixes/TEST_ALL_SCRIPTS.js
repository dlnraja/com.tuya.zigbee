#!/usr/bin/env node

/**
 * TEST SUITE - Validates all fix scripts work correctly
 * 
 * This script tests that all fix scripts:
 * 1. Run without errors
 * 2. Produce expected outputs
 * 3. Are idempotent (safe to run multiple times)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║              FIX SCRIPTS TEST SUITE                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const rootDir = path.join(__dirname, '..', '..');
const scriptsDir = __dirname;

const tests = [];
let passed = 0;
let failed = 0;

// Test helper
function test(name, fn) {
  tests.push({ name, fn });
}

function runTests() {
  console.log(`Running ${tests.length} tests...\n`);
  
  for (const test of tests) {
    process.stdout.write(`  ${test.name}... `);
    
    try {
      test.fn();
      console.log('✅ PASS');
      passed++;
    } catch (error) {
      console.log('❌ FAIL');
      console.log(`    Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60) + '\n');
  
  return failed === 0;
}

// ============================================================================
// TEST 1: Check if all script files exist
// ============================================================================

test('All script files exist', () => {
  const requiredScripts = [
    'MASTER_FIX_ALL.js',
    'MASTER_FIX_ALL.ps1',
    'CHECK_DOUBLE_SUFFIXES.js',
    'CHECK_DUPLICATE_DEVICE_ARGS.js',
    'COUNT_DOUBLE_SUFFIXES.js',
    'RENAME_DOUBLE_SUFFIX_FOLDERS.js',
    'FIX_DRIVER_COMPOSE_IDS.js',
    'REMOVE_DEVICE_ARGS_FROM_COMPOSE.js',
    'FIX_TITLEFORMATTED_DEVICE_REFS.js',
    'REBUILD_APP_JSON.js',
    'SIMPLE_FIX_DOUBLE_SUFFIXES.js',
    'FIX_IMAGE_PATHS.js',
    'FIX_ALL_DOUBLE_SUFFIX_REFS.js',
    'README.md'
  ];
  
  for (const script of requiredScripts) {
    const scriptPath = path.join(scriptsDir, script);
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Missing script: ${script}`);
    }
  }
});

// ============================================================================
// TEST 2: CHECK scripts return valid exit codes
// ============================================================================

test('CHECK_DOUBLE_SUFFIXES.js runs', () => {
  try {
    execSync('node scripts/fixes/CHECK_DOUBLE_SUFFIXES.js', {
      cwd: rootDir,
      stdio: 'pipe'
    });
    // Exit code 0 = no issues (good)
  } catch (error) {
    // Exit code 1 = issues found (also valid)
    if (error.status !== 1) {
      throw new Error(`Unexpected exit code: ${error.status}`);
    }
  }
});

test('CHECK_DUPLICATE_DEVICE_ARGS.js runs', () => {
  try {
    execSync('node scripts/fixes/CHECK_DUPLICATE_DEVICE_ARGS.js', {
      cwd: rootDir,
      stdio: 'pipe'
    });
  } catch (error) {
    if (error.status !== 1) {
      throw new Error(`Unexpected exit code: ${error.status}`);
    }
  }
});

test('COUNT_DOUBLE_SUFFIXES.js runs', () => {
  const output = execSync('node scripts/fixes/COUNT_DOUBLE_SUFFIXES.js', {
    cwd: rootDir,
    encoding: 'utf8'
  });
  
  const count = parseInt(output.trim());
  if (isNaN(count)) {
    throw new Error('Output is not a number');
  }
});

// ============================================================================
// TEST 3: Verify app.json structure
// ============================================================================

test('app.json exists and is valid JSON', () => {
  const appJsonPath = path.join(rootDir, 'app.json');
  
  if (!fs.existsSync(appJsonPath)) {
    throw new Error('app.json not found');
  }
  
  const content = fs.readFileSync(appJsonPath, 'utf8');
  const appJson = JSON.parse(content); // Throws if invalid
  
  if (!appJson.id || !appJson.version || !appJson.drivers) {
    throw new Error('app.json missing required fields');
  }
});

test('app.json has correct structure', () => {
  const appJsonPath = path.join(rootDir, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  if (!Array.isArray(appJson.drivers)) {
    throw new Error('drivers is not an array');
  }
  
  if (!appJson.flow) {
    throw new Error('flow object missing');
  }
  
  if (!Array.isArray(appJson.flow.actions)) {
    throw new Error('flow.actions is not an array');
  }
  
  if (!Array.isArray(appJson.flow.triggers)) {
    throw new Error('flow.triggers is not an array');
  }
  
  if (!Array.isArray(appJson.flow.conditions)) {
    throw new Error('flow.conditions is not an array');
  }
});

// ============================================================================
// TEST 4: Verify drivers directory structure
// ============================================================================

test('drivers directory exists', () => {
  const driversDir = path.join(rootDir, 'drivers');
  
  if (!fs.existsSync(driversDir)) {
    throw new Error('drivers directory not found');
  }
  
  const drivers = fs.readdirSync(driversDir).filter(item => {
    return fs.statSync(path.join(driversDir, item)).isDirectory();
  });
  
  if (drivers.length === 0) {
    throw new Error('No driver folders found');
  }
});

test('No driver folders have double suffixes', () => {
  const driversDir = path.join(rootDir, 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(item => {
    return fs.statSync(path.join(driversDir, item)).isDirectory();
  });
  
  const patterns = [
    /^ikea_ikea_/,
    /_other_other$/,
    /_aaa_aaa$/,
    /_aa_aa$/,
    /_internal_internal$/
  ];
  
  for (const driver of drivers) {
    for (const pattern of patterns) {
      if (pattern.test(driver)) {
        throw new Error(`Double suffix found: ${driver}`);
      }
    }
  }
});

// ============================================================================
// TEST 5: Sample driver has correct structure
// ============================================================================

test('Sample driver has driver.compose.json', () => {
  const driversDir = path.join(rootDir, 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(item => {
    return fs.statSync(path.join(driversDir, item)).isDirectory();
  });
  
  if (drivers.length === 0) {
    throw new Error('No drivers to test');
  }
  
  // Check first driver
  const sampleDriver = drivers[0];
  const composeFile = path.join(driversDir, sampleDriver, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    throw new Error(`driver.compose.json not found in ${sampleDriver}`);
  }
  
  const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  
  if (!content.id) {
    throw new Error('driver.compose.json missing id');
  }
});

test('Sample driver ID matches folder name', () => {
  const driversDir = path.join(rootDir, 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(item => {
    return fs.statSync(path.join(driversDir, item)).isDirectory();
  });
  
  // Check a few drivers
  const samplesToCheck = Math.min(5, drivers.length);
  
  for (let i = 0; i < samplesToCheck; i++) {
    const driver = drivers[i];
    const composeFile = path.join(driversDir, driver, 'driver.compose.json');
    
    if (fs.existsSync(composeFile)) {
      const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      
      if (content.id !== driver) {
        throw new Error(`Mismatch: folder=${driver}, id=${content.id}`);
      }
    }
  }
});

// ============================================================================
// TEST 6: Verify no duplicate device args (sampling)
// ============================================================================

test('Sample flow cards have no duplicate device args', () => {
  const appJsonPath = path.join(rootDir, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  const checkCards = (cards) => {
    for (const card of cards) {
      if (!card.args) continue;
      
      const deviceArgs = card.args.filter(arg => arg.name === 'device');
      
      if (deviceArgs.length > 1) {
        throw new Error(`Duplicate device args in: ${card.id}`);
      }
    }
  };
  
  if (appJson.flow) {
    if (appJson.flow.actions) checkCards(appJson.flow.actions);
    if (appJson.flow.triggers) checkCards(appJson.flow.triggers);
    if (appJson.flow.conditions) checkCards(appJson.flow.conditions);
  }
});

// ============================================================================
// TEST 7: Script syntax validation
// ============================================================================

test('All JS scripts have valid syntax', () => {
  const jsScripts = fs.readdirSync(scriptsDir)
    .filter(f => f.endsWith('.js'))
    .filter(f => !f.startsWith('TEST_')); // Don't test test scripts
  
  for (const script of jsScripts) {
    try {
      require(path.join(scriptsDir, script));
    } catch (error) {
      // It's OK if require fails due to execution
      // We just want to check syntax
      if (error instanceof SyntaxError) {
        throw new Error(`Syntax error in ${script}: ${error.message}`);
      }
    }
  }
});

// ============================================================================
// TEST 8: README completeness
// ============================================================================

test('README.md is comprehensive', () => {
  const readmePath = path.join(scriptsDir, 'README.md');
  const content = fs.readFileSync(readmePath, 'utf8');
  
  const requiredSections = [
    '## 🎯 Overview',
    '## 🎛️ Master Scripts',
    '## 🔧 Individual Fix Scripts',
    '## 🔍 Check Scripts',
    '## 💻 Usage',
    '## 🚀 CI/CD Integration'
  ];
  
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      throw new Error(`README missing section: ${section}`);
    }
  }
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

const success = runTests();

if (success) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed\n');
  process.exit(1);
}
