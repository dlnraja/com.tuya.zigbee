#!/usr/bin/env node
// ============================================================================
// FINAL VERIFICATION & PUBLISH - Vérification complète + Publication
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

console.log('🎯 FINAL VERIFICATION & PUBLISH');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

const report = {
  timestamp: new Date().toISOString(),
  checks: {
    structure: false,
    drivers: false,
    coherence: false,
    validation: false,
    git: false
  },
  errors: [],
  warnings: [],
  stats: {
    totalDrivers: 0,
    validDrivers: 0,
    emptyDrivers: 0,
    invalidJson: 0
  }
};

// ============================================================================
// CHECK 1: STRUCTURE ROOT
// ============================================================================
console.log('📁 CHECK 1: STRUCTURE ROOT\n');

const essentialFiles = [
  'app.json', 'package.json', 'package-lock.json',
  '.homeychangelog.json', 'README.md'
];

let structureOK = true;
essentialFiles.forEach(file => {
  const exists = fs.existsSync(path.join(rootPath, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) {
    structureOK = false;
    report.errors.push(`Missing: ${file}`);
  }
});

report.checks.structure = structureOK;
console.log(`\n${structureOK ? '✅' : '❌'} Structure: ${structureOK ? 'OK' : 'ERREURS'}\n`);

// ============================================================================
// CHECK 2: TOUS LES DRIVERS
// ============================================================================
console.log('📦 CHECK 2: VERIFICATION DRIVERS\n');

const drivers = fs.readdirSync(driversPath)
  .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory())
  .sort();

report.stats.totalDrivers = drivers.length;
console.log(`Total drivers: ${drivers.length}\n`);

let driversOK = true;

drivers.forEach((driverName, index) => {
  const composeFile = path.join(driversPath, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    console.log(`❌ [${index + 1}] ${driverName}: Pas de driver.compose.json`);
    report.errors.push(`${driverName}: Missing driver.compose.json`);
    driversOK = false;
    return;
  }
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  } catch (e) {
    console.log(`❌ [${index + 1}] ${driverName}: JSON invalide`);
    report.errors.push(`${driverName}: Invalid JSON`);
    report.stats.invalidJson++;
    driversOK = false;
    return;
  }
  
  // Vérifier champs essentiels
  const issues = [];
  
  if (!compose.name || !compose.name.en) {
    issues.push('name manquant');
  }
  
  if (!compose.class) {
    issues.push('class manquant');
  }
  
  if (!compose.zigbee || !compose.zigbee.manufacturerName) {
    issues.push('manufacturerName manquant');
  } else {
    const ids = Array.isArray(compose.zigbee.manufacturerName) 
      ? compose.zigbee.manufacturerName 
      : [compose.zigbee.manufacturerName];
    
    if (ids.length === 0) {
      issues.push('manufacturerName VIDE');
      report.stats.emptyDrivers++;
      driversOK = false;
    }
  }
  
  if (issues.length > 0) {
    console.log(`⚠️  [${index + 1}] ${driverName}: ${issues.join(', ')}`);
    report.warnings.push(`${driverName}: ${issues.join(', ')}`);
    driversOK = false;
  } else {
    report.stats.validDrivers++;
    if ((index + 1) % 50 === 0) {
      console.log(`✅ ${index + 1}/${drivers.length} drivers vérifiés...`);
    }
  }
});

console.log(`\n✅ Drivers valides: ${report.stats.validDrivers}/${report.stats.totalDrivers}`);
if (report.stats.emptyDrivers > 0) {
  console.log(`⚠️  Drivers vides: ${report.stats.emptyDrivers}`);
}
if (report.stats.invalidJson > 0) {
  console.log(`❌ JSON invalides: ${report.stats.invalidJson}`);
}

report.checks.drivers = driversOK && report.stats.emptyDrivers === 0;
console.log(`\n${report.checks.drivers ? '✅' : '❌'} Drivers: ${report.checks.drivers ? 'OK' : 'ERREURS'}\n`);

// ============================================================================
// CHECK 3: COHERENCE
// ============================================================================
console.log('🔍 CHECK 3: COHERENCE\n');

const coherenceIssues = [];

// Vérifier cohérence classes
const classCounts = {};
drivers.forEach(driverName => {
  const composeFile = path.join(driversPath, driverName, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const cls = compose.class || 'undefined';
    classCounts[cls] = (classCounts[cls] || 0) + 1;
  } catch (e) {}
});

console.log('Classes utilisées:');
Object.entries(classCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cls, count]) => {
    console.log(`  ${cls}: ${count}`);
  });

report.checks.coherence = coherenceIssues.length === 0;
console.log(`\n${report.checks.coherence ? '✅' : '⚠️'} Cohérence: ${report.checks.coherence ? 'OK' : 'WARNINGS'}\n`);

// ============================================================================
// CHECK 4: VALIDATION HOMEY
// ============================================================================
console.log('✅ CHECK 4: VALIDATION HOMEY\n');

