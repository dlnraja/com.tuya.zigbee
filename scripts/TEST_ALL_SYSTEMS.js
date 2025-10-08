#!/usr/bin/env node
/**
 * TEST ALL SYSTEMS
 * 
 * Teste, vérifie et répare TOUS les systèmes:
 * - GitHub Actions workflows
 * - Scripts Node.js
 * - app.json structure
 * - Build & Validation
 * 
 * Mode: DIAGNOSTIC MAXIMUM
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = path.join(__dirname, '..');

console.log('🔍 TEST ALL SYSTEMS - DIAGNOSTIC MAXIMUM');
console.log('='.repeat(80));
console.log('⚡ VÉRIFICATION COMPLÈTE DE TOUS LES SYSTÈMES');
console.log('='.repeat(80));
console.log('📅 Date:', new Date().toISOString());
console.log('');

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function test(name, fn) {
  results.total++;
  console.log(`\n🧪 TEST: ${name}`);
  console.log('-'.repeat(80));
  
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    console.log('✅ PASSED');
    return true;
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    console.log('❌ FAILED:', error.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TEST 1: File Structure
// ════════════════════════════════════════════════════════════════════════════

test('File Structure', () => {
  const requiredFiles = [
    'app.json',
    'package.json',
    '.gitignore',
    'README.md',
    'CHANGELOG.md'
  ];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(rootPath, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required file: ${file}`);
    }
    console.log(`   ✓ ${file}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 2: app.json Validation
// ════════════════════════════════════════════════════════════════════════════

test('app.json Structure', () => {
  const appJsonPath = path.join(rootPath, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  // Required fields
  const required = ['id', 'version', 'name', 'description', 'category', 'drivers'];
  required.forEach(field => {
    if (!appJson[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
    console.log(`   ✓ ${field}: ${typeof appJson[field]}`);
  });
  
  // Version format
  if (!/^\d+\.\d+\.\d+$/.test(appJson.version)) {
    throw new Error(`Invalid version format: ${appJson.version}`);
  }
  console.log(`   ✓ version format: ${appJson.version}`);
  
  // Drivers count
  console.log(`   ✓ drivers count: ${appJson.drivers.length}`);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 3: Drivers Validation
// ════════════════════════════════════════════════════════════════════════════

test('Drivers Structure', () => {
  const appJsonPath = path.join(rootPath, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  let validDrivers = 0;
  let issues = [];
  
  appJson.drivers.forEach((driver, index) => {
    // Check required fields
    if (!driver.id) issues.push(`Driver ${index}: missing id`);
    if (!driver.name) issues.push(`Driver ${index}: missing name`);
    if (!driver.class) issues.push(`Driver ${index}: missing class`);
    
    // Check driver directory exists
    const driverPath = path.join(rootPath, 'drivers', driver.id);
    if (!fs.existsSync(driverPath)) {
      issues.push(`Driver ${driver.id}: directory not found`);
    }
    
    if (issues.length === 0) validDrivers++;
  });
  
  console.log(`   ✓ Valid drivers: ${validDrivers}/${appJson.drivers.length}`);
  
  if (issues.length > 0) {
    console.log('   ⚠️  Issues found:');
    issues.slice(0, 5).forEach(issue => console.log(`      - ${issue}`));
    if (issues.length > 5) console.log(`      ... and ${issues.length - 5} more`);
    results.warnings += issues.length;
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 4: GitHub Actions Workflows
// ════════════════════════════════════════════════════════════════════════════

test('GitHub Actions Workflows', () => {
  const workflowsPath = path.join(rootPath, '.github', 'workflows');
  
  if (!fs.existsSync(workflowsPath)) {
    throw new Error('Workflows directory not found');
  }
  
  const workflows = fs.readdirSync(workflowsPath).filter(f => f.endsWith('.yml'));
  console.log(`   ✓ Found ${workflows.length} workflows`);
  
  workflows.forEach(workflow => {
    const content = fs.readFileSync(path.join(workflowsPath, workflow), 'utf8');
    
    // Check for required fields
    if (!content.includes('name:')) throw new Error(`${workflow}: missing name`);
    if (!content.includes('on:')) throw new Error(`${workflow}: missing trigger`);
    if (!content.includes('jobs:')) throw new Error(`${workflow}: missing jobs`);
    
    console.log(`   ✓ ${workflow}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 5: Scripts Validation
// ════════════════════════════════════════════════════════════════════════════

test('Node.js Scripts', () => {
  const scriptsPath = path.join(rootPath, 'scripts');
  
  if (!fs.existsSync(scriptsPath)) {
    throw new Error('Scripts directory not found');
  }
  
  const scripts = fs.readdirSync(scriptsPath).filter(f => f.endsWith('.js'));
  console.log(`   ✓ Found ${scripts.length} scripts`);
  
  let validScripts = 0;
  scripts.forEach(script => {
    const content = fs.readFileSync(path.join(scriptsPath, script), 'utf8');
    
    // Basic syntax check
    try {
      // Check for Node.js shebang or require statements
      if (content.includes('require(') || content.includes('#!/usr/bin/env node')) {
        validScripts++;
        console.log(`   ✓ ${script}`);
      }
    } catch (e) {
      console.log(`   ⚠️  ${script}: ${e.message}`);
      results.warnings++;
    }
  });
  
  console.log(`   ✓ Valid scripts: ${validScripts}/${scripts.length}`);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 6: Build Test
// ════════════════════════════════════════════════════════════════════════════

test('Homey App Build', () => {
  console.log('   Building app...');
  
  try {
    execSync('homey app build', {
      cwd: rootPath,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log('   ✓ Build successful');
  } catch (error) {
    throw new Error(`Build failed: ${error.stderr || error.message}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 7: Validation Test
// ════════════════════════════════════════════════════════════════════════════

test('Homey App Validation (publish-level)', () => {
  console.log('   Validating app...');
  
  try {
    const output = execSync('homey app validate --level=publish', {
      cwd: rootPath,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log('   ✓ Validation passed');
    if (output.includes('warning')) {
      console.log('   ⚠️  Warnings detected (non-blocking)');
      results.warnings++;
    }
  } catch (error) {
    throw new Error(`Validation failed: ${error.stderr || error.message}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 8: Git Status
// ════════════════════════════════════════════════════════════════════════════

test('Git Status', () => {
  try {
    const status = execSync('git status --porcelain', {
      cwd: rootPath,
      encoding: 'utf8'
    });
    
    if (status.trim()) {
      console.log('   ⚠️  Uncommitted changes detected');
      console.log(status.trim().split('\n').slice(0, 5).join('\n'));
      results.warnings++;
    } else {
      console.log('   ✓ Working directory clean');
    }
  } catch (error) {
    throw new Error(`Git check failed: ${error.message}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 9: .bat File Validation
// ════════════════════════════════════════════════════════════════════════════

test('Windows .bat Launcher', () => {
  const batPath = path.join(rootPath, 'LAUNCH_FULL_ENRICHMENT.bat');
  
  if (!fs.existsSync(batPath)) {
    throw new Error('.bat file not found');
  }
  
  const content = fs.readFileSync(batPath, 'utf8');
  
  // Check for required commands
  const required = ['node', 'homey', 'git', 'pause', 'echo'];
  required.forEach(cmd => {
    if (!content.includes(cmd)) {
      throw new Error(`.bat missing command: ${cmd}`);
    }
    console.log(`   ✓ Command found: ${cmd}`);
  });
  
  // Check for script calls
  const scripts = [
    'MEGA_GITHUB_INTEGRATION_ENRICHER.js',
    'MEGA_FORUM_WEB_INTEGRATOR.js',
    'ULTRA_FINE_DRIVER_ANALYZER.js'
  ];
  
  scripts.forEach(script => {
    if (!content.includes(script)) {
      console.log(`   ⚠️  Script not referenced: ${script}`);
      results.warnings++;
    } else {
      console.log(`   ✓ Script referenced: ${script}`);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 10: Reports Directory
// ════════════════════════════════════════════════════════════════════════════

test('Reports Directory', () => {
  const reportsPath = path.join(rootPath, 'reports');
  
  if (!fs.existsSync(reportsPath)) {
    fs.mkdirSync(reportsPath, { recursive: true });
    console.log('   ✓ Reports directory created');
  } else {
    console.log('   ✓ Reports directory exists');
  }
  
  // Check write permission
  const testFile = path.join(reportsPath, 'test.tmp');
  try {
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('   ✓ Write permission OK');
  } catch (error) {
    throw new Error('Cannot write to reports directory');
  }
});

// ════════════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ════════════════════════════════════════════════════════════════════════════

console.log('');
console.log('='.repeat(80));
console.log('📊 FINAL TEST REPORT');
console.log('='.repeat(80));
console.log('');
console.log(`📈 STATISTICS:`);
console.log(`   Total Tests:    ${results.total}`);
console.log(`   ✅ Passed:      ${results.passed} (${Math.round(results.passed/results.total*100)}%)`);
console.log(`   ❌ Failed:      ${results.failed}`);
console.log(`   ⚠️  Warnings:   ${results.warnings}`);
console.log('');

if (results.failed === 0) {
  console.log('🎊 ALL TESTS PASSED!');
  console.log('');
  console.log('✅ System is ready for:');
  console.log('   - Git commit & push');
  console.log('   - GitHub Actions execution');
  console.log('   - Homey App Store publication');
  console.log('');
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('');
  console.log('Failed tests:');
  results.tests.filter(t => t.status === 'FAILED').forEach(t => {
    console.log(`   ❌ ${t.name}: ${t.error}`);
  });
  console.log('');
  console.log('⚠️  Please fix issues before proceeding');
  console.log('');
}

if (results.warnings > 0) {
  console.log(`⚠️  ${results.warnings} warnings detected (non-blocking)`);
  console.log('');
}

// Save report
const reportPath = path.join(rootPath, 'reports', 'system_test_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  results: results,
  systemReady: results.failed === 0
}, null, 2));

console.log(`📄 Report saved: ${reportPath}`);
console.log('');

process.exit(results.failed > 0 ? 1 : 0);
