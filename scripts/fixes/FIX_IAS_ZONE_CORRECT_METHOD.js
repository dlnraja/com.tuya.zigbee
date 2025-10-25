#!/usr/bin/env node
'use strict';

/**
 * FIX IAS ZONE - CORRECT SDK3 METHOD
 * 
 * Correction: Utiliser endpoint.clusters.iasZone au lieu de endpoint.clusters[1280]
 * Les deux sont valides en SDK3, mais .iasZone est plus lisible et standard.
 * 
 * SDK3 supporte:
 * ✅ endpoint.clusters.iasZone (RECOMMANDÉ - plus lisible)
 * ✅ endpoint.clusters[1280] (aussi valide mais moins lisible)
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let totalFixed = 0;

console.log('🔧 Fixing IAS Zone - Using Correct SDK3 Method');
console.log('==============================================\n');
console.log('Replacing clusters[1280] with clusters.iasZone\n');

/**
 * Fix a driver's device.js file to use correct cluster access
 */
function fixDriverDeviceJS(driverPath, driverId) {
  const devicePath = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(devicePath, 'utf8');
    
    // Check if file has IAS Zone code with numeric cluster ID
    if (!content.includes('clusters[1280]')) {
      return false;
    }
    
    console.log(`\n📄 ${driverId}:`);
    console.log(`   Found clusters[1280] usage`);
    
    // Replace all occurrences of clusters[1280] with clusters.iasZone
    const originalContent = content;
    
    // Replace endpoint.clusters[1280] with endpoint.clusters.iasZone
    content = content.replace(/\.clusters\[1280\]/g, '.clusters.iasZone');
    
    // Replace if (!endpoint?.clusters[1280]) with if (!endpoint?.clusters?.iasZone)
    content = content.replace(/if\s*\(\s*!endpoint\?\.clusters\[1280\]\s*\)/g, 'if (!endpoint?.clusters?.iasZone)');
    
    // Replace endpoint?.clusters[1280] with endpoint?.clusters?.iasZone
    content = content.replace(/endpoint\?\.clusters\[1280\]/g, 'endpoint?.clusters?.iasZone');
    
    if (content === originalContent) {
      console.log(`  ℹ️  No changes needed`);
      return false;
    }
    
    // Write back
    fs.writeFileSync(devicePath, content, 'utf8');
    
    console.log(`  ✅ Fixed: clusters[1280] → clusters.iasZone`);
    return true;
    
  } catch (err) {
    console.log(`  ❌ Error fixing: ${err.message}`);
    return false;
  }
}

/**
 * Scan and fix all drivers
 */
function scanAndFixAllDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📁 Found ${drivers.length} drivers\n`);
  console.log('Scanning for IAS Zone with numeric cluster ID...\n');
  
  for (const driverId of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    
    if (fixDriverDeviceJS(driverPath, driverId)) {
      totalFixed++;
    }
  }
}

/**
 * Main execution
 */
function main() {
  scanAndFixAllDrivers();
  
  console.log('\n==============================================');
  console.log('📊 Fix Summary');
  console.log('==============================================\n');
  
  console.log(`Total fixed: ${totalFixed}\n`);
  
  if (totalFixed > 0) {
    console.log('✅ CORRECTED TO USE STANDARD SDK3 METHOD');
    console.log('\nChanges:');
    console.log('- ❌ endpoint.clusters[1280] (numérique - moins lisible)');
    console.log('- ✅ endpoint.clusters.iasZone (nom - plus lisible et standard)');
    console.log('\nLes deux sont valides SDK3, mais .iasZone est préféré.\n');
    console.log('Run validation and commit\n');
    process.exit(0);
  } else {
    console.log('ℹ️  NO FIXES NEEDED - Already using correct method\n');
    process.exit(0);
  }
}

// Run fix
main();
