#!/usr/bin/env node

/**
 * TEST SYSTÈME COMPLET
 * 
 * Teste tous les composants et identifie les problèmes
 */

import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function test(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      results.passed++;
      results.tests.push({ name, status: 'PASS', message: 'OK' });
      console.log(`✓ ${name}`);
    } else if (result && result.warning) {
      results.warnings++;
      results.tests.push({ name, status: 'WARN', message: result.message });
      console.log(`⚠ ${name}: ${result.message}`);
    } else {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', message: result ? result.message : 'Failed' });
      console.log(`✗ ${name}: ${result ? result.message : 'Failed'}`);
    }
  } catch (err) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', message: err.message });
    console.log(`✗ ${name}: ${err.message}`);
  }
}

console.log('\n🧪 ============================================');
console.log('   TEST SYSTÈME COMPLET');
console.log('============================================\n');

// ============================================
// TESTS STRUCTURE PROJET
// ============================================
console.log('📁 Tests Structure Projet:\n');

test('Project root exists', () => {
  return fsSync.existsSync(PROJECT_ROOT);
});

test('package.json exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'package.json'));
});

test('app.json exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'app.json'));
});

test('drivers directory exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'drivers'));
});

test('scripts/node-tools exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'scripts', 'node-tools'));
});

test('run-everything directory exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'run-everything'));
});

// ============================================
// TESTS SCRIPTS ENRICHISSEMENT
// ============================================
console.log('\n📜 Tests Scripts Enrichissement:\n');

test('run-enrichment.js exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'scripts', 'node-tools', 'run-enrichment.js'));
});

test('enrichment-advanced.js exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'scripts', 'node-tools', 'enrichment-advanced.js'));
});

test('micro-modules directory exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'scripts', 'node-tools', 'micro-modules'));
});

test('api-bypass.js exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'scripts', 'node-tools', 'micro-modules', 'api-bypass.js'));
});

test('smart-matcher.js exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'scripts', 'node-tools', 'micro-modules', 'smart-matcher.js'));
});

test('cache-manager.js exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'scripts', 'node-tools', 'micro-modules', 'cache-manager.js'));
});

// ============================================
// TESTS DATABASE
// ============================================
console.log('\n💾 Tests Database:\n');

const dbPath = path.join(PROJECT_ROOT, 'project-data', 'MANUFACTURER_DATABASE.json');

test('Database file exists', () => {
  return fsSync.existsSync(dbPath);
});

test('Database is valid JSON', () => {
  try {
    const db = JSON.parse(fsSync.readFileSync(dbPath, 'utf8'));
    return db && db.manufacturers ? true : { message: 'Invalid structure' };
  } catch (err) {
    return { message: err.message };
  }
});

test('Database has entries', () => {
  try {
    const db = JSON.parse(fsSync.readFileSync(dbPath, 'utf8'));
    const count = Object.keys(db.manufacturers || {}).length;
    if (count === 0) {
      return { message: 'No entries' };
    }
    console.log(`  → ${count} manufacturer IDs`);
    return true;
  } catch (err) {
    return { message: err.message };
  }
});

test('Database has metadata', () => {
  try {
    const db = JSON.parse(fsSync.readFileSync(dbPath, 'utf8'));
    return db.metadata ? true : { message: 'No metadata' };
  } catch (err) {
    return { message: err.message };
  }
});

// ============================================
// TESTS WORKFLOWS
// ============================================
console.log('\n⚙️  Tests Workflows:\n');

test('GitHub Actions workflow exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, '.github', 'workflows', 'complete-automation.yml'));
});

test('Windows batch script exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'run-everything', 'RUN_COMPLETE_AUTOMATION.bat'));
});

test('Workflow README exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'run-everything', 'README.md'));
});

// ============================================
// TESTS DRIVERS
// ============================================
console.log('\n🚗 Tests Drivers:\n');

const driversDir = path.join(PROJECT_ROOT, 'drivers');

test('Drivers directory not empty', () => {
  try {
    const drivers = fsSync.readdirSync(driversDir);
    const count = drivers.length;
    if (count === 0) {
      return { message: 'No drivers found' };
    }
    console.log(`  → ${count} drivers found`);
    return true;
  } catch (err) {
    return { message: err.message };
  }
});

test('Sample driver has driver.compose.json', () => {
  try {
    const drivers = fsSync.readdirSync(driversDir);
    if (drivers.length === 0) return { message: 'No drivers' };
    
    const sampleDriver = drivers[0];
    const composePath = path.join(driversDir, sampleDriver, 'driver.compose.json');
    return fsSync.existsSync(composePath);
  } catch (err) {
    return { message: err.message };
  }
});

// ============================================
// TESTS DOCUMENTATION
// ============================================
console.log('\n📚 Tests Documentation:\n');

test('ENRICHMENT_SUCCESS_REPORT.md exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'ENRICHMENT_SUCCESS_REPORT.md'));
});

test('MISSION_COMPLETE_v3.1.1.md exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'MISSION_COMPLETE_v3.1.1.md'));
});

test('AUTOMATISATION_TOTALE_SUMMARY.md exists', () => {
  return fsSync.existsSync(path.join(PROJECT_ROOT, 'AUTOMATISATION_TOTALE_SUMMARY.md'));
});

// ============================================
// TESTS CONFIGURATION
// ============================================
console.log('\n⚙️  Tests Configuration:\n');

test('app.json is valid JSON', () => {
  try {
    const app = JSON.parse(fsSync.readFileSync(path.join(PROJECT_ROOT, 'app.json'), 'utf8'));
    return app.id && app.version ? true : { message: 'Invalid structure' };
  } catch (err) {
    return { message: err.message };
  }
});

test('package.json is valid JSON', () => {
  try {
    const pkg = JSON.parse(fsSync.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    return pkg.name && pkg.version ? true : { message: 'Invalid structure' };
  } catch (err) {
    return { message: err.message };
  }
});

test('Version in sync (app.json vs package.json)', () => {
  try {
    const app = JSON.parse(fsSync.readFileSync(path.join(PROJECT_ROOT, 'app.json'), 'utf8'));
    const pkg = JSON.parse(fsSync.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    
    if (app.version !== pkg.version) {
      return { 
        warning: true, 
        message: `app.json=${app.version} vs package.json=${pkg.version}` 
      };
    }
    return true;
  } catch (err) {
    return { message: err.message };
  }
});

// ============================================
// RAPPORT FINAL
// ============================================
console.log('\n============================================');
console.log('   RAPPORT FINAL');
console.log('============================================\n');

console.log(`✓ Tests réussis: ${results.passed}`);
console.log(`⚠ Avertissements: ${results.warnings}`);
console.log(`✗ Tests échoués: ${results.failed}`);
console.log(`Total: ${results.tests.length}\n`);

if (results.failed > 0) {
  console.log('❌ Tests échoués:');
  results.tests
    .filter(t => t.status === 'FAIL')
    .forEach(t => {
      console.log(`  - ${t.name}: ${t.message}`);
    });
  console.log('');
}

if (results.warnings > 0) {
  console.log('⚠️  Avertissements:');
  results.tests
    .filter(t => t.status === 'WARN')
    .forEach(t => {
      console.log(`  - ${t.name}: ${t.message}`);
    });
  console.log('');
}

const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
console.log(`Taux de succès: ${successRate}%\n`);

if (results.failed === 0) {
  console.log('✅ TOUS LES TESTS RÉUSSIS!\n');
  process.exit(0);
} else {
  console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ\n');
  process.exit(1);
}
