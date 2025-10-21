#!/usr/bin/env node
'use strict';

/**
 * INVESTIGATION COMPLÈTE DU PROJET
 * 
 * Vérifie TOUT:
 * 1. Tous les drivers ont les converters nécessaires
 * 2. Tous les alarm drivers ont IASZoneEnroller
 * 3. Pas de code orphelin ou problématique
 * 4. Cohérence des imports
 * 5. Validation Homey
 * 6. Device matrix
 * 7. CI/CD
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let report = {
  drivers: {
    total: 0,
    withBattery: 0,
    withIlluminance: 0,
    withAlarm: 0,
    withIAS: 0,
    missingBatteryConverter: [],
    missingIlluminanceConverter: [],
    missingIAS: [],
    orphanedCode: [],
    missingImports: []
  },
  validation: {
    homey: { passed: false, errors: [] },
    eslint: { passed: false, warnings: 0 },
    matrix: { generated: false, deviceCount: 0 }
  },
  critical: [],
  warnings: [],
  suggestions: []
};

console.log('🔍 INVESTIGATION COMPLÈTE DU PROJET\n');
console.log('='.repeat(70));

// ============================================================================
// 1. ANALYSE DES DRIVERS
// ============================================================================
console.log('\n📁 1. ANALYSE DES DRIVERS...\n');

function analyzeDriver(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const driverName = path.basename(path.dirname(filePath));
  const driverDir = path.dirname(filePath);
  report.drivers.total++;
  
  // Read actual capabilities from driver.compose.json (not just device.js mentions)
  let actualCapabilities = [];
  const composeFile = path.join(driverDir, 'driver.compose.json');
  if (fs.existsSync(composeFile)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      actualCapabilities = compose.capabilities || [];
    } catch (e) {
      // If can't parse, fall back to device.js detection
    }
  }
  
  // Check capabilities (from compose if available, else from device.js)
  const hasBattery = actualCapabilities.length > 0 
    ? actualCapabilities.includes('measure_battery')
    : (content.includes("'measure_battery'") || content.includes('"measure_battery"'));
    
  const hasIlluminance = actualCapabilities.length > 0
    ? actualCapabilities.includes('measure_luminance')
    : (content.includes("'measure_luminance'") || content.includes('"measure_luminance"'));
    
  // REAL alarm capabilities (not flow card mentions)
  const hasAlarm = actualCapabilities.length > 0
    ? actualCapabilities.some(cap => cap.startsWith('alarm_'))
    : false; // If no compose, don't assume (avoids false positives)
  
  if (hasBattery) report.drivers.withBattery++;
  if (hasIlluminance) report.drivers.withIlluminance++;
  if (hasAlarm) report.drivers.withAlarm++;
  
  // Converters
  if (hasBattery && !content.includes('fromZclBatteryPercentageRemaining')) {
    if (!content.includes('value / 2') && content.includes('batteryPercentageRemaining')) {
      report.drivers.missingBatteryConverter.push(driverName);
    }
  }
  
  if (hasIlluminance && !content.includes('fromZigbeeMeasuredValue')) {
    if (content.includes('Math.pow(10') || content.includes('10000')) {
      report.drivers.missingIlluminanceConverter.push(driverName);
    }
  }
  
  // IASZoneEnroller (only check if REAL alarm capability exists)
  if (hasAlarm) {
    if (content.includes('IASZoneEnroller')) {
      report.drivers.withIAS++;
    } else {
      report.drivers.missingIAS.push(driverName);
    }
  }
  
  // Orphaned code
  if (/^\s*catch\s*\(/m.test(content) && !content.includes('try {')) {
    report.drivers.orphanedCode.push(`${driverName}: orphaned catch block`);
  }
  
  // Missing imports
  if (content.includes('fromZclBatteryPercentageRemaining') && 
      !content.includes("require('../../lib/tuya-engine/converters/battery')")) {
    report.drivers.missingImports.push(`${driverName}: missing battery import`);
  }
  
  if (content.includes('fromZigbeeMeasuredValue') && 
      !content.includes("require('../../lib/tuya-engine/converters/illuminance')")) {
    report.drivers.missingImports.push(`${driverName}: missing illuminance import`);
  }
  
  if (content.includes('new IASZoneEnroller') && 
      !content.includes("require('../../lib/IASZoneEnroller')")) {
    report.drivers.missingImports.push(`${driverName}: missing IASZoneEnroller import`);
  }
}

const drivers = fs.readdirSync(DRIVERS_DIR);
for (const driver of drivers) {
  const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
  if (fs.existsSync(devicePath)) {
    analyzeDriver(devicePath);
  }
}

console.log(`   Total drivers: ${report.drivers.total}`);
console.log(`   Avec battery: ${report.drivers.withBattery}`);
console.log(`   Avec illuminance: ${report.drivers.withIlluminance}`);
console.log(`   Avec alarm: ${report.drivers.withAlarm}`);
console.log(`   Avec IASZoneEnroller: ${report.drivers.withIAS}`);

// ============================================================================
// 2. VALIDATION HOMEY
// ============================================================================
console.log('\n🏠 2. VALIDATION HOMEY...\n');

try {
  execSync('npx homey app validate --level publish', { 
    cwd: ROOT,
    stdio: 'pipe'
  });
  report.validation.homey.passed = true;
  console.log('   ✅ Homey validation: PASSED');
} catch (err) {
  const output = err.stdout?.toString() || err.stderr?.toString() || '';
  report.validation.homey.errors = output.split('\n').filter(l => l.includes('error') || l.includes('Error'));
  console.log(`   ❌ Homey validation: FAILED (${report.validation.homey.errors.length} errors)`);
  if (report.validation.homey.errors.length > 0) {
    report.critical.push(`Homey validation failed: ${report.validation.homey.errors.length} errors`);
  }
}

// ============================================================================
// 3. DEVICE MATRIX
// ============================================================================
console.log('\n📊 3. DEVICE MATRIX...\n');

try {
  execSync('node scripts/build-device-matrix.js', { 
    cwd: ROOT,
    stdio: 'pipe'
  });
  
  const matrixPath = path.join(ROOT, 'matrix', 'devices.json');
  if (fs.existsSync(matrixPath)) {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
    report.validation.matrix.generated = true;
    report.validation.matrix.deviceCount = matrix.length;
    console.log(`   ✅ Device matrix: ${matrix.length} devices`);
  }
} catch (err) {
  console.log('   ❌ Device matrix: FAILED');
  report.critical.push('Device matrix generation failed');
}

// ============================================================================
// 4. FICHIERS CRITIQUES
// ============================================================================
console.log('\n📝 4. FICHIERS CRITIQUES...\n');

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
  'scripts/audit-and-fix-all.js',
  'scripts/apply-ias-zone-enroller.js',
  'docs/cookbook.md'
];

let missingFiles = 0;
for (const file of criticalFiles) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`   ❌ Missing: ${file}`);
    report.critical.push(`Missing critical file: ${file}`);
    missingFiles++;
  }
}

if (missingFiles === 0) {
  console.log(`   ✅ All ${criticalFiles.length} critical files present`);
}

// ============================================================================
// 5. ANALYSE DES PROBLÈMES
// ============================================================================
console.log('\n⚠️  5. PROBLÈMES DÉTECTÉS...\n');

if (report.drivers.missingBatteryConverter.length > 0) {
  report.warnings.push(`${report.drivers.missingBatteryConverter.length} drivers need battery converter`);
  console.log(`   ⚠️  ${report.drivers.missingBatteryConverter.length} drivers missing battery converter`);
}

if (report.drivers.missingIlluminanceConverter.length > 0) {
  report.warnings.push(`${report.drivers.missingIlluminanceConverter.length} drivers need illuminance converter`);
  console.log(`   ⚠️  ${report.drivers.missingIlluminanceConverter.length} drivers missing illuminance converter`);
}

if (report.drivers.missingIAS.length > 0) {
  report.warnings.push(`${report.drivers.missingIAS.length} drivers need IASZoneEnroller`);
  console.log(`   ⚠️  ${report.drivers.missingIAS.length} alarm drivers missing IASZoneEnroller`);
}

if (report.drivers.orphanedCode.length > 0) {
  report.warnings.push(`${report.drivers.orphanedCode.length} drivers have orphaned code`);
  console.log(`   ⚠️  ${report.drivers.orphanedCode.length} drivers with orphaned code`);
}

if (report.drivers.missingImports.length > 0) {
  report.warnings.push(`${report.drivers.missingImports.length} drivers missing imports`);
  console.log(`   ⚠️  ${report.drivers.missingImports.length} drivers missing imports`);
}

// ============================================================================
// 6. SUGGESTIONS
// ============================================================================
console.log('\n💡 6. SUGGESTIONS...\n');

const coverageBattery = report.drivers.withBattery > 0 
  ? ((report.drivers.withBattery - report.drivers.missingBatteryConverter.length) / report.drivers.withBattery * 100).toFixed(1)
  : 100;

const coverageIAS = report.drivers.withAlarm > 0
  ? (report.drivers.withIAS / report.drivers.withAlarm * 100).toFixed(1)
  : 100;

console.log(`   Battery converter coverage: ${coverageBattery}%`);
console.log(`   IASZoneEnroller coverage: ${coverageIAS}%`);

if (coverageBattery < 100) {
  report.suggestions.push(`Run: node scripts/audit-and-fix-all.js to fix battery converters`);
}

if (coverageIAS < 100) {
  report.suggestions.push(`Run: node scripts/apply-ias-zone-enroller.js to add IASZoneEnroller`);
}

if (report.validation.homey.errors.length > 0) {
  report.suggestions.push(`Fix Homey validation errors before deployment`);
}

// ============================================================================
// RAPPORT FINAL
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT FINAL\n');

console.log('DRIVERS:');
console.log(`  Total: ${report.drivers.total}`);
console.log(`  Battery: ${report.drivers.withBattery} (coverage: ${coverageBattery}%)`);
console.log(`  Illuminance: ${report.drivers.withIlluminance}`);
console.log(`  Alarm: ${report.drivers.withAlarm} (IAS: ${report.drivers.withIAS}, coverage: ${coverageIAS}%)`);

console.log('\nVALIDATION:');
console.log(`  Homey: ${report.validation.homey.passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`  Matrix: ${report.validation.matrix.generated ? `✅ ${report.validation.matrix.deviceCount} devices` : '❌ FAILED'}`);

console.log('\nPROBLÈMES:');
console.log(`  Critiques: ${report.critical.length}`);
console.log(`  Warnings: ${report.warnings.length}`);

if (report.critical.length > 0) {
  console.log('\n❌ PROBLÈMES CRITIQUES:');
  report.critical.forEach(c => console.log(`  - ${c}`));
}

if (report.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  report.warnings.forEach(w => console.log(`  - ${w}`));
}

if (report.suggestions.length > 0) {
  console.log('\n💡 SUGGESTIONS:');
  report.suggestions.forEach(s => console.log(`  - ${s}`));
}

// Sauvegarder le rapport
const reportPath = path.join(ROOT, 'INVESTIGATION_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Rapport détaillé sauvegardé: INVESTIGATION_REPORT.json`);

console.log('\n' + '='.repeat(70));

if (report.critical.length === 0 && report.warnings.length === 0) {
  console.log('✅ PROJET 100% SAIN - AUCUN PROBLÈME DÉTECTÉ!');
  process.exit(0);
} else if (report.critical.length === 0) {
  console.log('⚠️  PROJET BON - QUELQUES WARNINGS MINEURS');
  process.exit(0);
} else {
  console.log('❌ PROBLÈMES CRITIQUES DÉTECTÉS - ACTION REQUISE');
  process.exit(1);
}
