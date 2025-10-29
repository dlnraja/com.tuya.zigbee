#!/usr/bin/env node
'use strict';

/**
 * Audit Fingerprint Collisions
 * 
 * Scans all driver.compose.json files and detects:
 * 1. Duplicate productId across multiple drivers
 * 2. Generic productIds (TS0002-TS0006, TS0601) without specific manufacturerName
 * 3. Missing manufacturerName + productId combinations
 * 
 * Outputs:
 * - CSV report: collisions.csv
 * - JSON index: drivers-index.json
 * - Console summary
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const OUTPUT_CSV = path.join(__dirname, 'collisions.csv');
const OUTPUT_JSON = path.join(__dirname, 'drivers-index.json');

// Generic productIds that cause most conflicts
const GENERIC_IDS = ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0005', 'TS0006', 'TS0011', 'TS0601'];

/**
 * Read all driver.compose.json files
 */
function scanDrivers() {
  const drivers = [];
  const driversPath = fs.readdirSync(DRIVERS_DIR);
  
  for (const driverDir of driversPath) {
    const driverPath = path.join(DRIVERS_DIR, driverDir);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      if (data.zigbee) {
        const manufacturerNames = data.zigbee.manufacturerName || [];
        const productIds = data.zigbee.productId || [];
        
        drivers.push({
          id: driverDir,
          name: data.name?.en || driverDir,
          class: data.class || 'unknown',
          capabilities: data.capabilities || [],
          manufacturerNames: Array.isArray(manufacturerNames) ? manufacturerNames : [manufacturerNames],
          productIds: Array.isArray(productIds) ? productIds : [productIds],
        });
      }
    } catch (err) {
      console.error(`Error reading ${driverDir}:`, err.message);
    }
  }
  
  return drivers;
}

/**
 * Build productId → drivers index
 */
function buildIndex(drivers) {
  const index = {};
  
  for (const driver of drivers) {
    for (const productId of driver.productIds) {
      if (!index[productId]) {
        index[productId] = [];
      }
      index[productId].push({
        driverId: driver.id,
        driverName: driver.name,
        class: driver.class,
        manufacturerNames: driver.manufacturerNames,
      });
    }
  }
  
  return index;
}

/**
 * Detect collisions
 */
function detectCollisions(index) {
  const collisions = [];
  
  for (const [productId, driverList] of Object.entries(index)) {
    if (driverList.length > 1) {
      collisions.push({
        productId,
        count: driverList.length,
        drivers: driverList,
        isGeneric: GENERIC_IDS.includes(productId),
      });
    }
  }
  
  // Sort by count DESC
  collisions.sort((a, b) => b.count - a.count);
  
  return collisions;
}

/**
 * Generate CSV report
 */
function generateCSV(collisions) {
  let csv = 'ProductID,DriverCount,IsGeneric,Drivers,ManufacturerNames\n';
  
  for (const collision of collisions) {
    const driverNames = collision.drivers.map(d => d.driverId).join('; ');
    const manufacturers = [...new Set(collision.drivers.flatMap(d => d.manufacturerNames))].join('; ');
    
    csv += `"${collision.productId}",${collision.count},${collision.isGeneric ? 'YES' : 'NO'},"${driverNames}","${manufacturers}"\n`;
  }
  
  fs.writeFileSync(OUTPUT_CSV, csv);
  console.log(`✅ CSV report written: ${OUTPUT_CSV}`);
}

/**
 * Generate JSON index
 */
function generateJSON(index) {
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(index, null, 2));
  console.log(`✅ JSON index written: ${OUTPUT_JSON}`);
}

/**
 * Print console summary
 */
function printSummary(drivers, collisions) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINGERPRINT COLLISION AUDIT');
  console.log('='.repeat(80));
  console.log(`Total drivers scanned: ${drivers.length}`);
  console.log(`Total productIds with collisions: ${collisions.length}`);
  console.log(`Generic productIds with collisions: ${collisions.filter(c => c.isGeneric).length}`);
  console.log('='.repeat(80));
  
  console.log('\n🚨 TOP 10 WORST COLLISIONS:\n');
  
  for (let i = 0; i < Math.min(10, collisions.length); i++) {
    const c = collisions[i];
    console.log(`${i + 1}. ${c.productId} → ${c.count} drivers ${c.isGeneric ? '⚠️ GENERIC' : ''}`);
    
    for (const driver of c.drivers.slice(0, 5)) {
      const manu = driver.manufacturerNames.length > 0 ? driver.manufacturerNames[0] : 'NO MANUFACTURER';
      console.log(`   - ${driver.driverId} (${manu})`);
    }
    
    if (c.drivers.length > 5) {
      console.log(`   ... and ${c.drivers.length - 5} more drivers`);
    }
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. For each collision, add specific manufacturerName to fingerprints');
  console.log('2. Remove generic productIds (TS0002-006) from drivers that don\'t need them');
  console.log('3. Create multi-variant drivers for device families');
  console.log('4. Use manufacturerName + productId combination for Priority 1 matching');
  console.log('='.repeat(80) + '\n');
}

/**
 * Main
 */
function main() {
  console.log('🔍 Scanning drivers...\n');
  
  const drivers = scanDrivers();
  console.log(`Found ${drivers.length} drivers\n`);
  
  console.log('📊 Building index...\n');
  const index = buildIndex(drivers);
  
  console.log('🚨 Detecting collisions...\n');
  const collisions = detectCollisions(index);
  
  generateCSV(collisions);
  generateJSON(index);
  printSummary(drivers, collisions);
  
  // Exit code: 0 if no critical collisions, 1 if many
  const criticalCount = collisions.filter(c => c.isGeneric && c.count > 5).length;
  if (criticalCount > 0) {
    console.error(`❌ Found ${criticalCount} critical collisions (generic productId used by 5+ drivers)`);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
