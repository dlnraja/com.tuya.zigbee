#!/usr/bin/env node
/**
 * CLASS CAPABILITY FIXER
 * 
 * Corrige les incohérences entre classes et capabilities
 * détectées dans l'analyse ultra-fine
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = __dirname;
const driversPath = path.join(rootPath, 'drivers');

console.log('🔧 CLASS CAPABILITY FIXER');
console.log('='.repeat(80));
console.log('⚡ CORRECTION DES INCOHÉRENCES CLASS/CAPABILITIES');
console.log('='.repeat(80));
console.log('');

// Drivers à corriger basés sur l'analyse
const FIXES = {
  // Controllers incorrectement classés "curtain" → "other"
  'door_controller': { currentClass: 'curtain', newClass: 'other', reason: 'Door controller not a curtain' },
  'garage_door_controller': { currentClass: 'curtain', newClass: 'other', reason: 'Garage controller not a curtain' },
  'humidity_controller': { currentClass: 'curtain', newClass: 'other', reason: 'Humidity controller not a curtain' },
  'hvac_controller': { currentClass: 'curtain', newClass: 'other', reason: 'HVAC controller not a curtain' },
  'pool_pump_controller': { currentClass: 'curtain', newClass: 'other', reason: 'Pool pump not a curtain' },
  'projector_screen_controller': { currentClass: 'curtain', newClass: 'curtain', reason: 'Keep curtain - projector screen is like curtain' },
  'shade_controller': { currentClass: 'curtain', newClass: 'curtain', reason: 'Keep curtain - shade is curtain type' },
  'smart_irrigation_controller': { currentClass: 'curtain', newClass: 'other', reason: 'Irrigation not a curtain' },
  'smart_valve_controller': { currentClass: 'curtain', newClass: 'other', reason: 'Valve controller not a curtain' },
  'solar_panel_controller': { currentClass: 'curtain', newClass: 'other', reason: 'Solar panel not a curtain' },
  'temperature_controller': { currentClass: 'curtain', newClass: 'other', reason: 'Temperature controller not a curtain' },
  
  // LED strips incorrectement classés "curtain" → "light"
  'led_strip_controller': { currentClass: 'curtain', newClass: 'light', reason: 'LED strip is lighting' },
  'led_strip_controller_pro': { currentClass: 'curtain', newClass: 'light', reason: 'LED strip is lighting' }
};

let fixedCount = 0;
let skippedCount = 0;

console.log('📋 Corrections à appliquer: ' + Object.keys(FIXES).length);
console.log('');

Object.keys(FIXES).forEach(driverId => {
  const fix = FIXES[driverId];
  const composePath = path.join(driversPath, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log('   ⚠️  ' + driverId + ': driver.compose.json introuvable');
    skippedCount++;
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Vérifier si correction nécessaire
    if (compose.class === fix.newClass) {
      console.log('   ✓  ' + driverId + ': Déjà correct (' + fix.newClass + ')');
      skippedCount++;
      return;
    }
    
    // Appliquer la correction
    const oldClass = compose.class;
    compose.class = fix.newClass;
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    
    console.log('   ✅ ' + driverId + ': "' + oldClass + '" → "' + fix.newClass + '"');
    console.log('      Raison: ' + fix.reason);
    fixedCount++;
    
  } catch (error) {
    console.log('   ❌ ' + driverId + ': Erreur - ' + error.message);
    skippedCount++;
  }
});

console.log('');
console.log('📊 RÉSULTATS:');
console.log('   Corrections appliquées: ' + fixedCount);
console.log('   Déjà corrects/Skipped: ' + skippedCount);
console.log('');

if (fixedCount > 0) {
  console.log('🔄 Rebuild de l\'app...');
  console.log('-'.repeat(80));
  
  try {
    execSync('homey app build', { stdio: 'inherit', cwd: rootPath });
    console.log('');
    console.log('✅ Build SUCCESS');
  } catch (error) {
    console.log('');
    console.log('❌ Build FAILED');
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Validation...');
  console.log('-'.repeat(80));
  
  try {
    execSync('homey app validate --level=publish', { stdio: 'inherit', cwd: rootPath });
    console.log('');
    console.log('✅ Validation PASSED');
  } catch (error) {
    console.log('');
    console.log('❌ Validation FAILED');
    process.exit(1);
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('🎊 ' + fixedCount + ' CLASSES CORRIGÉES - VALIDATION RÉUSSIE!');
  console.log('='.repeat(80));
  console.log('');
}

process.exit(0);
