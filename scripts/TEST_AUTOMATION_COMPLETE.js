#!/usr/bin/env node
/**
 * TEST AUTOMATION COMPLETE
 * 
 * Teste TOUS les systèmes d'automation:
 * - .bat launcher (simulation)
 * - GitHub Actions workflows (validation YAML)
 * - Tous les scripts référencés
 * - Chemins et dépendances
 * 
 * Cycle: Test → Analyse → Correction → Retest
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

const rootPath = path.join(__dirname, '..');

console.log('🔬 TEST AUTOMATION COMPLETE');
console.log('='.repeat(80));
console.log('⚡ TEST COMPLET .bat + GITHUB ACTIONS');
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
    const result = fn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED', details: result });
    console.log('✅ PASSED');
    return result;
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    console.log('❌ FAILED:', error.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TEST 1: .bat File Existence & Structure
// ════════════════════════════════════════════════════════════════════════════

test('.bat File - Existence & Readable', () => {
  const batPath = path.join(rootPath, 'LAUNCH_FULL_ENRICHMENT.bat');
  
  if (!fs.existsSync(batPath)) {
    throw new Error('.bat file not found');
  }
  
  const content = fs.readFileSync(batPath, 'utf8');
  
  if (content.length < 1000) {
    throw new Error('.bat file seems too short');
  }
  
  console.log(`   ✓ File exists: ${batPath}`);
  console.log(`   ✓ File size: ${content.length} bytes`);
  
  return { path: batPath, size: content.length };
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 2: .bat Script References
// ════════════════════════════════════════════════════════════════════════════

test('.bat File - Script References', () => {
  const batPath = path.join(rootPath, 'LAUNCH_FULL_ENRICHMENT.bat');
  const content = fs.readFileSync(batPath, 'utf8');
  
  const expectedScripts = [
    'scripts\\MEGA_GITHUB_INTEGRATION_ENRICHER.js',
    'scripts\\MEGA_FORUM_WEB_INTEGRATOR.js',
    'scripts\\ULTIMATE_PATTERN_ANALYZER_ORCHESTRATOR.js',
    'scripts\\ULTRA_FINE_DRIVER_ANALYZER.js',
    'scripts\\ULTIMATE_WEB_VALIDATOR.js'
  ];
  
  const missing = [];
  const found = [];
  
  expectedScripts.forEach(script => {
    if (content.includes(script)) {
      const scriptPath = path.join(rootPath, script.replace(/\\/g, '/'));
      if (fs.existsSync(scriptPath)) {
        found.push(script);
        console.log(`   ✓ Referenced & exists: ${script}`);
      } else {
        missing.push(script);
        console.log(`   ❌ Referenced but MISSING: ${script}`);
      }
    } else {
      missing.push(script);
      console.log(`   ❌ NOT referenced: ${script}`);
    }
  });
  
  if (missing.length > 0) {
    throw new Error(`${missing.length} scripts missing or not referenced`);
  }
  
  return { found: found.length, missing: missing.length };
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 3: GitHub Actions Workflows
// ════════════════════════════════════════════════════════════════════════════

test('GitHub Actions - Workflows Syntax', () => {
  const workflowsPath = path.join(rootPath, '.github', 'workflows');
  
  if (!fs.existsSync(workflowsPath)) {
    throw new Error('Workflows directory not found');
  }
  
  const workflows = fs.readdirSync(workflowsPath)
    .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  
  console.log(`   Found ${workflows.length} workflows`);
  
  const results = { valid: [], invalid: [] };
  
  workflows.forEach(workflow => {
    const workflowPath = path.join(workflowsPath, workflow);
    const content = fs.readFileSync(workflowPath, 'utf8');
    
    try {
      const parsed = yaml.load(content);
      
      // Check required fields
      if (!parsed.name) throw new Error('Missing name');
      if (!parsed.on) throw new Error('Missing on trigger');
      if (!parsed.jobs) throw new Error('Missing jobs');
      
      results.valid.push(workflow);
      console.log(`   ✓ ${workflow} - Valid YAML`);
    } catch (error) {
      results.invalid.push({ workflow, error: error.message });
      console.log(`   ❌ ${workflow} - Invalid: ${error.message}`);
    }
  });
  
  if (results.invalid.length > 0) {
    throw new Error(`${results.invalid.length} invalid workflows`);
  }
  
  return results;
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 4: Primary Workflow (publish-main.yml)
// ════════════════════════════════════════════════════════════════════════════

test('GitHub Actions - publish-main.yml', () => {
  const workflowPath = path.join(rootPath, '.github', 'workflows', 'publish-main.yml');
  
  if (!fs.existsSync(workflowPath)) {
    throw new Error('publish-main.yml not found');
  }
  
  const content = fs.readFileSync(workflowPath, 'utf8');
  const parsed = yaml.load(content);
  
  // Check critical elements
  const checks = {
    name: !!parsed.name,
    trigger: !!parsed.on,
    jobs: !!parsed.jobs,
    checkout: content.includes('actions/checkout'),
    nodejs: content.includes('actions/setup-node'),
    homeyLogin: content.includes('homey login'),
    build: content.includes('homey app build'),
    validate: content.includes('homey app validate'),
    publish: content.includes('homey app publish')
  };
  
  Object.entries(checks).forEach(([key, value]) => {
    if (value) {
      console.log(`   ✓ Has ${key}`);
    } else {
      console.log(`   ❌ Missing ${key}`);
    }
  });
  
  const passed = Object.values(checks).every(v => v === true);
  
  if (!passed) {
    throw new Error('publish-main.yml missing critical elements');
  }
  
  return checks;
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 5: Monthly Automation Workflow
// ════════════════════════════════════════════════════════════════════════════

test('GitHub Actions - monthly-auto-enrichment.yml', () => {
  const workflowPath = path.join(rootPath, '.github', 'workflows', 'monthly-auto-enrichment.yml');
  
  if (!fs.existsSync(workflowPath)) {
    throw new Error('monthly-auto-enrichment.yml not found');
  }
  
  const content = fs.readFileSync(workflowPath, 'utf8');
  const parsed = yaml.load(content);
  
  // Check monthly schedule
  if (!parsed.on.schedule) {
    throw new Error('No schedule defined');
  }
  
  const cron = parsed.on.schedule[0].cron;
  console.log(`   ✓ Cron schedule: ${cron}`);
  
  // Check script reference
  const orchestratorScript = 'scripts/MONTHLY_AUTO_ENRICHMENT_ORCHESTRATOR.js';
  if (!content.includes(orchestratorScript)) {
    throw new Error(`Script not referenced: ${orchestratorScript}`);
  }
  
  const scriptPath = path.join(rootPath, orchestratorScript);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  
  console.log(`   ✓ Script referenced: ${orchestratorScript}`);
  console.log(`   ✓ Script exists`);
  
  return { cron, scriptPath };
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 6: All Referenced Scripts Exist
// ════════════════════════════════════════════════════════════════════════════

test('Scripts - All References Valid', () => {
  const allScripts = [
    'scripts/MEGA_GITHUB_INTEGRATION_ENRICHER.js',
    'scripts/MEGA_FORUM_WEB_INTEGRATOR.js',
    'scripts/ULTIMATE_PATTERN_ANALYZER_ORCHESTRATOR.js',
    'scripts/ULTIMATE_ITERATIVE_ORCHESTRATOR.js',
    'scripts/ULTIMATE_DEEP_ENRICHMENT_PUBLISH.js',
    'scripts/ULTRA_FINE_DRIVER_ANALYZER.js',
    'scripts/ULTRA_DEEP_STRUCTURE_VALIDATOR.js',
    'scripts/ULTIMATE_WEB_VALIDATOR.js',
    'scripts/DEEP_DRIVER_AUDIT_FIXER.js',
    'scripts/CLASS_CAPABILITY_FIXER.js',
    'scripts/COMMUNITY_FEEDBACK_INTEGRATOR.js',
    'scripts/GITHUB_ISSUES_DEVICE_INTEGRATOR.js',
    'scripts/MONTHLY_AUTO_ENRICHMENT_ORCHESTRATOR.js',
    'scripts/TEST_ALL_SYSTEMS.js',
    'scripts/DEEP_PROJECT_CLEANUP.js',
    'scripts/ORGANIZE_PROJECT_STRUCTURE.js',
    'scripts/TEST_AUTOMATION_COMPLETE.js'
  ];
  
  const results = { found: [], missing: [] };
  
  allScripts.forEach(script => {
    const scriptPath = path.join(rootPath, script);
    if (fs.existsSync(scriptPath)) {
      results.found.push(script);
      console.log(`   ✓ ${script}`);
    } else {
      results.missing.push(script);
      console.log(`   ❌ MISSING: ${script}`);
    }
  });
  
  if (results.missing.length > 0) {
    throw new Error(`${results.missing.length} scripts missing`);
  }
  
  return results;
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 7: Homey CLI Available
// ════════════════════════════════════════════════════════════════════════════

test('Environment - Homey CLI', () => {
  try {
    const version = execSync('homey --version', { encoding: 'utf8', stdio: 'pipe' });
    console.log(`   ✓ Homey CLI version: ${version.trim()}`);
    return { version: version.trim() };
  } catch (error) {
    throw new Error('Homey CLI not installed or not in PATH');
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 8: Build Test (Quick)
// ════════════════════════════════════════════════════════════════════════════

test('Homey App - Build Test', () => {
  console.log('   Building app...');
  
  try {
    execSync('homey app build', {
      cwd: rootPath,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log('   ✓ Build successful');
    return { status: 'success' };
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 9: Validation Test
// ════════════════════════════════════════════════════════════════════════════

test('Homey App - Validation Test', () => {
  console.log('   Validating app...');
  
  try {
    execSync('homey app validate --level=publish', {
      cwd: rootPath,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log('   ✓ Validation passed');
    return { status: 'success' };
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST 10: Script Syntax Check (Sample)
// ════════════════════════════════════════════════════════════════════════════

test('Scripts - Syntax Check', () => {
  const samplescript = path.join(rootPath, 'scripts', 'TEST_ALL_SYSTEMS.js');
  
  try {
    execSync(`node --check "${samplescript}"`, { stdio: 'pipe' });
    console.log(`   ✓ ${path.basename(samplescript)} - Syntax OK`);
    return { status: 'valid' };
  } catch (error) {
    throw new Error(`Script has syntax errors: ${error.message}`);
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
  console.log('✅ Systems Ready:');
  console.log('   - .bat launcher functional');
  console.log('   - GitHub Actions workflows valid');
  console.log('   - All scripts present');
  console.log('   - Build & validation successful');
  console.log('   - Production ready');
  console.log('');
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('');
  console.log('Failed tests:');
  results.tests.filter(t => t.status === 'FAILED').forEach(t => {
    console.log(`   ❌ ${t.name}: ${t.error}`);
  });
  console.log('');
  console.log('⚠️  Fix issues and rerun tests');
  console.log('');
}

// Save report
const reportPath = path.join(rootPath, 'reports', 'automation_test_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  results: results,
  systemReady: results.failed === 0
}, null, 2));

console.log(`📄 Report saved: ${reportPath}`);
console.log('');

process.exit(results.failed > 0 ? 1 : 0);
