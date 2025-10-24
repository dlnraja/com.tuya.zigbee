#!/usr/bin/env node
'use strict';

/**
 * Fix app.json - Add all driver IDs
 * Scans drivers folder and generates complete app.json
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');
const appJsonPath = path.join(__dirname, '../app.json');

console.log('🔧 Fixing app.json - Adding all driver IDs...\n');

// Get all drivers
const drivers = fs.readdirSync(driversDir)
  .filter(name => {
    const driverPath = path.join(driversDir, name);
    return fs.statSync(driverPath).isDirectory();
  })
  .sort();

console.log(`📦 Found ${drivers.length} drivers\n`);

// Read current app.json
let appJson;
try {
  appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
} catch (err) {
  console.error('❌ Could not read app.json:', err.message);
  process.exit(1);
}

// Generate driver entries
const driverEntries = drivers.map(driverId => {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  // Minimal driver entry - Homey will merge with driver.compose.json
  return {
    id: driverId
  };
});

// Add drivers to app.json
appJson.drivers = driverEntries;

// Add flow cards if flow folder exists
const flowDir = path.join(__dirname, '../flow');
if (fs.existsSync(flowDir)) {
  appJson.flow = {};
  
  // Triggers
  const triggersPath = path.join(flowDir, 'triggers.json');
  if (fs.existsSync(triggersPath)) {
    appJson.flow.triggers = JSON.parse(fs.readFileSync(triggersPath, 'utf-8'));
  }
  
  // Conditions
  const conditionsPath = path.join(flowDir, 'conditions.json');
  if (fs.existsSync(conditionsPath)) {
    appJson.flow.conditions = JSON.parse(fs.readFileSync(conditionsPath, 'utf-8'));
  }
  
  // Actions
  const actionsPath = path.join(flowDir, 'actions.json');
  if (fs.existsSync(actionsPath)) {
    appJson.flow.actions = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));
  }
}

// Write back
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log(`✅ app.json updated with ${driverEntries.length} drivers`);
if (appJson.flow) {
  console.log(`✅ Flow cards added:`);
  console.log(`   - Triggers: ${appJson.flow.triggers?.length || 0}`);
  console.log(`   - Conditions: ${appJson.flow.conditions?.length || 0}`);
  console.log(`   - Actions: ${appJson.flow.actions?.length || 0}`);
}

console.log('\n✅ app.json fixed successfully!');
