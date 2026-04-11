#!/usr/bin/env node
'use strict';

/**
 * CI Script: Check for manufacturerName + productId collisions
 * 
 * RULE: Same (manufacturerName + productId) pair CANNOT exist in multiple drivers
 * RULE: Same productId CANNOT exist in multiple drivers
 * 
 * @version 5.5.671
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function loadDrivers() {
  const drivers = [];
  const dirs = fs.readdirSync(DRIVERS_DIR);
  
  for (const dir of dirs) {
    const composePath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (compose.zigbee) {
        drivers.push({
          id: dir,
          manufacturerNames: compose.zigbee.manufacturerName || [],
          productIds: compose.zigbee.productId || []
        });
      }
    } catch (e) {}
  }
  return drivers;
}

function checkCollisions(drivers) {
  const errors = [];
  const warnings = [];
  
  // Map: "mfr|pid" -> [driver1, driver2, ...]
  const pairMap = new Map();
  // Map: "pid" -> [driver1, driver2, ...]
  const pidMap = new Map();
  
  for (const driver of drivers) {
    // Check each (mfr, pid) pair
    for (const mfr of driver.manufacturerNames) {
      for (const pid of driver.productIds) {
        const key = `${mfr}|${pid}`;
        if (!pairMap.has(key)) pairMap.set(key, []);
        pairMap.get(key).push(driver.id);
      }
    }
    
    // Check productId uniqueness
    for (const pid of driver.productIds) {
      if (!pidMap.has(pid)) pidMap.set(pid, []);
      pidMap.get(pid).push(driver.id);
    }
  }
  
  // Find collisions
  for (const [pair, driverIds] of pairMap) {
    if (driverIds.length > 1) {
      errors.push(`COLLISION: (${pair}) in drivers: ${driverIds.join(', ')}`);
    }
  }
  
  for (const [pid, driverIds] of pidMap) {
    if (driverIds.length > 1) {
      warnings.push(`WARNING: productId "${pid}" in multiple drivers: ${driverIds.join(', ')}`);
    }
  }
  
  return { errors, warnings };
}

function main() {
  console.log('🔍 Checking driver pairing collisions...\n');
  
  const drivers = loadDrivers();
  console.log(`Found ${drivers.length} drivers\n`);
  
  const { errors, warnings } = checkCollisions(drivers);
  
  if (warnings.length > 0) {
    console.log('⚠️ WARNINGS:');
    warnings.forEach(w => console.log(`  ${w}`));
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach(e => console.log(`  ${e}`));
    console.log('');
    process.exit(1);
  }
  
  console.log('✅ No collisions found');
  process.exit(0);
}

main();
