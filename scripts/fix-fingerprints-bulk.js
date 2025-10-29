#!/usr/bin/env node
'use strict';

/**
 * Bulk Fingerprint Fixer
 * Scans all drivers with generic productIds and adds manufacturerName constraints
 */

const fs = require('fs');
const path = require('path');

// Known problematic generic IDs that need manufacturerName
const GENERIC_IDS = ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012', 'TS0013', 'TS0014', 'TS0601', 'TS0121', 'TS011F', 'TS0201', 'TS0202', 'TS0203'];

const fixes = [];
const driversDir = path.join(__dirname, '..', 'drivers');

function fixDriver(driverPath, driverName) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const zigbee = compose.zigbee;
    
    if (!zigbee) return;
    
    let modified = false;
    
    // Check if using generic productId without manufacturerName
    if (Array.isArray(zigbee.productId)) {
      const hasGeneric = zigbee.productId.some(id => GENERIC_IDS.includes(id));
      const hasManufacturer = zigbee.manufacturerName && Array.isArray(zigbee.manufacturerName) && zigbee.manufacturerName.length > 0;
      
      if (hasGeneric && !hasManufacturer) {
        console.log(`⚠️  ${driverName}: Generic productId without manufacturerName`);
        fixes.push({
          driver: driverName,
          issue: 'Generic productId without manufacturerName',
          productIds: zigbee.productId,
          action: 'MANUAL - Add manufacturerName array'
        });
      } else if (hasGeneric && hasManufacturer) {
        console.log(`✅ ${driverName}: Has manufacturerName constraints`);
      }
    }
    
  } catch (err) {
    console.error(`Error processing ${driverName}:`, err.message);
  }
}

// Scan all drivers
const drivers = fs.readdirSync(driversDir);
console.log(`Scanning ${drivers.length} drivers...\n`);

drivers.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  if (fs.statSync(driverPath).isDirectory()) {
    fixDriver(driverPath, driverName);
  }
});

// Generate report
console.log('\n' + '='.repeat(80));
console.log(`📊 FIXES NEEDED: ${fixes.length} drivers`);
console.log('='.repeat(80) + '\n');

fixes.forEach((fix, i) => {
  console.log(`${i + 1}. ${fix.driver}`);
  console.log(`   Issue: ${fix.issue}`);
  console.log(`   ProductIds: ${fix.productIds.join(', ')}`);
  console.log(`   Action: ${fix.action}\n`);
});

// Save report
const reportPath = path.join(__dirname, '..', 'reports', 'fingerprint-fixes-needed.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(fixes, null, 2));
console.log(`📄 Report saved: ${reportPath}\n`);

process.exit(fixes.length > 0 ? 1 : 0);
