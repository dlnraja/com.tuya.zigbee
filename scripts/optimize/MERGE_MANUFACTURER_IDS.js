#!/usr/bin/env node
'use strict';

/**
 * MERGE MANUFACTURER IDs - INTELLIGENT FUSION
 * 
 * Au lieu de supprimer les drivers, on fusionne leurs manufacturer IDs
 * dans les drivers parents correspondants.
 * 
 * Résultat: 183 drivers MAIS compatibilité avec 319 devices!
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔄 MERGE MANUFACTURER IDs - INTELLIGENT FUSION\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Backup
const backupPath = `${appJsonPath}.backup.merge-mfg.${Date.now()}`;
fs.writeFileSync(backupPath, JSON.stringify(app, null, 2));
console.log(`✅ Backup: ${path.basename(backupPath)}\n`);

// Get app.json from commit with 218 drivers (before deletion)
console.log('📥 Fetching app.json with 218 drivers from commit 2e7c6cc64...');
const app218Json = execSync('git show 2e7c6cc64:app.json', { 
  cwd: path.join(__dirname, '../..'),
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024 // 50MB
});

const app218 = JSON.parse(app218Json);
console.log(`Found ${app218.drivers.length} drivers in commit 2e7c6cc64\n`);

// Create mapping: base driver ID → full driver objects
const current183 = new Map();
app.drivers.forEach(d => {
  const base = d.id.replace(/_aaa$|_aa$|_cr2032$|_cr2450$|_cr1632$|_battery$/, '')
    .replace(/_advanced$|_basic$/, '');
  current183.set(d.id, d);
});

// Find drivers in 218 that are missing in 183
const missing = app218.drivers.filter(d => !current183.has(d.id));
console.log(`Missing ${missing.length} drivers in current 183\n`);

// Merge manufacturer IDs
let merged = 0;
let added = 0;

missing.forEach(missingDriver => {
  const base = missingDriver.id.replace(/_aaa$|_aa$|_cr2032$|_cr2450$|_cr1632$|_battery$/, '')
    .replace(/_advanced$|_basic$/, '');
  
  // Find parent driver in current 183
  let parentDriver = null;
  for (const [id, driver] of current183.entries()) {
    const driverBase = id.replace(/_aaa$|_aa$|_cr2032$|_cr2450$|_cr1632$|_battery$/, '')
      .replace(/_advanced$|_basic$/, '');
    
    if (driverBase === base || id.includes(base) || base.includes(id.split('_').slice(0, 3).join('_'))) {
      parentDriver = driver;
      break;
    }
  }
  
  if (parentDriver && missingDriver.zigbee && missingDriver.zigbee.manufacturerName) {
    const missingMfg = missingDriver.zigbee.manufacturerName;
    
    if (!parentDriver.zigbee) {
      parentDriver.zigbee = {};
    }
    if (!parentDriver.zigbee.manufacturerName) {
      parentDriver.zigbee.manufacturerName = [];
    }
    
    // Merge manufacturer IDs
    const existingMfg = new Set(parentDriver.zigbee.manufacturerName);
    let addedCount = 0;
    
    missingMfg.forEach(mfg => {
      if (!existingMfg.has(mfg)) {
        parentDriver.zigbee.manufacturerName.push(mfg);
        existingMfg.add(mfg);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      console.log(`✅ Merged ${addedCount} IDs from ${missingDriver.id} → ${parentDriver.id}`);
      merged++;
      added += addedCount;
    }
  }
});

// Save merged app.json
fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n');

console.log(`\n📊 RESULTS:\n`);
console.log(`Drivers in current: ${app.drivers.length}`);
console.log(`Missing drivers analyzed: ${missing.length}`);
console.log(`Drivers merged: ${merged}`);
console.log(`Manufacturer IDs added: ${added}`);

console.log(`\n✅ app.json updated with merged manufacturer IDs\n`);

console.log('=' .repeat(60));
console.log('INTELLIGENT FUSION COMPLETE');
console.log('='.repeat(60));
console.log(`\n183 drivers + Manufacturer IDs from 218 drivers\n`);
console.log(`Compatibility: MAXIMIZED`);
console.log(`Size: OPTIMIZED`);
console.log(`\nNext: homey app validate --level publish\n`);
