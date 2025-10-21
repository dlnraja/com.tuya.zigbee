#!/usr/bin/env node
'use strict';

/**
 * CLEAN PRODUCTID OVERLAPS
 * 
 * Phase 2 du nettoyage des overlaps
 * Nettoie les productIds génériques pour réduire les 13,070 overlaps restants
 * 
 * Stratégie intelligente:
 * - Drivers spécialisés: garder uniquement productIds spécifiques
 * - Drivers génériques: garder 1-2 productIds génériques (mais PAS "TS0601")
 * - Créer fallback drivers si nécessaire
 * 
 * Usage: node scripts/fixes/clean-productid-overlaps.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🧹 CLEAN PRODUCTID OVERLAPS - PHASE 2\n');

let stats = {
  driversScanned: 0,
  driversModified: 0,
  productIdsRemoved: 0,
  productIdsKept: 0,
  totalBefore: 0,
  totalAfter: 0,
  driversWithZeroProductIds: []
};

// =============================================================================
// PRODUCTIDS ULTRA-GÉNÉRIQUES À SUPPRIMER SYSTÉMATIQUEMENT
// =============================================================================

const ULTRA_GENERIC_PRODUCTIDS = [
  'TS0601', // Le pire: utilisé par 100+ types de devices différents
];

/**
 * Détermine si un productId est générique (TS*)
 */
function isGenericProductId(productId) {
  return productId.startsWith('TS');
}

/**
 * Détermine si un productId est spécifique (non-TS)
 */
function isSpecificProductId(productId) {
  return !productId.startsWith('TS');
}

/**
 * Détermine si un driver est spécialisé (multisensor, combo)
 */
function isSpecializedDriver(driverName) {
  const specializedKeywords = [
    'motion_temp_humidity',
    'temp_humidity_illumination',
    'co2_temp_humidity',
    'smoke_temp_humidity',
    'multi',
    'advanced',
    'pro',
    'monitor'
  ];
  
  return specializedKeywords.some(keyword => driverName.includes(keyword));
}

/**
 * Détermine si un productId doit être gardé
 */
function shouldKeepProductId(driverName, productId, allProductIds) {
  // Règle 0: ULTRA-GÉNÉRIQUES toujours supprimés
  if (ULTRA_GENERIC_PRODUCTIDS.includes(productId)) {
    console.log(`    ❌ ${productId} (ULTRA-GENERIC - never allowed)`);
    return false;
  }
  
  // Règle 1: ProductIds spécifiques (non-TS) toujours gardés
  if (isSpecificProductId(productId)) {
    return true;
  }
  
  // Règle 2: Si driver a des productIds spécifiques, supprimer les génériques
  const specificProductIds = allProductIds.filter(isSpecificProductId);
  if (specificProductIds.length > 0) {
    console.log(`    ❌ ${productId} (driver has specific productIds: ${specificProductIds.slice(0, 2).join(', ')})`);
    return false;
  }
  
  // Règle 3: Drivers spécialisés (multi-sensor) ne peuvent pas avoir de génériques
  if (isSpecializedDriver(driverName)) {
    console.log(`    ❌ ${productId} (specialized driver)`);
    return false;
  }
  
  // Règle 4: Pour drivers génériques, garder max 2 productIds génériques
  const genericProductIds = allProductIds.filter(isGenericProductId);
  const currentIndex = genericProductIds.indexOf(productId);
  
  if (currentIndex >= 2) {
    console.log(`    ❌ ${productId} (too many generic productIds for this driver)`);
    return false;
  }
  
  // Garder ce productId générique (max 2 par driver)
  return true;
}

// =============================================================================
// NETTOYAGE DES DRIVERS
// =============================================================================

