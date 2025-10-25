#!/usr/bin/env node
'use strict';

/**
 * FIX SETUP ORDER FOR ALL DRIVERS
 * 
 * PROBLÈME CRITIQUE: setup*() appelé AVANT super.onNodeInit()
 * 
 * CAUSE: zclNode n'existe pas encore avant super.onNodeInit()
 * 
 * ERREURS RÉSULTANTES:
 * - "expected_cluster_id_number"
 * - "IAS Zone cluster not found"
 * - registerCapability fails
 * - endpoint.clusters undefined
 * 
 * SOLUTION: Déplacer TOUS les setup*() APRÈS super.onNodeInit()
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let totalFixed = 0;

console.log('🔧 Fixing Setup Order - ALL Drivers');
console.log('====================================\n');

/**
 * Fix setup order in device.js
 */
function fixSetupOrder(content) {
  let fixed = false;
  
  // Pattern 1: setupMultiEndpoint before super.onNodeInit
  const pattern1 = /async onNodeInit\(\)\s*\{([^}]*)(await this\.setupMultiEndpoint\(\);)([^}]*)(await super\.onNodeInit\(\)[^;]*;)/s;
  
  if (pattern1.test(content)) {
    content = content.replace(pattern1, (match, before, setupCall, between, superCall) => {
      // Remove the setup call from before
      const cleanedBefore = before.replace(/\s*\/\/[^\n]*Multi-endpoint[^\n]*\n/gi, '');
      
      return `async onNodeInit() {${cleanedBefore}${superCall}\n    \n    // THEN setup multi-endpoint (zclNode now exists)\n    ${setupCall}${between}`;
    });
    fixed = true;
  }
  
  // Pattern 2: setupIasZone before super.onNodeInit
  const pattern2 = /async onNodeInit\(\)\s*\{([^}]*)(await this\.setupIas[Zz]one\(\);)([^}]*)(await super\.onNodeInit\(\)[^;]*;)/s;
  
  if (pattern2.test(content)) {
    content = content.replace(pattern2, (match, before, setupCall, between, superCall) => {
      // Remove the setup call from before
      const cleanedBefore = before.replace(/\s*\/\/[^\n]*IAS[^\n]*\n/gi, '');
      
      return `async onNodeInit() {${cleanedBefore}${superCall}\n    \n    // THEN setup IAS Zone (zclNode now exists)\n    ${setupCall}${between}`;
    });
    fixed = true;
  }
  
  // Pattern 3: Any setup* before super.onNodeInit
  const pattern3 = /async onNodeInit\(\)\s*\{([^}]*)(await this\.setup[A-Z][a-zA-Z]*\(\);)([^}]*)(await super\.onNodeInit\(\)[^;]*;)/s;
  
  if (pattern3.test(content) && !fixed) {
    content = content.replace(pattern3, (match, before, setupCall, between, superCall) => {
      return `async onNodeInit() {${before}${superCall}\n    \n    // THEN setup (zclNode now exists)\n    ${setupCall}${between}`;
    });
    fixed = true;
  }
  
  return { content, fixed };
}

/**
 * Fix await in property listeners
 */
function fixAwaitInListeners(content) {
  let fixed = false;
  
  // Remove await from property assignment listeners
  const awaitPattern = /(\w+\.on[A-Z]\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[^}]*?)await\s+(this\.setCapabilityValue)/g;
  
  if (awaitPattern.test(content)) {
    content = content.replace(awaitPattern, '$1$2');
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
    const originalContent = content;
    let driverFixed = false;
    let driverIssues = [];
    
    // Fix 1: Setup order
    const fix1 = fixSetupOrder(content);
    content = fix1.content;
    if (fix1.fixed) {
      driverFixed = true;
      driverIssues.push('setup*() moved after super.onNodeInit()');
    }
    
    // Fix 2: Await in listeners
    const fix2 = fixAwaitInListeners(content);
    content = fix2.content;
    if (fix2.fixed) {
      driverFixed = true;
      driverIssues.push('await removed from property listeners');
    }
    
    if (driverFixed) {
      fs.writeFileSync(devicePath, content, 'utf8');
      console.log(`\n📄 ${driverId}:`);
      driverIssues.forEach(issue => console.log(`   ✅ Fixed: ${issue}`));
      return true;
    }
    
    return false;
    
  } catch (err) {
    console.log(`\n❌ ${driverId}: Error - ${err.message}`);
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
  console.log('Scanning for setup order issues...\n');
  
  for (const driverId of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    if (fixDriver(driverPath, driverId)) {
      totalFixed++;
    }
  }
  
  console.log('\n====================================');
  console.log('📊 Fix Summary');
  console.log('====================================\n');
  
  console.log(`Total drivers fixed: ${totalFixed}\n`);
  
  if (totalFixed > 0) {
    console.log('✅ SETUP ORDER FIXED');
    console.log('\nCorrections:');
    console.log('1. setup*() now called AFTER super.onNodeInit()');
    console.log('2. await removed from property listeners');
    console.log('\nThis fixes:');
    console.log('- "expected_cluster_id_number" errors');
    console.log('- "IAS Zone cluster not found" errors');
    console.log('- "await is only valid in async functions" errors');
    console.log('- registerCapability failures');
    console.log('- endpoint.clusters undefined errors\n');
    console.log('Run validation and commit\n');
    process.exit(0);
  } else {
    console.log('ℹ️  NO ISSUES FOUND\n');
    process.exit(0);
  }
}

// Run fix
main();
