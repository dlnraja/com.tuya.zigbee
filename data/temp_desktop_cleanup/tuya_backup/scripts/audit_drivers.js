#!/usr/bin/env node
/**
 * DRIVER AUDIT SCRIPT - Anti-Zigbee-Generic Check
 * Scans all drivers for potential issues that could cause devices to pair as "zigbee generic"
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');
const issues = [];
const mfrMap = new Map(); // manufacturerName -> [{ driver, productIds }]
const productIdMap = new Map(); // productId -> [drivers]

// Scan all drivers
const drivers = fs.readdirSync(driversDir).filter(d => {
  const driverPath = path.join(driversDir, d, 'driver.compose.json');
  return fs.existsSync(driverPath);
});

console.log(`\n🔍 DRIVER AUDIT - Scanning ${drivers.length} drivers...\n`);
console.log('═'.repeat(70));

for (const driver of drivers) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const zigbee = compose.zigbee || {};
    const mfrNames = zigbee.manufacturerName || [];
    const productIds = zigbee.productId || [];
    const endpoints = zigbee.endpoints || {};
    
    // Check 1: Empty manufacturerName
    if (mfrNames.length === 0) {
      issues.push({ driver, severity: 'HIGH', issue: 'No manufacturerName defined - will never match' });
    }
    
    // Check 2: Empty productId
    if (productIds.length === 0) {
      issues.push({ driver, severity: 'MEDIUM', issue: 'No productId defined - relies on mfrName only' });
    }
    
    // Check 3: Minimal endpoints (only cluster 0)
    const ep1Clusters = endpoints['1']?.clusters || [];
    if (ep1Clusters.length <= 1 && ep1Clusters[0] === 0) {
      // This is OK for permissive matching
    }
    
    // Track mfrName usage
    for (const mfr of mfrNames) {
      if (!mfrMap.has(mfr)) mfrMap.set(mfr, []);
      mfrMap.get(mfr).push({ driver, productIds });
    }
    
    // Track productId usage
    for (const pid of productIds) {
      if (!productIdMap.has(pid)) productIdMap.set(pid, []);
      productIdMap.get(pid).push(driver);
    }
    
  } catch (e) {
    issues.push({ driver, severity: 'ERROR', issue: `Parse error: ${e.message}` });
  }
}

// Check for manufacturerName conflicts (same mfr+productId in multiple drivers)
console.log('\n📊 MANUFACTURERNAME ANALYSIS\n');
console.log('─'.repeat(70));

let conflictCount = 0;
for (const [mfr, entries] of mfrMap) {
  if (entries.length > 1) {
    // Check if productIds overlap
    const allProductIds = entries.flatMap(e => e.productIds);
    const uniqueProductIds = [...new Set(allProductIds)];
    
    if (allProductIds.length !== uniqueProductIds.length) {
      // Potential conflict - same productId in multiple drivers
      console.log(`⚠️  ${mfr}`);
      for (const entry of entries) {
        console.log(`   └─ ${entry.driver}: [${entry.productIds.slice(0, 5).join(', ')}${entry.productIds.length > 5 ? '...' : ''}]`);
      }
      conflictCount++;
    }
  }
}

if (conflictCount === 0) {
  console.log('✅ No manufacturerName+productId conflicts detected');
}

// Report issues
console.log('\n🚨 ISSUES FOUND\n');
console.log('─'.repeat(70));

const highIssues = issues.filter(i => i.severity === 'HIGH');
const mediumIssues = issues.filter(i => i.severity === 'MEDIUM');

if (highIssues.length > 0) {
  console.log('\n❌ HIGH SEVERITY:');
  for (const i of highIssues) {
    console.log(`   ${i.driver}: ${i.issue}`);
  }
}

if (mediumIssues.length > 0) {
  console.log('\n⚠️  MEDIUM SEVERITY:');
  for (const i of mediumIssues) {
    console.log(`   ${i.driver}: ${i.issue}`);
  }
}

if (issues.length === 0) {
  console.log('✅ No critical issues found');
}

// universal_fallback check
console.log('\n🛡️  UNIVERSAL_FALLBACK STATUS\n');
console.log('─'.repeat(70));

const fallbackPath = path.join(driversDir, 'universal_fallback', 'driver.compose.json');
if (fs.existsSync(fallbackPath)) {
  const fallback = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
  const mfr = fallback.zigbee?.manufacturerName || [];
  const pids = fallback.zigbee?.productId || [];
  console.log(`✅ universal_fallback exists`);
  console.log(`   manufacturerName prefixes: ${mfr.length}`);
  console.log(`   productId patterns: ${pids.length}`);
  
  // Check for Tuya prefixes
  const tuyaPrefixes = ['_TZE200_', '_TZE204_', '_TZE284_', '_TZ3000_', '_TZ3210_'];
  const hasTuyaPrefixes = tuyaPrefixes.every(p => mfr.includes(p));
  if (hasTuyaPrefixes) {
    console.log(`   ✅ All Tuya prefixes covered`);
  } else {
    console.log(`   ⚠️  Missing some Tuya prefixes`);
  }
} else {
  console.log('❌ universal_fallback MISSING - CRITICAL');
}

// Summary
console.log('\n' + '═'.repeat(70));
console.log('📋 SUMMARY');
console.log('═'.repeat(70));
console.log(`Total drivers: ${drivers.length}`);
console.log(`High severity issues: ${highIssues.length}`);
console.log(`Medium severity issues: ${mediumIssues.length}`);
console.log(`ManufacturerName conflicts: ${conflictCount}`);
console.log('═'.repeat(70) + '\n');
