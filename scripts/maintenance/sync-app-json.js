#!/usr/bin/env node
/**
 * SYNC APP.JSON WITH DRIVER.COMPOSE.JSON FILES
 * 
 * CRITICAL: Run this script before every push/release!
 * 
 * The Homey build process does NOT properly sync app.json:
 * - It doesn't remove old/stale IDs (causes duplicates)
 * - It doesn't add new IDs (causes devices not recognized)
 * 
 * This script performs bidirectional sync:
 * 1. Removes IDs from app.json that don't exist in driver.compose.json
 * 2. Adds IDs from driver.compose.json that are missing in app.json
 * 
 * Usage: node scripts/maintenance/sync-app-json.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const APP_JSON_PATH = path.join(ROOT_DIR, 'app.json');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');

console.log('🔄 SYNC APP.JSON WITH DRIVER.COMPOSE.JSON FILES\n');

// Read app.json
const app = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let totalRemoved = 0;
let totalAdded = 0;
let driversProcessed = 0;

// Process each driver
app.drivers.forEach(driver => {
  const composePath = path.join(DRIVERS_DIR, driver.id, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return; // Skip drivers without compose file
  }
  
  if (!driver.zigbee) {
    return; // Skip non-zigbee drivers
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  driversProcessed++;
  
  // === SYNC MANUFACTURER NAMES ===
  const composeMfrs = compose.zigbee?.manufacturerName || [];
  const appMfrs = driver.zigbee.manufacturerName || [];
  
  // Create case-insensitive sets for comparison
  const composeMfrSet = new Set(composeMfrs.map(m => m.toLowerCase()));
  const appMfrSet = new Set(appMfrs.map(m => m.toLowerCase()));
  
  // Remove stale IDs (in app.json but not in compose)
  const cleanedMfrs = appMfrs.filter(m => composeMfrSet.has(m.toLowerCase()));
  const removedMfrs = appMfrs.length - cleanedMfrs.length;
  
  // Add missing IDs (in compose but not in app.json)
  const missingMfrs = composeMfrs.filter(m => !appMfrSet.has(m.toLowerCase()));
  
  if (removedMfrs > 0 || missingMfrs.length > 0) {
    driver.zigbee.manufacturerName = [...cleanedMfrs, ...missingMfrs];
    
    if (removedMfrs > 0) {
      console.log(`  ${driver.id}: -${removedMfrs} stale mfrs`);
      totalRemoved += removedMfrs;
    }
    if (missingMfrs.length > 0) {
      console.log(`  ${driver.id}: +${missingMfrs.length} missing mfrs`);
      totalAdded += missingMfrs.length;
    }
  }
  
  // === SYNC PRODUCT IDS ===
  const composePids = compose.zigbee?.productId || [];
  const appPids = driver.zigbee.productId || [];
  
  const composePidSet = new Set(composePids.map(p => p.toLowerCase()));
  const appPidSet = new Set(appPids.map(p => p.toLowerCase()));
  
  // Remove stale productIds
  const cleanedPids = appPids.filter(p => composePidSet.has(p.toLowerCase()));
  const removedPids = appPids.length - cleanedPids.length;
  
  // Add missing productIds
  const missingPids = composePids.filter(p => !appPidSet.has(p.toLowerCase()));
  
  if (removedPids > 0 || missingPids.length > 0) {
    driver.zigbee.productId = [...cleanedPids, ...missingPids];
    
    if (removedPids > 0) {
      console.log(`  ${driver.id}: -${removedPids} stale pids`);
      totalRemoved += removedPids;
    }
    if (missingPids.length > 0) {
      console.log(`  ${driver.id}: +${missingPids.length} missing pids`);
      totalAdded += missingPids.length;
    }
  }
});

// Write back to app.json
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(app, null, 2));

console.log('\n=== SYNC COMPLETE ===');
console.log(`Drivers processed: ${driversProcessed}`);
console.log(`Total removed (stale): ${totalRemoved}`);
console.log(`Total added (missing): ${totalAdded}`);

if (totalRemoved > 0 || totalAdded > 0) {
  console.log('\n✅ app.json has been updated!');
  process.exit(0);
} else {
  console.log('\n✅ app.json already in sync - no changes needed');
  process.exit(0);
}
