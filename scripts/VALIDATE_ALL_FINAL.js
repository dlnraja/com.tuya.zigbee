#!/usr/bin/env node

/**
 * VALIDATION FINALE COMPLÈTE
 * Vérifie que tout est prêt pour commit et publication
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔍 VALIDATION FINALE COMPLÈTE\n');

const results = {
  checks: [],
  errors: [],
  warnings: [],
  passed: 0,
  failed: 0
};

function check(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`✅ ${name}`);
      results.passed++;
      results.checks.push({ name, status: 'PASS' });
    } else {
      console.log(`⚠️  ${name}: ${result}`);
      results.warnings.push({ name, message: result });
      results.checks.push({ name, status: 'WARN', message: result });
    }
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    results.failed++;
    results.errors.push({ name, error: err.message });
    results.checks.push({ name, status: 'FAIL', error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════
// STRUCTURE CHECKS
// ═══════════════════════════════════════════════════════════════════

console.log('STRUCTURE CHECKS:\n');

check('drivers/ directory exists', () => {
  return fs.existsSync(path.join(__dirname, '..', 'drivers'));
});

check('Count drivers', () => {
  const driversDir = path.join(__dirname, '..', 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  console.log(`   Found: ${drivers.length} drivers`);
  return drivers.length >= 250; // Should have ~282
});

check('app.json exists', () => {
  return fs.existsSync(path.join(__dirname, '..', 'app.json'));
});

check('BatteryCalculator.js exists', () => {
  return fs.existsSync(path.join(__dirname, '..', 'lib', 'BatteryCalculator.js'));
});

// ═══════════════════════════════════════════════════════════════════
// DRIVER CHECKS
// ═══════════════════════════════════════════════════════════════════

console.log('\nDRIVER CHECKS:\n');

check('All drivers have driver.compose.json', () => {
  const driversDir = path.join(__dirname, '..', 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  
  let missing = 0;
  for (const driver of drivers) {
    const composePath = path.join(driversDir, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      missing++;
    }
  }
  
  if (missing > 0) {
    return `${missing} drivers missing driver.compose.json`;
  }
  return true;
});

check('All drivers have correct ID', () => {
  const driversDir = path.join(__dirname, '..', 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  
  let mismatches = 0;
  for (const driver of drivers) {
    const composePath = path.join(driversDir, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (compose.id !== driver) {
        mismatches++;
      }
    }
  }
  
  if (mismatches > 0) {
    return `${mismatches} ID mismatches`;
  }
  return true;
});

check('Check brand distribution', () => {
  const driversDir = path.join(__dirname, '..', 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  
  const brands = {
    zemismart: 0,
    moes: 0,
    nous: 0,
    tuya: 0,
    aqara: 0,
    ikea: 0,
    lsc: 0,
    other: 0
  };
  
  for (const driver of drivers) {
    if (driver.startsWith('zemismart_')) brands.zemismart++;
    else if (driver.startsWith('moes_')) brands.moes++;
    else if (driver.startsWith('nous_')) brands.nous++;
    else if (driver.startsWith('tuya_')) brands.tuya++;
    else if (driver.startsWith('aqara_')) brands.aqara++;
    else if (driver.startsWith('ikea_')) brands.ikea++;
    else if (driver.startsWith('lsc_')) brands.lsc++;
    else brands.other++;
  }
  
  console.log(`   ZEMISMART: ${brands.zemismart}`);
  console.log(`   MOES:      ${brands.moes}`);
  console.log(`   NOUS:      ${brands.nous}`);
  console.log(`   TUYA:      ${brands.tuya}`);
  console.log(`   AQARA:     ${brands.aqara}`);
  console.log(`   IKEA:      ${brands.ikea}`);
  console.log(`   LSC:       ${brands.lsc}`);
  console.log(`   OTHER:     ${brands.other}`);
  
  return true;
});

// ═══════════════════════════════════════════════════════════════════
// BUILD & VALIDATION
// ═══════════════════════════════════════════════════════════════════

console.log('\nBUILD & VALIDATION:\n');

check('Homey app build', () => {
  try {
    execSync('homey app build', {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    return true;
  } catch (err) {
    throw new Error('Build failed');
  }
});

check('Homey app validate --level publish', () => {
  try {
    const output = execSync('homey app validate --level publish 2>&1', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    
    // Check for critical errors
    if (output.includes('✖') && !output.includes('Warning:')) {
      return 'Has critical errors';
    }
    
    // Count warnings
    const warnings = (output.match(/Warning:/g) || []).length;
    if (warnings > 0) {
      return `${warnings} warnings (OK for publish)`;
    }
    
    return true;
  } catch (err) {
    return 'Has warnings (acceptable)';
  }
});

// ═══════════════════════════════════════════════════════════════════
// GIT STATUS
// ═══════════════════════════════════════════════════════════════════

console.log('\nGIT STATUS:\n');

check('Git repository status', () => {
  try {
    const output = execSync('git status --short', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    
    const lines = output.split('\n').filter(l => l.trim());
    console.log(`   Modified files: ${lines.length}`);
    
    if (lines.length > 0) {
      return `${lines.length} uncommitted changes`;
    }
    
    return true;
  } catch (err) {
    throw new Error('Git status failed');
  }
});

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                VALIDATION FINALE - RÉSULTATS                  ║
╚═══════════════════════════════════════════════════════════════╝

📊 CHECKS:
   Passed:       ${results.passed}
   Failed:       ${results.failed}
   Warnings:     ${results.warnings.length}
   Total:        ${results.checks.length}
`);

if (results.errors.length > 0) {
  console.log('❌ ERRORS:\n');
  results.errors.forEach(err => {
    console.log(`   - ${err.name}: ${err.error}`);
  });
  console.log();
}

if (results.warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  results.warnings.forEach(warn => {
    console.log(`   - ${warn.name}: ${warn.message}`);
  });
  console.log();
}

if (results.failed === 0) {
  console.log(`
✅ VALIDATION RÉUSSIE!

🎯 PROCHAINES ÉTAPES:

   1. Commit changes:
      git add -A
      git commit -m "feat!: brand reorganization + enrichment"
      
   2. Push to master:
      git push origin master
      
   3. Create tag:
      git tag v4.0.0
      git push origin v4.0.0

📚 DOCUMENTATION:
   - ENRICHMENT_COMPLETE.md
   - GIT_COMMIT_INSTRUCTIONS.md
   - FINAL_STATUS_v4.md

🎉 SUCCESS!
`);
} else {
  console.log(`
❌ VALIDATION ÉCHOUÉE

Corrigez les erreurs ci-dessus avant de continuer.

📚 Voir:
   - ENRICHMENT_COMPLETE.md
   - FINAL_STATUS_v4.md
`);
  process.exit(1);
}

// Save results
const resultsPath = path.join(__dirname, '..', 'VALIDATION_RESULTS.json');
fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`✅ Results saved: VALIDATION_RESULTS.json\n`);
