#!/usr/bin/env node
'use strict';

/**
 * FIX TS0002 CONFLICTS - Remove TS0002 from drivers that are NOT 2-gang
 * 
 * PROBLEM:
 * 38 drivers ALL accept "TS0002" in productId array
 * → Homey randomly chooses between them
 * → User gets switch_basic_2gang instead of usb_outlet_2port
 * 
 * SOLUTION:
 * 1. Keep TS0002 ONLY for TRUE 2-gang switches
 * 2. Remove TS0002 from:
 *    - 1-gang drivers (should use TS0001, TS0011)
 *    - 3+ gang drivers (should use TS0003, TS0004, etc.)
 *    - Non-switch drivers (lights, sensors)
 * 
 * STRATEGY:
 * - If driver name contains "1gang" → remove TS0002
 * - If driver name contains "3gang|4gang|5gang|6gang|8gang" → remove TS0002
 * - If driver is air_quality, light_controller → remove TS0002
 * - Keep TS0002 ONLY for *_2gang drivers
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

// Drivers that should NOT have TS0002
const REMOVE_TS0002_PATTERNS = [
  '_1gang',
  '_3gang',
  '_4gang',
  '_5gang',
  '_6gang',
  '_8gang',
  'air_quality',
  'light_controller',
  'shutter_roller',
  'module_mini' // Mini modules use TS0001/TS0002 but need specific manufacturerName
];

// Drivers that CAN keep TS0002 (TRUE 2-gang switches)
const KEEP_TS0002_PATTERNS = [
  '_2gang',
  'hybrid_2gang'
];

async function fixTS0002Conflicts() {
  console.log('🔧 FIXING TS0002 CONFLICTS...\n');
  
  const drivers = fs.readdirSync(driversDir);
  let fixedCount = 0;
  let keptCount = 0;
  let skippedCount = 0;
  
  for (const driverName of drivers) {
    const driverPath = path.join(driversDir, driverName);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const driver = JSON.parse(content);
      
      // Check if driver has TS0002 in productId
      const productIds = driver.zigbee?.productId;
      if (!Array.isArray(productIds) || !productIds.includes('TS0002')) {
        skippedCount++;
        continue;
      }
      
      // Determine if we should REMOVE or KEEP TS0002
      const shouldKeep = KEEP_TS0002_PATTERNS.some(pattern => driverName.includes(pattern));
      const shouldRemove = REMOVE_TS0002_PATTERNS.some(pattern => driverName.includes(pattern));
      
      if (shouldRemove && !shouldKeep) {
        // REMOVE TS0002 from this driver
        const filteredIds = productIds.filter(id => id !== 'TS0002');
        driver.zigbee.productId = filteredIds;
        
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n');
        console.log(`✅ REMOVED TS0002 from: ${driverName}`);
        console.log(`   Remaining productIds: ${filteredIds.join(', ')}\n`);
        fixedCount++;
        
      } else if (shouldKeep) {
        // KEEP TS0002 but log for review
        console.log(`✓ KEPT TS0002 in: ${driverName} (2-gang switch)`);
        console.log(`  manufacturerNames: ${driver.zigbee?.manufacturerName?.length || 0} entries\n`);
        keptCount++;
        
      } else {
        // Ambiguous - log for manual review
        console.log(`⚠️  REVIEW NEEDED: ${driverName}`);
        console.log(`   Has TS0002 but not clear if should keep`);
        console.log(`   productIds: ${productIds.join(', ')}\n`);
        skippedCount++;
      }
      
    } catch (err) {
      console.error(`❌ Error processing ${driverName}:`, err.message);
    }
  }
  
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ Removed TS0002: ${fixedCount} drivers`);
  console.log(`✓ Kept TS0002: ${keptCount} drivers (valid 2-gang)`);
  console.log(`⚠️  Skipped: ${skippedCount} drivers (no TS0002 or needs review)`);
  console.log(`📦 Total drivers scanned: ${drivers.length}`);
  console.log('\n');
  
  if (fixedCount > 0) {
    console.log('🚀 NEXT STEPS:');
    console.log('1. Review changes: git diff drivers/');
    console.log('2. Test pairing with affected devices');
    console.log('3. Commit: git commit -m "v4.9.190-fix-ts0002-fingerprint-conflicts"');
    console.log('4. Update device-matrix: node scripts/generate-device-matrix.js');
  }
}

// Run if called directly
if (require.main === module) {
  fixTS0002Conflicts().catch(console.error);
}

module.exports = fixTS0002Conflicts;
