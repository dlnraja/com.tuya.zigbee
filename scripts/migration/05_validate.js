#!/usr/bin/env node

/**
 * PHASE 5: VALIDATION FINALE
 * Vérifie que tout est correct avant commit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..', '..');
const driversDir = path.join(rootDir, 'drivers');
const mappingPath = path.join(__dirname, 'MIGRATION_MAP_v4.json');

console.log('\n✅ PHASE 5: VALIDATION FINALE\n');

const errors = [];
const warnings = [];
let checks = 0;

// 1. Vérifier que mapping existe
console.log('1️⃣  Checking migration map...');
checks++;
if (!fs.existsSync(mappingPath)) {
  errors.push('MIGRATION_MAP_v4.json not found');
} else {
  const { mapping, stats } = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  console.log(`   ✅ Mapping loaded: ${mapping.length} entries`);
  console.log(`      - To duplicate: ${stats.toDuplicate}`);
  console.log(`      - To rename: ${stats.toRename}\n`);
}

// 2. Compter drivers actuels
console.log('2️⃣  Counting drivers...');
checks++;
const drivers = fs.readdirSync(driversDir).filter(f => 
  fs.statSync(path.join(driversDir, f)).isDirectory()
);
console.log(`   ✅ Total drivers: ${drivers.length}\n`);

// 3. Vérifier structure drivers
console.log('3️⃣  Checking driver structure...');
checks++;
let validDrivers = 0;
let invalidDrivers = 0;

for (const driverId of drivers) {
  const driverPath = path.join(driversDir, driverId);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    errors.push(`${driverId}: Missing driver.compose.json`);
    invalidDrivers++;
    continue;
  }
  
  try {
    const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Vérifier ID correspond
    if (driver.id !== driverId) {
      errors.push(`${driverId}: ID mismatch (${driver.id})`);
      invalidDrivers++;
      continue;
    }
    
    // Vérifier images
    const imagesPath = path.join(driverPath, 'assets', 'images');
    if (!fs.existsSync(path.join(imagesPath, 'small.png'))) {
      warnings.push(`${driverId}: Missing small.png`);
    }
    if (!fs.existsSync(path.join(imagesPath, 'large.png'))) {
      warnings.push(`${driverId}: Missing large.png`);
    }
    
    validDrivers++;
    
  } catch (err) {
    errors.push(`${driverId}: Invalid JSON - ${err.message}`);
    invalidDrivers++;
  }
}

console.log(`   ✅ Valid drivers: ${validDrivers}`);
if (invalidDrivers > 0) {
  console.log(`   ⚠️  Invalid drivers: ${invalidDrivers}\n`);
} else {
  console.log();
}

// 4. Vérifier app.json
console.log('4️⃣  Checking app.json...');
checks++;
const appJsonPath = path.join(rootDir, '.homeycompose', 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    console.log(`   ✅ App version: ${appJson.version}`);
    
    if (appJson.version !== '4.0.0') {
      warnings.push('app.json version should be 4.0.0');
    }
  } catch (err) {
    errors.push(`app.json: Invalid JSON - ${err.message}`);
  }
} else {
  warnings.push('app.json not found');
}
console.log();

// 5. Homey validation (si disponible)
console.log('5️⃣  Running Homey validation...');
checks++;
try {
  execSync('homey app validate --level publish', {
    cwd: rootDir,
    stdio: 'pipe'
  });
  console.log('   ✅ Homey validation passed\n');
} catch (err) {
  const output = err.stdout ? err.stdout.toString() : err.message;
  if (output.includes('validated successfully')) {
    console.log('   ✅ Homey validation passed (with warnings)\n');
  } else {
    errors.push('Homey validation failed');
    console.log('   ❌ Homey validation failed\n');
  }
}

// Résumé
console.log('═'.repeat(70));
console.log('VALIDATION SUMMARY');
console.log('═'.repeat(70));
console.log(`\nChecks performed: ${checks}`);
console.log(`Total drivers: ${drivers.length}`);
console.log(`Valid drivers: ${validDrivers}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}\n`);

if (errors.length > 0) {
  console.log('❌ ERRORS:\n');
  errors.slice(0, 20).forEach(err => console.log(`   - ${err}`));
  if (errors.length > 20) {
    console.log(`   ... and ${errors.length - 20} more\n`);
  }
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:\n');
  warnings.slice(0, 10).forEach(warn => console.log(`   - ${warn}`));
  if (warnings.length > 10) {
    console.log(`   ... and ${warnings.length - 10} more\n`);
  }
}

if (errors.length === 0) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              ✅ VALIDATION RÉUSSIE                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

🎯 PRÊT POUR COMMIT!

Prochaines étapes:
  1. git status (vérifier changements)
  2. git add -A
  3. git commit -m "feat: v4.0.0 breaking change - reorganization"
  4. git push origin master

⚠️  N'oubliez pas:
  - Annoncer breaking change sur forum
  - Publier migration guide
  - Mettre à jour documentation
`);
  process.exit(0);
} else {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║            ❌ VALIDATION ÉCHOUÉE                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

${errors.length} erreur(s) trouvée(s).
Veuillez corriger avant de continuer.
`);
  process.exit(1);
}
