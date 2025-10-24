#!/usr/bin/env node
'use strict';

/**
 * FIX v3.0.2 CRITICAL BUGS
 * 
 * Corrige automatiquement les bugs critiques identifiés:
 * 1. Cluster ID errors (TypeError: Cannot read properties of undefined)
 * 2. Duplicate settings groups
 * 3. Missing capabilities in smart plugs
 * 
 * Usage: node scripts/fixes/fix-v3.0.2-critical-bugs.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 FIX v3.0.2 - CRITICAL BUGS\n');

let stats = {
  driversScanned: 0,
  clusterIDFixed: 0,
  duplicateSettingsRemoved: 0,
  capabilitiesAdded: 0,
  filesModified: 0
};

// =============================================================================
// FIX 1: CLUSTER ID ERRORS
// =============================================================================

function fixClusterIDErrors(deviceJsPath) {
  let content = fs.readFileSync(deviceJsPath, 'utf8');
  let modified = false;
  
  // Map common cluster errors
  const clusterFixes = {
    // Humidity cluster
    'CLUSTER.RELATIVE_HUMIDITY': '1029',
    'CLUSTER.relativeHumidity': '1029',
    'clusters.relativeHumidity': '1029',
    
    // Temperature cluster  
    'CLUSTER.TEMPERATURE_MEASUREMENT': '1026',
    'CLUSTER.temperatureMeasurement': '1026',
    'clusters.temperatureMeasurement': '1026',
    
    // Illuminance cluster
    'CLUSTER.ILLUMINANCE_MEASUREMENT': '1024',
    'CLUSTER.illuminanceMeasurement': '1024',
    'clusters.illuminanceMeasurement': '1024',
    
    // Power cluster
    'CLUSTER.POWER_CONFIGURATION': '1',
    'CLUSTER.powerConfiguration': '1',
    'clusters.powerConfiguration': '1',
    
    // IAS Zone cluster
    'CLUSTER.IAS_ZONE': '1280',
    'CLUSTER.iasZone': '1280',
    'clusters.iasZone': '1280',
    
    // Basic cluster
    'CLUSTER.BASIC': '0',
    'clusters.basic': '0',
    
    // Identify cluster
    'CLUSTER.IDENTIFY': '3',
    'clusters.identify': '3'
  };
  
  for (const [wrong, correct] of Object.entries(clusterFixes)) {
    if (content.includes(wrong)) {
      // Fix in registerCapability calls
      const regex1 = new RegExp(`registerCapability\\(([^,]+),\\s*${String(wrong).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      if (regex1.test(content)) {
        content = String(content).replace(regex1, `registerCapability($1, ${correct}`);
        modified = true;
        console.log(`  ✅ Fixed: ${wrong} → ${correct}`);
      }
      
      // Fix in cluster references
      const regex2 = new RegExp(`cluster:\\s*${String(wrong).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      if (regex2.test(content)) {
        content = String(content).replace(regex2, `cluster: ${correct}`);
        modified = true;
        console.log(`  ✅ Fixed: cluster: ${wrong} → ${correct}`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(deviceJsPath, content, 'utf8');
    stats.clusterIDFixed++;
  }
  
  return modified;
}

// =============================================================================
// FIX 2: DUPLICATE SETTINGS GROUPS
// =============================================================================

function fixDuplicateSettings(composeJsonPath) {
  let content = fs.readFileSync(composeJsonPath, 'utf8');
  let compose = JSON.parse(content);
  
  if (!compose.settings || !Array.isArray(compose.settings)) {
    return false;
  }
  
  // Track seen group labels
  const seenGroups = new Map();
  const uniqueSettings = [];
  let duplicatesRemoved = 0;
  
  for (const setting of compose.settings) {
    if (setting.type === 'group') {
      const label = JSON.stringify(setting.label);
      
      if (seenGroups.has(label)) {
        // Merge children if not already present
        const existingGroup = seenGroups.get(label);
        if (setting.children && existingGroup.children) {
          for (const child of setting.children) {
            const childId = child.id;
            if (!existingGroup.children.find(c => c.id === childId)) {
              existingGroup.children.push(child);
            }
          }
        }
        duplicatesRemoved++;
        console.log(`  ✅ Removed duplicate group: ${setting.label.en || setting.label}`);
      } else {
        seenGroups.set(label, setting);
        uniqueSettings.push(setting);
      }
    } else {
      uniqueSettings.push(setting);
    }
  }
  
  if (duplicatesRemoved > 0) {
    compose.settings = uniqueSettings;
    fs.writeFileSync(composeJsonPath, JSON.stringify(compose, null, 2), 'utf8');
    stats.duplicateSettingsRemoved += duplicatesRemoved;
    return true;
  }
  
  return false;
}

// =============================================================================
// FIX 3: MISSING CAPABILITIES IN SMART PLUGS
// =============================================================================

function fixMissingCapabilities(composeJsonPath, driverName) {
  // Only for smart plug drivers
  if (!driverName.includes('plug') && !driverName.includes('socket') && !driverName.includes('outlet')) {
    return false;
  }
  
  let content = fs.readFileSync(composeJsonPath, 'utf8');
  let compose = JSON.parse(content);
  
  if (!compose.capabilities || !Array.isArray(compose.capabilities)) {
    return false;
  }
  
  let modified = false;
  const requiredCapabilities = {
    // Smart plugs with AC power should have:
    'measure_power': 'Power consumption (W)',
    'meter_power': 'Energy meter (kWh)',
    'measure_voltage': 'Voltage (V)',
    'measure_current': 'Current (A)'
  };
  
  // Check if it's AC powered (not battery)
  if (driverName.includes('battery') || driverName.includes('cr2032')) {
    return false; // Battery powered don't need energy monitoring
  }
  
  // Check if already has onoff (basic requirement for smart plug)
  if (!compose.capabilities.includes('onoff')) {
    return false; // Not a controllable plug
  }
  
  // Add missing capabilities
  for (const [capability, description] of Object.entries(requiredCapabilities)) {
    if (!compose.capabilities.includes(capability)) {
      // Add after onoff if it exists
      const onoffIndex = compose.capabilities.indexOf('onoff');
      if (onoffIndex >= 0) {
        compose.capabilities.splice(onoffIndex + 1, 0, capability);
        console.log(`  ✅ Added capability: ${capability} (${description})`);
        modified = true;
        stats.capabilitiesAdded++;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(composeJsonPath, JSON.stringify(compose, null, 2), 'utf8');
  }
  
  return modified;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

console.log('🔍 Scanning drivers...\n');

const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory())
  .filter(d => !d.startsWith('.'));

for (const driverName of drivers) {
  stats.driversScanned++;
  const driverDir = path.join(DRIVERS_DIR, driverName);
  
  // Check for device.js (cluster ID errors)
  const deviceJsPath = path.join(driverDir, 'device.js');
  if (fs.existsSync(deviceJsPath)) {
    if (fixClusterIDErrors(deviceJsPath)) {
      console.log(`\n📝 ${driverName}: device.js`);
      stats.filesModified++;
    }
  }
  
  // Check for driver.compose.json (settings, capabilities)
  const composeJsonPath = path.join(driverDir, 'driver.compose.json');
  if (fs.existsSync(composeJsonPath)) {
    let composeMod = false;
    
    // Fix duplicate settings
    if (fixDuplicateSettings(composeJsonPath)) {
      if (!composeMod) {
        console.log(`\n📝 ${driverName}: driver.compose.json`);
        composeMod = true;
      }
      stats.filesModified++;
    }
    
    // Fix missing capabilities
    if (fixMissingCapabilities(composeJsonPath, driverName)) {
      if (!composeMod) {
        console.log(`\n📝 ${driverName}: driver.compose.json`);
        composeMod = true;
      }
      stats.filesModified++;
    }
  }
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 FIX SUMMARY');
console.log('='.repeat(80));
console.log(`Drivers scanned:           ${stats.driversScanned}`);
console.log(`Cluster ID errors fixed:   ${stats.clusterIDFixed}`);
console.log(`Duplicate settings removed: ${stats.duplicateSettingsRemoved}`);
console.log(`Capabilities added:        ${stats.capabilitiesAdded}`);
console.log(`Files modified:            ${stats.filesModified}`);
console.log('='.repeat(80));

if (stats.filesModified > 0) {
  console.log('\n✅ FIXES APPLIED SUCCESSFULLY');
  console.log('\n📋 NEXT STEPS:');
  console.log('   1. homey app validate --level publish');
  console.log('   2. Test affected drivers');
  console.log('   3. git add -A && git commit -m "fix: v3.0.2 critical bugs"');
  console.log('   4. git push origin master');
  process.exit(0);
} else {
  console.log('\nℹ️  No fixes needed or already applied');
  process.exit(0);
}
