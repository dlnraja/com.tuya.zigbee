#!/usr/bin/env node
'use strict';

/**
 * FIX ALL NUMERIC CLUSTER IDS TO CLUSTER CONSTANTS
 * 
 * SDK3 requires using CLUSTER constants from zigbee-clusters
 * This script automatically converts all numeric IDs to proper constants
 */

const fs = require('fs');
const path = require('path');

// Mapping of numeric IDs to CLUSTER constants
const CLUSTER_MAP = {
  // Basic clusters
  '0': 'CLUSTER.BASIC',
  '1': 'CLUSTER.POWER_CONFIGURATION',
  '3': 'CLUSTER.IDENTIFY',
  '6': 'CLUSTER.ON_OFF',
  '8': 'CLUSTER.LEVEL_CONTROL',
  
  // Measurement clusters
  '1024': 'CLUSTER.ILLUMINANCE_MEASUREMENT',
  '1026': 'CLUSTER.TEMPERATURE_MEASUREMENT',
  '1027': 'CLUSTER.PRESSURE_MEASUREMENT',
  '1029': 'CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT',
  
  // IAS Zone
  '1280': 'CLUSTER.IAS_ZONE',
  
  // HVAC
  '513': 'CLUSTER.THERMOSTAT',
  '516': 'CLUSTER.FAN_CONTROL',
  
  // Lighting
  '768': 'CLUSTER.COLOR_CONTROL',
  
  // Smart Energy
  '1794': 'CLUSTER.METERING',
  '2820': 'CLUSTER.ELECTRICAL_MEASUREMENT',
  
  // Window Covering
  '258': 'CLUSTER.WINDOW_COVERING',
  
  // Door Lock
  '257': 'CLUSTER.DOOR_LOCK'
};

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Pattern 1: registerCapability('xxx', NUMBER, {
    for (const [numId, clusterConst] of Object.entries(CLUSTER_MAP)) {
      const regex1 = new RegExp(
        `(registerCapability\\([^,]+,\\s*)${numId}(\\s*,)`,
        'g'
      );
      if (regex1.test(content)) {
        content = content.replace(regex1, `$1${clusterConst}$2`);
        modified = true;
        console.log(`  ✅ ${path.basename(filePath)}: ${numId} → ${clusterConst}`);
      }
    }
    
    // Pattern 2: cluster: NUMBER, (in configureAttributeReporting)
    for (const [numId, clusterConst] of Object.entries(CLUSTER_MAP)) {
      const regex2 = new RegExp(
        `(cluster:\\s*)${numId}(\\s*,)`,
        'g'
      );
      if (regex2.test(content)) {
        content = content.replace(regex2, `$1${clusterConst}$2`);
        modified = true;
        console.log(`  ✅ ${path.basename(filePath)}: cluster: ${numId} → ${clusterConst}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return 1;
    }
    return 0;
  } catch (err) {
    console.error(`  ❌ Error processing ${filePath}:`, err.message);
    return 0;
  }
}

function scanDirectory(dir) {
  let fixedCount = 0;
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        fixedCount += scanDirectory(fullPath);
      } else if (item === 'device.js') {
        // Process device.js files
        fixedCount += fixFile(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dir}:`, err.message);
  }
  
  return fixedCount;
}

// Main execution
console.log('🔧 FIXING ALL NUMERIC CLUSTER IDS TO CLUSTER CONSTANTS\n');
console.log('SDK3 Requirement: Use CLUSTER.* from zigbee-clusters\n');
console.log('─'.repeat(60));

const driversPath = path.join(process.cwd(), 'drivers');

if (!fs.existsSync(driversPath)) {
  console.error('❌ drivers/ directory not found!');
  process.exit(1);
}

console.log(`Scanning: ${driversPath}\n`);

const fixedCount = scanDirectory(driversPath);

console.log('\n' + '─'.repeat(60));
console.log(`\n✅ COMPLETED: ${fixedCount} files modified`);
console.log('\nNext steps:');
console.log('1. Run: homey app validate --level publish');
console.log('2. Test affected drivers');
console.log('3. Commit changes\n');

process.exit(0);
