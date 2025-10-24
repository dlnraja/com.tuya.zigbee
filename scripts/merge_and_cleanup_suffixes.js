#!/usr/bin/env node
'use strict';

/**
 * Intelligent Merge & Cleanup
 * Merges old energy-suffix drivers with new unified drivers
 * Deletes duplicates, keeps the best version
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');
const remainingFile = path.join(__dirname, '../REMAINING_ENERGY_SUFFIXES.json');

const remaining = JSON.parse(fs.readFileSync(remainingFile, 'utf-8'));

let stats = {
  deleted: [],
  merged: [],
  kept: [],
  errors: []
};

function getManufacturerCount(driverName) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return 0;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    if (compose.zigbee && compose.zigbee.manufacturerName) {
      return Array.isArray(compose.zigbee.manufacturerName) 
        ? compose.zigbee.manufacturerName.length 
        : 1;
    }
  } catch (err) {
    return 0;
  }
  return 0;
}

function mergeManufacturerIds(targetDriver, sourceDriver) {
  const targetPath = path.join(driversDir, targetDriver, 'driver.compose.json');
  const sourcePath = path.join(driversDir, sourceDriver, 'driver.compose.json');
  
  if (!fs.existsSync(targetPath) || !fs.existsSync(sourcePath)) {
    return false;
  }
  
  try {
    const targetCompose = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    const sourceCompose = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
    
    // Merge manufacturer names
    const targetNames = Array.isArray(targetCompose.zigbee?.manufacturerName) 
      ? targetCompose.zigbee.manufacturerName 
      : [targetCompose.zigbee?.manufacturerName].filter(Boolean);
    
    const sourceNames = Array.isArray(sourceCompose.zigbee?.manufacturerName) 
      ? sourceCompose.zigbee.manufacturerName 
      : [sourceCompose.zigbee?.manufacturerName].filter(Boolean);
    
    // Merge product IDs
    const targetIds = Array.isArray(targetCompose.zigbee?.productId) 
      ? targetCompose.zigbee.productId 
      : [targetCompose.zigbee?.productId].filter(Boolean);
    
    const sourceIds = Array.isArray(sourceCompose.zigbee?.productId) 
      ? sourceCompose.zigbee.productId 
      : [sourceCompose.zigbee?.productId].filter(Boolean);
    
    // Combine and deduplicate
    const allNames = [...new Set([...targetNames, ...sourceNames])];
    const allIds = [...new Set([...targetIds, ...sourceIds])];
    
    // Update target
    if (!targetCompose.zigbee) targetCompose.zigbee = {};
    targetCompose.zigbee.manufacturerName = allNames;
    targetCompose.zigbee.productId = allIds.length > 0 ? allIds : ['default'];
    
    // Write back
    fs.writeFileSync(targetPath, JSON.stringify(targetCompose, null, 2));
    
    return true;
  } catch (err) {
    console.error(`   Error merging: ${err.message}`);
    return false;
  }
}

function deleteDriver(driverName) {
  const driverPath = path.join(driversDir, driverName);
  
  try {
    // Delete recursively
    fs.rmSync(driverPath, { recursive: true, force: true });
    return true;
  } catch (err) {
    console.error(`   Error deleting ${driverName}: ${err.message}`);
    return false;
  }
}

function processDriver(driver) {
  const { name, baseName } = driver;
  const unifiedExists = fs.existsSync(path.join(driversDir, baseName));
  
  console.log(`\n🔍 Processing: ${name}`);
  console.log(`   Base name: ${baseName}`);
  console.log(`   Unified exists: ${unifiedExists ? 'YES' : 'NO'}`);
  
  const oldCount = getManufacturerCount(name);
  const newCount = getManufacturerCount(baseName);
  
  console.log(`   Old driver manufacturers: ${oldCount}`);
  console.log(`   New driver manufacturers: ${newCount}`);
  
  if (unifiedExists) {
    // Unified driver exists - merge and delete old
    console.log(`   ➡️  Action: MERGE & DELETE`);
    
    if (mergeManufacturerIds(baseName, name)) {
      console.log(`   ✅ Merged manufacturer IDs`);
      
      if (deleteDriver(name)) {
        console.log(`   ✅ Deleted old driver`);
        stats.merged.push({ old: name, new: baseName });
      } else {
        console.log(`   ❌ Failed to delete`);
        stats.errors.push({ driver: name, reason: 'Delete failed' });
      }
    } else {
      console.log(`   ❌ Failed to merge`);
      stats.errors.push({ driver: name, reason: 'Merge failed' });
    }
  } else {
    // No unified driver - keep old one (it IS the unified one)
    console.log(`   ➡️  Action: KEEP (is unified driver)`);
    stats.kept.push(name);
  }
}

function cleanup() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   INTELLIGENT MERGE & CLEANUP');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📦 Processing ${remaining.length} drivers with suffixes...\n`);
  
  for (const driver of remaining) {
    processDriver(driver);
  }
  
  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('   CLEANUP SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Merged & Deleted: ${stats.merged.length}`);
  console.log(`📦 Kept (unified): ${stats.kept.length}`);
  console.log(`❌ Errors: ${stats.errors.length}`);
  
  if (stats.merged.length > 0) {
    console.log('\n🗑️  Deleted drivers:');
    for (const item of stats.merged) {
      console.log(`   - ${item.old} → ${item.new}`);
    }
  }
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const err of stats.errors) {
      console.log(`   - ${err.driver}: ${err.reason}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  // Save report
  fs.writeFileSync(
    path.join(__dirname, '../CLEANUP_REPORT.json'),
    JSON.stringify(stats, null, 2)
  );
  
  console.log('✅ Cleanup report saved to CLEANUP_REPORT.json\n');
}

// Run cleanup
cleanup();
