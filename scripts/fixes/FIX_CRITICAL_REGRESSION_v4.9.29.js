#!/usr/bin/env node
'use strict';

/**
 * FIX CRITICAL REGRESSION v4.9.29
 * 
 * PROBLÈMES IDENTIFIÉS:
 * 1. ssIasZone au lieu de iasZone (ancien nom)
 * 2. setupIasZone() appelé AVANT super.onNodeInit()
 * 3. .on('event') au lieu de .onEvent = (property assignment)
 * 4. expected_cluster_id_number errors
 * 
 * CORRECTIONS:
 * - Remplacer ssIasZone → iasZone
 * - Déplacer setupIasZone() APRÈS super.onNodeInit()
 * - Utiliser property listeners (.onEvent =)
 * - Messages d'erreur plus gracieux
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let totalFixed = 0;
let issues = [];

console.log('🚨 Fixing Critical Regression v4.9.29');
console.log('======================================\n');

/**
 * Fix IAS Zone cluster name (ssIasZone → iasZone)
 */
function fixIASClusterName(content) {
  let fixed = false;
  
  // Replace ssIasZone with iasZone
  if (content.includes('ssIasZone')) {
    content = content.replace(/ssIasZone/g, 'iasZone');
    fixed = true;
  }
  
  return { content, fixed };
}

/**
 * Fix IAS Zone setup order (move after super.onNodeInit)
 */
function fixSetupOrder(content) {
  let fixed = false;
  
  // Pattern: setupIasZone called before super.onNodeInit
  const beforePattern = /async onNodeInit\(\)\s*\{[^}]*await this\.setupIas[Zz]one\(\);[^}]*await super\.onNodeInit\(\)/s;
  
  if (beforePattern.test(content)) {
    // Move setupIasZone after super.onNodeInit
    content = content.replace(
      /(async onNodeInit\(\)\s*\{)([^}]*)(await this\.setupIas[Zz]one\(\);)([^}]*)(await super\.onNodeInit\(\)[^;]*;)/s,
      '$1$2$5\n    \n    // THEN setup IAS Zone (zclNode now exists)\n    $3'
    );
    fixed = true;
  }
  
  return { content, fixed };
}

/**
 * Fix IAS Zone event listeners (old .on() → new property assignment)
 */
function fixEventListeners(content) {
  let fixed = false;
  
  // Replace .on('zoneStatusChangeNotification', ...) with property assignment
  if (content.includes(".on('zoneStatusChangeNotification'")) {
    content = content.replace(
      /endpoint\.clusters\.iasZone\.on\('zoneStatusChangeNotification',\s*async\s*\(([^)]+)\)\s*=>\s*\{/g,
      'endpoint.clusters.iasZone.onZoneStatusChangeNotification = ($1) => {'
    );
    fixed = true;
  }
  
  // Replace .on('attr.zoneStatus', ...) with property assignment
  if (content.includes(".on('attr.zoneStatus'")) {
    content = content.replace(
      /endpoint\.clusters\.iasZone\.on\('attr\.zoneStatus',\s*async\s*\(([^)]+)\)\s*=>\s*\{/g,
      'endpoint.clusters.iasZone.onZoneStatus = ($1) => {'
    );
    fixed = true;
  }
  
  return { content, fixed };
}

/**
 * Fix error messages (hard error → graceful warning)
 */
function fixErrorMessages(content) {
  let fixed = false;
  
  // Replace hard errors with graceful warnings
  if (content.includes("this.error('IAS Zone cluster not found')")) {
    content = content.replace(
      /this\.error\('IAS Zone cluster not found'\);/g,
      "this.log('ℹ️  IAS Zone cluster not available on this device');"
    );
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
    
    // Fix 1: Cluster name
    const fix1 = fixIASClusterName(content);
    content = fix1.content;
    if (fix1.fixed) {
      driverFixed = true;
      driverIssues.push('ssIasZone → iasZone');
    }
    
    // Fix 2: Setup order
    const fix2 = fixSetupOrder(content);
    content = fix2.content;
    if (fix2.fixed) {
      driverFixed = true;
      driverIssues.push('setupIasZone moved after super.onNodeInit');
    }
    
    // Fix 3: Event listeners
    const fix3 = fixEventListeners(content);
    content = fix3.content;
    if (fix3.fixed) {
      driverFixed = true;
      driverIssues.push('.on() → property assignment');
    }
    
    // Fix 4: Error messages
    const fix4 = fixErrorMessages(content);
    content = fix4.content;
    if (fix4.fixed) {
      driverFixed = true;
      driverIssues.push('Hard errors → graceful warnings');
    }
    
    if (driverFixed) {
      fs.writeFileSync(devicePath, content, 'utf8');
      console.log(`\n📄 ${driverId}:`);
      driverIssues.forEach(issue => console.log(`   ✅ Fixed: ${issue}`));
      issues.push({ driver: driverId, fixes: driverIssues });
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
  console.log('Scanning for regression issues...\n');
  
  for (const driverId of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    if (fixDriver(driverPath, driverId)) {
      totalFixed++;
    }
  }
  
  console.log('\n======================================');
  console.log('📊 Fix Summary');
  console.log('======================================\n');
  
  console.log(`Total drivers fixed: ${totalFixed}\n`);
  
  if (totalFixed > 0) {
    console.log('✅ CRITICAL REGRESSION FIXED');
    console.log('\nIssues corrected:');
    console.log('1. ssIasZone → iasZone (correct SDK3 name)');
    console.log('2. setupIasZone before super.onNodeInit → after');
    console.log('3. .on("event") → .onEvent = (property assignment)');
    console.log('4. Hard errors → Graceful warnings\n');
    console.log('This should fix:');
    console.log('- SOS button losing Zigbee network');
    console.log('- "IAS Zone cluster not found" errors');
    console.log('- "expected_cluster_id_number" errors\n');
    console.log('Run validation and commit\n');
    process.exit(0);
  } else {
    console.log('ℹ️  NO ISSUES FOUND\n');
    process.exit(0);
  }
}

// Run fix
main();