console.log('📋 Strategy:');
console.log('  1. ALWAYS REMOVE: TS0601 (ultra-generic)');
console.log('  2. KEEP: Non-TS productIds (specific to brands/models)');
console.log('  3. IF driver has specific productIds: REMOVE all generic ones');
console.log('  4. IF driver is specialized (multi-sensor): REMOVE all generic');
console.log('  5. IF driver is generic: KEEP max 2 generic productIds\n');

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
    
    const originalProductIds = compose.zigbee?.productId || [];
    
    if (originalProductIds.length === 0) {
      continue; // Aucun productId à nettoyer
    }
    
    stats.totalBefore += originalProductIds.length;
    
    // Filtrer les productIds
    const cleanedProductIds = originalProductIds.filter(productId => {
      const keep = shouldKeepProductId(driverName, productId, originalProductIds);
      
      if (keep) {
        stats.productIdsKept++;
      } else {
        stats.productIdsRemoved++;
      }
      
      return keep;
    });
    
    stats.totalAfter += cleanedProductIds.length;
    
    // Si des changements ont été effectués
    if (cleanedProductIds.length !== originalProductIds.length) {
      stats.driversModified++;
      
      console.log(`\n📝 ${driverName}:`);
      console.log(`  Before: ${originalProductIds.join(', ')}`);
      console.log(`  After: ${cleanedProductIds.length > 0 ? cleanedProductIds.join(', ') : '(EMPTY)'}`);
      
      // Mettre à jour le compose.json
      compose.zigbee.productId = cleanedProductIds;
      
      // Si TOUS les productIds ont été supprimés
      if (cleanedProductIds.length === 0) {
        console.log(`  ⚠️  WARNING: ALL productIds removed!`);
        console.log(`     This driver needs specific productIds added.`);
        console.log(`     Device may not pair without productId.`);
        stats.driversWithZeroProductIds.push(driverName);
      }
      
      // Sauvegarder
      fs.writeFileSync(
        composeJsonPath,
        JSON.stringify(compose, null, 2),
        'utf8'
      );
      
      console.log(`  ✅ Saved: ${originalProductIds.length} → ${cleanedProductIds.length} productIds`);
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
console.log(`Total productIds (before): ${stats.totalBefore}`);
console.log(`Total productIds (after):  ${stats.totalAfter}`);
console.log();
console.log(`ProductIds removed:        ${stats.productIdsRemoved}`);
console.log(`ProductIds kept:           ${stats.productIdsKept}`);
console.log();
console.log(`Reduction:                 ${((stats.productIdsRemoved / stats.totalBefore) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

// =============================================================================
// DRIVERS WITH ZERO PRODUCTIDS
// =============================================================================

if (stats.driversWithZeroProductIds.length > 0) {
  console.log('\n⚠️  DRIVERS WITH ZERO PRODUCTIDS:');
  console.log('='.repeat(80));
  console.log(`${stats.driversWithZeroProductIds.length} drivers have NO productIds after cleaning.\n`);
  
  stats.driversWithZeroProductIds.forEach(driver => {
    console.log(`  - ${driver}`);
  });
  
  console.log('\nThese drivers need specific productIds added based on:');
  console.log('  - Zigbee2MQTT device database');
  console.log('  - Home Assistant quirks');
  console.log('  - Forum diagnostic reports');
  console.log('  - Community contributions');
  console.log();
  console.log('Without productIds, these drivers may not be selectable during pairing.');
}

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
console.log('   Expected: <1,000 overlaps (down from 13,070)');

console.log('\n3. FIX DRIVERS WITH ZERO PRODUCTIDS:');
console.log(`   ${stats.driversWithZeroProductIds.length} drivers need productIds`);
console.log('   Research specific productIds from:');
console.log('   - https://zigbee.blakadder.com/');
console.log('   - https://www.zigbee2mqtt.io/supported-devices/');
console.log('   - https://github.com/Koenkk/zigbee-herdsman-converters');

console.log('\n4. TEST VALIDATION:');
console.log('   homey app validate --level publish');

console.log('\n5. TEST PAIRING:');
console.log('   Test with real devices (especially Peter\'s HOBEIAN)');
console.log('   Verify correct driver selection');
console.log('   Confirm data reporting (lux, temp, humidity)');

console.log('\n6. COMMUNICATE TO USERS:');
console.log('   - Forum post about overlap fix');
console.log('   - Re-pairing instructions');
console.log('   - Expected improvements');
console.log('   - Version 3.0.4 release notes');

console.log('\n' + '='.repeat(80));
console.log('Phase 2 cleaning complete!');
console.log('='.repeat(80));

process.exit(0);
