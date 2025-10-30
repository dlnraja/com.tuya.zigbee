#!/usr/bin/env node
'use strict';

/**
 * Optimized Manufacturer Extraction from Git History
 * Processes efficiently without overwhelming output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Extracting manufacturers from current drivers only...\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const manufacturerDB = {};

// Get all current driver directories
const drivers = fs.readdirSync(driversDir)
  .filter(name => {
    const stat = fs.statSync(path.join(driversDir, name));
    return stat.isDirectory() && !name.startsWith('.');
  });

console.log(`📊 Scanning ${drivers.length} current drivers...\n`);

drivers.forEach(driverName => {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    if (compose.zigbee && compose.zigbee.manufacturerName) {
      const manufacturers = Array.isArray(compose.zigbee.manufacturerName)
        ? compose.zigbee.manufacturerName
        : [compose.zigbee.manufacturerName];
      
      manufacturerDB[driverName] = manufacturers.filter(m => m && m.length > 5);
      
      if (manufacturerDB[driverName].length > 0) {
        console.log(`✅ ${driverName}: ${manufacturerDB[driverName].length} manufacturers`);
      }
    }
  } catch (err) {
    console.log(`⚠️  ${driverName}: ${err.message}`);
  }
});

// Save current state
const outputPath = path.join(__dirname, '..', 'reports', 'current-manufacturers.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(manufacturerDB, null, 2));

console.log('\n' + '='.repeat(80));
console.log('📊 CURRENT STATE');
console.log('='.repeat(80));
console.log(`Drivers with manufacturers: ${Object.keys(manufacturerDB).length}`);
console.log(`Total manufacturers: ${Object.values(manufacturerDB).reduce((sum, arr) => sum + arr.length, 0)}`);
console.log(`📄 Saved: ${outputPath}`);
console.log('='.repeat(80));

// Now check git history for ONLY drivers that exist
console.log('\n🔍 Checking git history for additional manufacturers...\n');

const historicalDB = {};
let enriched = 0;

drivers.forEach(driverName => {
  const filePath = `drivers/${driverName}/driver.compose.json`;
  
  try {
    // Get all versions of this file from git history
    const versions = execSync(`git log --all --pretty=format:"%H" -- "${filePath}"`, { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }).split('\n').slice(0, 20); // Last 20 commits only
    
    const allManufacturers = new Set(manufacturerDB[driverName] || []);
    let foundNew = false;
    
    versions.forEach(commit => {
      if (!commit) return;
      
      try {
        const content = execSync(`git show ${commit}:"${filePath}"`, { 
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        });
        const json = JSON.parse(content);
        
        if (json.zigbee && json.zigbee.manufacturerName) {
          const manufacturers = Array.isArray(json.zigbee.manufacturerName)
            ? json.zigbee.manufacturerName
            : [json.zigbee.manufacturerName];
          
          manufacturers.forEach(mfg => {
            if (mfg && mfg.length > 5 && !allManufacturers.has(mfg)) {
              allManufacturers.add(mfg);
              foundNew = true;
            }
          });
        }
      } catch (err) {
        // Skip errors
      }
    });
    
    if (foundNew) {
      historicalDB[driverName] = Array.from(allManufacturers).sort();
      const added = historicalDB[driverName].length - (manufacturerDB[driverName]?.length || 0);
      console.log(`✅ ${driverName}: +${added} from history (total: ${historicalDB[driverName].length})`);
      enriched++;
    }
    
  } catch (err) {
    // Skip drivers with no history
  }
});

// Save enriched database
const enrichedPath = path.join(__dirname, '..', 'reports', 'enriched-manufacturers.json');
fs.writeFileSync(enrichedPath, JSON.stringify(historicalDB, null, 2));

console.log('\n' + '='.repeat(80));
console.log('📊 ENRICHMENT RESULTS');
console.log('='.repeat(80));
console.log(`Drivers enriched: ${enriched}`);
console.log(`Total unique manufacturers: ${Object.values(historicalDB).reduce((sum, arr) => sum + arr.length, 0)}`);
console.log(`📄 Saved: ${enrichedPath}`);
console.log('='.repeat(80));
