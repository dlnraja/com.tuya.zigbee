#!/usr/bin/env node
'use strict';

/**
 * Automated SDK v3 Fix Script
 * Applies ALL ChatGPT-5 forum corrections automatically
 * 
 * Fixes:
 * 1. CLUSTER.POWER_CONFIGURATION → 1 (numeric ID)
 * 2. Battery detection .catch() on null
 * 3. IAS Zone getIeeeAddress() → await this.getIeeeAddress()
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../drivers');
let filesFixed = 0;
let changesApplied = 0;

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  let localChanges = 0;
  
  // Fix 1: CLUSTER.POWER_CONFIGURATION → 1
  const clusterPattern = /cluster:\s*CLUSTER\.POWER_CONFIGURATION/g;
  if (clusterPattern.test(content)) {
    content = content.replace(clusterPattern, 'cluster: 1');
    localChanges++;
    console.log(`  ✓ Fixed CLUSTER.POWER_CONFIGURATION → 1`);
  }
  
  // Fix 2: Convert other common CLUSTER constants
  const clusterMap = {
    'CLUSTER.TEMPERATURE_MEASUREMENT': '1026',
    'CLUSTER.RELATIVE_HUMIDITY': '1029',
    'CLUSTER.ILLUMINANCE_MEASUREMENT': '1024',
    'CLUSTER.IAS_ZONE': '1280',
    'CLUSTER.ON_OFF': '6',
    'CLUSTER.LEVEL_CONTROL': '8',
    'CLUSTER.COLOR_CONTROL': '768',
    'CLUSTER.OCCUPANCY_SENSING': '1030',
  };
  
  Object.keys(clusterMap).forEach(oldPattern => {
    const regex = new RegExp(`cluster:\\s*${oldPattern.replace('.', '\\.')}`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `cluster: ${clusterMap[oldPattern]}`);
      localChanges++;
      console.log(`  ✓ Fixed ${oldPattern} → ${clusterMap[oldPattern]}`);
    }
  });
  
  // Fix 3: getCapabilityValue().catch() → safe access
  // This pattern: await this.getCapabilityValue('measure_battery').catch(() => null)
  const catchPattern = /await\s+this\.getCapabilityValue\(([^)]+)\)\.catch\([^)]+\)/g;
  if (catchPattern.test(content)) {
    content = content.replace(
      catchPattern,
      (match, capability) => {
        return `(this.hasCapability(${capability}) ? this.getCapabilityValue(${capability}) : null)`;
      }
    );
    localChanges++;
    console.log(`  ✓ Fixed getCapabilityValue().catch() pattern`);
  }
  
  // Fix 4: IEEE address - getData().ieeeAddress → await this.getIeeeAddress()
  const ieeePattern1 = /const\s+(\w+)\s*=\s*this\.getData\(\)\.ieeeAddress/g;
  if (ieeePattern1.test(content)) {
    content = content.replace(ieeePattern1, 'const $1 = await this.getIeeeAddress()');
    localChanges++;
    console.log(`  ✓ Fixed getData().ieeeAddress → await this.getIeeeAddress()`);
  }
  
  // Fix 5: this.homey.zigbee.getIeeeAddress() → await this.getIeeeAddress()
  const ieeePattern2 = /await\s+this\.homey\.zigbee\.getIeeeAddress\(\)/g;
  if (ieeePattern2.test(content)) {
    content = content.replace(ieeePattern2, 'await this.getIeeeAddress()');
    localChanges++;
    console.log(`  ✓ Fixed this.homey.zigbee.getIeeeAddress() → await this.getIeeeAddress()`);
  }
  
  // Only write if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    filesFixed++;
    changesApplied += localChanges;
    return true;
  }
  
  return false;
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name === 'device.js') {
      // Skip backup files
      if (fullPath.includes('.backup')) continue;
      
      const relativePath = path.relative(DRIVERS_DIR, fullPath);
      console.log(`\n📄 Processing: ${relativePath}`);
      
      if (fixFile(fullPath)) {
        console.log(`  ✅ File updated`);
      } else {
        console.log(`  → No changes needed`);
      }
    }
  }
}

// Run fixes
console.log('🔧 AUTO-FIXING SDK v3 ISSUES\n');
console.log('='.repeat(80));
scanDirectory(DRIVERS_DIR);

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY:');
console.log('='.repeat(80));
console.log(`  Files fixed: ${filesFixed}`);
console.log(`  Changes applied: ${changesApplied}`);
console.log('\n✅ Auto-fix complete!\n');

process.exit(0);
