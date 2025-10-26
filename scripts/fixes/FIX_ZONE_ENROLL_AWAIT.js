#!/usr/bin/env node
'use strict';

/**
 * FIX ZONE ENROLL AWAIT
 * 
 * PROBLÈME CRITIQUE: zoneEnrollResponse sans await cause app crash
 * 
 * ERREUR:
 * "Error: Impossible de joindre l'appareil. Est-il allumé ?"
 * unhandledRejection -> APP CRASH
 * 
 * CAUSE:
 * zoneEnrollResponse() retourne une Promise
 * Sans await, try/catch ne peut pas attraper l'erreur
 * Promise rejection devient unhandledRejection
 * 
 * SOLUTION:
 * Ajouter await devant TOUS les zoneEnrollResponse()
 * pour que try/catch puisse gérer les erreurs
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let totalFixed = 0;

console.log('🔧 Fixing Zone Enroll Await - Prevent App Crash');
console.log('================================================\n');

/**
 * Fix zoneEnrollResponse calls to use await
 */
function fixZoneEnrollAwait(content) {
  let fixed = false;
  
  // Pattern: zoneEnrollResponse NOT preceded by await
  // Negative lookbehind to ensure await is not already there
  const pattern = /(?<!await\s)endpoint\.clusters\.iasZone\.zoneEnrollResponse\(/g;
  
  if (pattern.test(content)) {
    // Reset regex and replace
    content = content.replace(/(?<!await\s)endpoint\.clusters\.iasZone\.zoneEnrollResponse\(/g, 
      'await endpoint.clusters.iasZone.zoneEnrollResponse(');
    fixed = true;
  }
  
  return { content, fixed };
}

/**
 * Scan and fix a driver
 */
function fixDriver(driverPath, driverId) {
  const devicePath = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(devicePath, 'utf8');
    
    // Check if file has zoneEnrollResponse
    if (!content.includes('zoneEnrollResponse')) {
      return false;
    }
    
    const originalContent = content;
    
    // Fix await
    const result = fixZoneEnrollAwait(content);
    content = result.content;
    
    if (result.fixed) {
      fs.writeFileSync(devicePath, content, 'utf8');
      console.log(`✅ ${driverId}: Added await to zoneEnrollResponse`);
      return true;
    }
    
    return false;
    
  } catch (err) {
    console.log(`❌ ${driverId}: Error - ${err.message}`);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📁 Found ${drivers.length} drivers\n`);
  console.log('Scanning for zoneEnrollResponse without await...\n');
  
  for (const driverId of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    if (fixDriver(driverPath, driverId)) {
      totalFixed++;
    }
  }
  
  console.log('\n================================================');
  console.log('📊 Fix Summary');
  console.log('================================================\n');
  
  console.log(`Total drivers fixed: ${totalFixed}\n`);
  
  if (totalFixed > 0) {
    console.log('✅ ZONE ENROLL AWAIT FIXED');
    console.log('\nChange:');
    console.log('❌ OLD: endpoint.clusters.iasZone.zoneEnrollResponse({...})');
    console.log('✅ NEW: await endpoint.clusters.iasZone.zoneEnrollResponse({...})');
    console.log('\nThis prevents:');
    console.log('- App crashes from unhandledRejection');
    console.log('- "Impossible de joindre l\'appareil" crashes');
    console.log('- Try/catch now properly handles errors');
    console.log('- Graceful handling of sleeping devices\n');
    console.log('Run validation and commit\n');
    process.exit(0);
  } else {
    console.log('ℹ️  NO FIXES NEEDED\n');
    process.exit(0);
  }
}

// Run fix
main();
