#!/usr/bin/env node

/**
 * VALIDATE_ALL_DRIVERS.js
 * Validation complète finale de tous les drivers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   ✅ VALIDATION COMPLÈTE FINALE - TOUS DRIVERS        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const validation = {
  totalDrivers: 0,
  validDrivers: 0,
  warnings: [],
  errors: [],
  stats: {
    withDeviceJs: 0,
    withCompose: 0,
    withAllImages: 0,
    withEndpoints: 0,
    withBatterySupport: 0,
    sdk3Compliant: 0
  }
};

function validateDriver(driverPath, driverName) {
  const result = {
    name: driverName,
    valid: true,
    checks: {}
  };
  
  // 1. driver.compose.json
  const composePath = path.join(driverPath, 'driver.compose.json');
  result.checks.hasCompose = fs.existsSync(composePath);
  if (result.checks.hasCompose) validation.stats.withCompose++;
  
  if (result.checks.hasCompose) {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Endpoints
    result.checks.hasEndpoints = !!(compose.zigbee && compose.zigbee.endpoints);
    if (result.checks.hasEndpoints) validation.stats.withEndpoints++;
    
    // Clusters numériques
    if (compose.zigbee && compose.zigbee.endpoints) {
      const allNumeric = Object.values(compose.zigbee.endpoints).every(ep =>
        !ep.clusters || ep.clusters.every(c => typeof c === 'number')
      );
      result.checks.clustersNumeric = allNumeric;
      if (allNumeric) validation.stats.sdk3Compliant++;
    }
    
    // Battery
    const hasBattery = compose.capabilities && compose.capabilities.includes('measure_battery');
    if (hasBattery) {
      result.checks.hasBatteryEnergy = !!(compose.energy && compose.energy.batteries);
      if (result.checks.hasBatteryEnergy) validation.stats.withBatterySupport++;
    }
  }
  
  // 2. device.js
  const deviceJsPath = path.join(driverPath, 'device.js');
  result.checks.hasDeviceJs = fs.existsSync(deviceJsPath);
  if (result.checks.hasDeviceJs) validation.stats.withDeviceJs++;
  
  // 3. Images
  const assetsPath = path.join(driverPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const hasSmall = fs.existsSync(path.join(assetsPath, 'small.png'));
    const hasLarge = fs.existsSync(path.join(assetsPath, 'large.png'));
    const hasXlarge = fs.existsSync(path.join(assetsPath, 'xlarge.png'));
    result.checks.hasAllImages = hasSmall && hasLarge && hasXlarge;
    if (result.checks.hasAllImages) validation.stats.withAllImages++;
  }
  
  // Déterminer si valide
  const criticalChecks = [
    result.checks.hasCompose,
    result.checks.hasDeviceJs,
    result.checks.hasEndpoints
  ];
  
  result.valid = criticalChecks.every(c => c);
  
  if (!result.valid) {
    validation.errors.push({
      driver: driverName,
      missing: Object.entries(result.checks)
        .filter(([k, v]) => !v)
        .map(([k]) => k)
    });
  }
  
  return result;
}

// Main
const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

validation.totalDrivers = drivers.length;

console.log(`📦 ${drivers.length} drivers à valider\n`);
console.log('🔍 Validation en cours...\n');

drivers.forEach(driver => {
  const driverPath = path.join(driversDir, driver);
  const result = validateDriver(driverPath, driver);
  
  if (result.valid) {
    validation.validDrivers++;
  }
});

// Homey CLI validation
console.log('⚡ Homey CLI validation...\n');
try {
  execSync('homey app validate --level publish', { 
    stdio: 'pipe',
    cwd: process.cwd()
  });
  validation.homeyCliPass = true;
  console.log('   ✅ homey app validate: PASS\n');
} catch (error) {
  validation.homeyCliPass = false;
  console.log('   ❌ homey app validate: FAIL\n');
}

// Résultats
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║                RÉSULTATS VALIDATION FINALE             ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`   📊 STATISTIQUES GLOBALES:\n`);
console.log(`      Total drivers:          ${validation.totalDrivers}`);
console.log(`      ✅ Drivers valides:     ${validation.validDrivers} (${Math.round(validation.validDrivers/validation.totalDrivers*100)}%)`);
console.log(`      ❌ Drivers invalides:   ${validation.errors.length}`);
console.log('');

console.log(`   🔍 DÉTAILS:\n`);
console.log(`      driver.compose.json:    ${validation.stats.withCompose}/${validation.totalDrivers} (${Math.round(validation.stats.withCompose/validation.totalDrivers*100)}%)`);
console.log(`      device.js:              ${validation.stats.withDeviceJs}/${validation.totalDrivers} (${Math.round(validation.stats.withDeviceJs/validation.totalDrivers*100)}%)`);
console.log(`      Endpoints définis:      ${validation.stats.withEndpoints}/${validation.totalDrivers} (${Math.round(validation.stats.withEndpoints/validation.totalDrivers*100)}%)`);
console.log(`      Images complètes:       ${validation.stats.withAllImages}/${validation.totalDrivers} (${Math.round(validation.stats.withAllImages/validation.totalDrivers*100)}%)`);
console.log(`      SDK3 compliant:         ${validation.stats.sdk3Compliant}/${validation.totalDrivers} (${Math.round(validation.stats.sdk3Compliant/validation.totalDrivers*100)}%)`);
console.log(`      Battery support OK:     ${validation.stats.withBatterySupport} drivers`);
console.log('');

console.log(`   ⚙️  VALIDATION HOMEY CLI:\n`);
console.log(`      ${validation.homeyCliPass ? '✅' : '❌'} homey app validate --level publish`);
console.log('');

if (validation.errors.length > 0) {
  console.log(`   ❌ DRIVERS INVALIDES (${validation.errors.length}):\n`);
  validation.errors.slice(0, 10).forEach(err => {
    console.log(`      • ${err.driver}`);
    console.log(`        Manque: ${err.missing.join(', ')}`);
  });
  if (validation.errors.length > 10) {
    console.log(`      ... et ${validation.errors.length - 10} autres`);
  }
  console.log('');
}

// Score final
const qualityScore = (
  (validation.stats.withCompose / validation.totalDrivers) * 20 +
  (validation.stats.withDeviceJs / validation.totalDrivers) * 20 +
  (validation.stats.withEndpoints / validation.totalDrivers) * 20 +
  (validation.stats.withAllImages / validation.totalDrivers) * 20 +
  (validation.stats.sdk3Compliant / validation.totalDrivers) * 20
);

console.log(`   🏆 SCORE QUALITÉ: ${qualityScore.toFixed(1)}/100\n`);

if (qualityScore >= 95) {
  console.log('   ✅ EXCELLENT - Prêt pour publication!\n');
} else if (qualityScore >= 85) {
  console.log('   📈 TRÈS BON - Quelques améliorations possibles\n');
} else if (qualityScore >= 70) {
  console.log('   ⚠️  BON - Corrections recommandées\n');
} else {
  console.log('   ❌ CORRECTIONS NÉCESSAIRES\n');
}

// Sauvegarder rapport
const report = {
  date: new Date().toISOString(),
  version: JSON.parse(fs.readFileSync('app.json', 'utf8')).version,
  validation,
  qualityScore: Math.round(qualityScore)
};

fs.writeFileSync(
  'reports/FINAL_VALIDATION_REPORT.json',
  JSON.stringify(report, null, 2)
);

console.log('💾 Rapport final: reports/FINAL_VALIDATION_REPORT.json\n');

// Exit code
process.exit(validation.homeyCliPass && validation.errors.length === 0 ? 0 : 1);
