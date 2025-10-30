#!/usr/bin/env node
'use strict';

/**
 * Intelligent Manufacturer Merge
 * Merges manufacturers from history with current drivers without duplicates
 */

const fs = require('fs');
const path = require('path');

const historyPath = path.join(__dirname, '..', 'reports', 'manufacturers-from-history.json');
const driversDir = path.join(__dirname, '..', 'drivers');

if (!fs.existsSync(historyPath)) {
  console.log('❌ Run recover-manufacturers-from-history.js first!');
  process.exit(1);
}

const historyDB = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
console.log('🔄 Merging manufacturers intelligently...\n');

let merged = 0;
let added = 0;
let skipped = 0;

Object.keys(historyDB).forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  ${driverName}: Driver not found (archived?)`);
    skipped++;
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    if (!compose.zigbee) {
      console.log(`⚠️  ${driverName}: No zigbee config`);
      skipped++;
      return;
    }
    
    // Get current manufacturers
    const current = new Set(
      Array.isArray(compose.zigbee.manufacturerName) 
        ? compose.zigbee.manufacturerName 
        : []
    );
    
    // Get historical manufacturers
    const historical = new Set(historyDB[driverName] || []);
    
    // Merge without duplicates
    const beforeCount = current.size;
    historical.forEach(mfg => current.add(mfg));
    const afterCount = current.size;
    const addedCount = afterCount - beforeCount;
    
    if (addedCount > 0) {
      compose.zigbee.manufacturerName = Array.from(current).sort();
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
      
      console.log(`✅ ${driverName}: +${addedCount} manufacturers (${beforeCount} → ${afterCount})`);
      merged++;
      added += addedCount;
    } else {
      console.log(`✓  ${driverName}: Already complete (${current.size} manufacturers)`);
    }
    
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}`);
    skipped++;
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 MERGE RESULTS');
console.log('='.repeat(80));
console.log(`Drivers merged: ${merged}`);
console.log(`Manufacturers added: ${added}`);
console.log(`Drivers skipped: ${skipped}`);
console.log('='.repeat(80));

process.exit(0);
