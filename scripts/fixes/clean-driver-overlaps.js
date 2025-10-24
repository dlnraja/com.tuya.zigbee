#!/usr/bin/env node
'use strict';

/**
 * CLEAN DRIVER OVERLAPS
 * 
 * Nettoie les 13,280 overlaps en supprimant les manufacturerNames génériques
 * et en gardant uniquement les IDs spécifiques
 * 
 * Stratégie:
 * - Supprimer: "Tuya", "TS0001", "TS0601", "TS0201", etc. (trop génériques)
 * - Garder: "_TZ3000_xxxxx", "_TZE200_xxxxx", "_TZE204_xxxxx", etc. (spécifiques)
 * 
 * Usage: node scripts/fixes/clean-driver-overlaps.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🧹 CLEAN DRIVER OVERLAPS\n');

let stats = {
  driversScanned: 0,
  driversModified: 0,
  genericRemoved: 0,
  specificKept: 0,
  totalBefore: 0,
  totalAfter: 0
};

// =============================================================================
// DÉFINITION DES MANUFACTURERNAMES GÉNÉRIQUES À SUPPRIMER
// =============================================================================

const GENERIC_MANUFACTURER_NAMES = [
  'Tuya',
  'TS0001', // Generic 1 gang switch
  'TS0002', // Generic 2 gang switch
  'TS0003', // Generic 3 gang switch
  'TS0004', // Generic 4 gang switch
  'TS0011', // Generic smart plug
  'TS0012', // Generic 2 gang plug
  'TS0013', // Generic 3 gang plug
  'TS0014', // Generic 4 gang plug
  'TS011F', // Generic smart plug with energy
  'TS0121', // Generic plug
  'TS0201', // Generic temperature sensor
  'TS0202', // Generic motion sensor
  'TS0203', // Generic door sensor
  'TS0204', // Generic gas sensor
  'TS0205', // Generic smoke detector
  'TS0206', // Generic water leak sensor
  'TS0207', // Generic water quality sensor
  'TS0210', // Generic vibration sensor
  'TS0211', // Generic wireless switch
  'TS0212', // Generic smart button
  'TS0213', // Generic water valve
  'TS0601', // Generic Tuya device (TRÈS large)
  'TS0502', // Generic light
  'TS0503', // Generic RGB light
  'TS0504', // Generic RGBW light
  'TS0505', // Generic RGBCCT light
  'TS130F'  // Generic curtain motor
];

// Les manufacturerNames spécifiques commencent par _ et ont un format précis
const SPECIFIC_PATTERN = /^_TZ[0-9A-Z]{4}_[a-z0-9]{8}$/;

/**
 * Détermine si un manufacturerName doit être gardé
 */
function shouldKeep(manufacturerName) {
  // Garder les IDs spécifiques avec underscore
  if (SPECIFIC_PATTERN.test(manufacturerName)) {
    return true;
  }
  
  // Supprimer les génériques
  if (GENERIC_MANUFACTURER_NAMES.includes(manufacturerName)) {
    return false;
  }
  
  // Garder les autres par défaut (marques, etc.)
  return true;
}

// =============================================================================
// NETTOYAGE DES DRIVERS
// =============================================================================

console.log('📋 Strategy:');
console.log('  ✅ KEEP: _TZ3000_xxxxxxxx, _TZE200_xxxxxxxx, etc. (specific IDs)');
console.log('  ❌ REMOVE: Tuya, TS0001, TS0601, etc. (generic names)\n');

console.log('🔍 Scanning drivers...\n');

const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory())
  .filter(d => !d.startsWith('.'));

for (const driverName of drivers) {
  stats.driversScanned++;
  
  const composeJsonPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeJsonPath)) {
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeJsonPath, 'utf8'));
    
    const originalManufacturerNames = compose.zigbee?.manufacturerName || [];
    
    if (originalManufacturerNames.length === 0) {
      continue; // Aucun manufacturerName à nettoyer
    }
    
    stats.totalBefore += originalManufacturerNames.length;
    
    // Filtrer les manufacturerNames
    const cleanedManufacturerNames = originalManufacturerNames.filter(name => {
      const keep = shouldKeep(name);
      
      if (keep) {
        stats.specificKept++;
      } else {
        stats.genericRemoved++;
        console.log(`  ❌ ${driverName}: removing "${name}"`);
      }
      
      return keep;
    });
    
    stats.totalAfter += cleanedManufacturerNames.length;
    
    // Si des changements ont été effectués
    if (cleanedManufacturerNames.length !== originalManufacturerNames.length) {
      stats.driversModified++;
      
      // Mettre à jour le compose.json
      compose.zigbee.manufacturerName = cleanedManufacturerNames;
      
      // Si TOUS les manufacturerNames ont été supprimés, garder au moins un spécifique
      if (cleanedManufacturerNames.length === 0) {
        console.log(`  ⚠️  ${driverName}: ALL manufacturerNames removed!`);
        console.log(`     This driver needs specific manufacturerNames added.`);
        console.log(`     Keeping empty for now (will cause pairing issues).`);
      }
      
      // Sauvegarder
      fs.writeFileSync(
        composeJsonPath,
        JSON.stringify(compose, null, 2),
        'utf8'
      );
      
      console.log(`  ✅ ${driverName}: ${originalManufacturerNames.length} → ${cleanedManufacturerNames.length} manufacturerNames`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${driverName}:`, err.message);
  }
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 CLEANING SUMMARY');
console.log('='.repeat(80));
console.log(`Drivers scanned:           ${stats.driversScanned}`);
console.log(`Drivers modified:          ${stats.driversModified}`);
console.log();
console.log(`Total manufacturerNames (before):  ${stats.totalBefore}`);
console.log(`Total manufacturerNames (after):   ${stats.totalAfter}`);
console.log();
console.log(`Generic removed:           ${stats.genericRemoved}`);
console.log(`Specific kept:             ${stats.specificKept}`);
console.log();
console.log(`Reduction:                 ${((stats.genericRemoved / stats.totalBefore) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

// =============================================================================
// RE-RUN OVERLAP DETECTION
// =============================================================================

console.log('\n🔍 Re-running overlap detection...\n');

try {
  const { execSync } = require('child_process');
  execSync('node scripts/automation/detect-driver-overlaps.js', {
    cwd: ROOT,
    stdio: 'inherit'
  });
} catch (err) {
  console.error('❌ Failed to run overlap detection');
}

// =============================================================================
// RECOMMENDATIONS
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('📋 NEXT STEPS');
console.log('='.repeat(80));

console.log('\n1. REVIEW CHANGES:');
console.log('   git diff drivers/*/driver.compose.json');

console.log('\n2. CHECK OVERLAP REPORT:');
console.log('   docs/reports/driver-overlaps-report.json');
console.log('   Should show significantly fewer overlaps now');

console.log('\n3. DRIVERS WITH ZERO MANUFACTURERNAMES:');
console.log('   These need specific IDs added based on:');
console.log('   - Forum diagnostic reports');
console.log('   - Zigbee2MQTT device list');
console.log('   - Home Assistant quirks');
console.log('   - Community contributions');

console.log('\n4. TEST VALIDATION:');
console.log('   homey app validate --level publish');

console.log('\n5. RE-PAIRING REQUIRED:');
console.log('   Users must re-pair devices after overlap fix');
console.log('   Old pairings may have selected wrong driver');

console.log('\n' + '='.repeat(80));
console.log('Cleaning complete!');
console.log('='.repeat(80));

process.exit(0);