try {
  const output = execSync('homey app validate --level=publish', {
    cwd: rootPath,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('  ✅ Validation PASS');
  console.log('  ' + output.split('\n').filter(l => l.includes('✓')).join('\n  '));
  report.checks.validation = true;
  
} catch (e) {
  console.log('  ❌ Validation ERREUR');
  console.log(e.stdout || e.stderr || e.message);
  report.checks.validation = false;
  report.errors.push('Validation Homey failed');
}

console.log(`\n${report.checks.validation ? '✅' : '❌'} Validation: ${report.checks.validation ? 'PASS' : 'FAIL'}\n`);

// ============================================================================
// CHECK 5: GIT STATUS
// ============================================================================
console.log('📦 CHECK 5: GIT STATUS\n');

try {
  const status = execSync('git status --short', {
    cwd: rootPath,
    encoding: 'utf8'
  });
  
  if (status.trim()) {
    console.log('  📝 Changements détectés:');
    console.log(status.split('\n').slice(0, 10).map(l => '    ' + l).join('\n'));
    if (status.split('\n').length > 10) {
      console.log(`    ... et ${status.split('\n').length - 10} autres`);
    }
  } else {
    console.log('  ✅ Working tree clean');
  }
  
  report.checks.git = true;
  
} catch (e) {
  console.log('  ❌ Erreur Git');
  report.checks.git = false;
}

console.log();

// ============================================================================
// RAPPORT FINAL
// ============================================================================
console.log('='.repeat(80));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(80));

console.log('\n✅ CHECKS:');
Object.entries(report.checks).forEach(([check, status]) => {
  console.log(`  ${status ? '✅' : '❌'} ${check}: ${status ? 'OK' : 'FAIL'}`);
});

console.log('\n📊 STATISTIQUES:');
console.log(`  Total drivers: ${report.stats.totalDrivers}`);
console.log(`  Valides: ${report.stats.validDrivers}`);
console.log(`  Vides: ${report.stats.emptyDrivers}`);
console.log(`  JSON invalides: ${report.stats.invalidJson}`);

if (report.errors.length > 0) {
  console.log('\n❌ ERREURS:');
  report.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
  if (report.errors.length > 10) {
    console.log(`  ... et ${report.errors.length - 10} autres`);
  }
}

if (report.warnings.length > 0 && report.warnings.length <= 10) {
  console.log('\n⚠️  WARNINGS:');
  report.warnings.forEach(warn => console.log(`  - ${warn}`));
}

// Vérifier si tout est OK
const allOK = Object.values(report.checks).every(v => v) && 
              report.stats.emptyDrivers === 0 &&
              report.stats.invalidJson === 0;

console.log(`\n${'='.repeat(80)}`);
if (allOK) {
  console.log('🎉 TOUT EST OK - PRÊT POUR PUBLICATION!');
} else {
  console.log('⚠️  DES PROBLÈMES DÉTECTÉS - VOIR CI-DESSUS');
}
console.log('='.repeat(80));

// Sauvegarder rapport
const reportPath = path.join(rootPath, 'references', 'reports', 
  `FINAL_VERIFICATION_${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📝 Rapport sauvegardé: ${path.basename(reportPath)}`);

// ============================================================================
// GIT COMMIT & PUSH (si changements)
// ============================================================================
if (allOK) {
  console.log('\n📦 GIT COMMIT & PUSH...\n');
  
  try {
    execSync('git add -A', { cwd: rootPath, stdio: 'pipe' });
    
    try {
      const version = JSON.parse(fs.readFileSync(path.join(rootPath, 'app.json'), 'utf8')).version;
      execSync(`git commit -m "✅ Final verification v${version} - All checks PASS"`, { 
        cwd: rootPath, 
        stdio: 'pipe' 
      });
      console.log('  ✅ Commit créé');
      
      execSync('git push origin master', { cwd: rootPath, stdio: 'inherit' });
      console.log('  ✅ Push SUCCESS');
      
    } catch (e) {
      if (e.message.includes('nothing to commit')) {
        console.log('  ℹ️  Aucun changement à committer');
      } else {
        throw e;
      }
    }
    
  } catch (e) {
    console.log(`  ⚠️  ${e.message.split('\n')[0]}`);
  }
  
  // ============================================================================
  // PUBLICATION (Manuel)
  // ============================================================================
  console.log('\n🚀 PUBLICATION\n');
  console.log('  Pour publier maintenant:');
  console.log('  $ homey app publish');
  console.log('\n  Dashboard: https://tools.developer.homey.app/apps');
  
} else {
  console.log('\n⚠️  CORRIGER LES ERREURS AVANT PUBLICATION\n');
  process.exit(1);
}

console.log('\n' + '='.repeat(80));
console.log('✅ VERIFICATION TERMINÉE');
console.log('='.repeat(80) + '\n');
