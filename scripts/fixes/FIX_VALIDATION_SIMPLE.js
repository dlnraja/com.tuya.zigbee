#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 FIXING VALIDATION ISSUES\n');

let fixCount = 0;

// Get all drivers
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory();
});

// Fix all drivers
for (const driverName of drivers) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) continue;
  
  let content;
  try {
    content = fs.readFileSync(composeFile, 'utf8');
  } catch (err) {
    console.log(`⚠️  Cannot read: ${driverName}`);
    continue;
  }
  
  // Skip if file is empty or invalid
  if (!content || content.trim() === '') {
    console.log(`⚠️  Empty file: ${driverName}`);
    continue;
  }
  
  let compose;
  try {
    compose = JSON.parse(content);
  } catch (err) {
    console.log(`⚠️  Invalid JSON: ${driverName} - ${err.message}`);
    continue;
  }
  
  let modified = false;
  
  // Fix zigbee endpoints
  if (compose.zigbee && compose.zigbee.endpoints) {
    const endpoints = compose.zigbee.endpoints;
    
    for (const [epId, epValue] of Object.entries(endpoints)) {
      if (typeof epValue === 'number' || epValue === null || epValue === undefined) {
        compose.zigbee.endpoints[epId] = {
          clusters: []
        };
        modified = true;
        console.log(`✅ Fixed endpoint ${epId}: ${driverName}`);
        fixCount++;
      }
    }
  }
  
  // Add energy object for battery-powered devices
  const hasBattery = compose.capabilities && (
    compose.capabilities.includes('measure_battery') ||
    compose.capabilities.includes('alarm_battery')
  );
  
  if (hasBattery && !compose.energy) {
    compose.energy = {
      batteries: ['OTHER']
    };
    modified = true;
    console.log(`✅ Added energy/battery: ${driverName}`);
    fixCount++;
  }
  
  // Save if modified
  if (modified) {
    try {
      fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
    } catch (err) {
      console.log(`❌ Failed to save: ${driverName}`);
    }
  }
}

console.log(`\n✅ Total fixes: ${fixCount}\n`);
