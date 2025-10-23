#!/usr/bin/env node
'use strict';

/**
 * Build Complete app.json with all driver properties merged
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');
const homeycomposePath = path.join(__dirname, '../.homeycompose/app.json');
const appJsonPath = path.join(__dirname, '../app.json');
const flowDir = path.join(__dirname, '../flow');

console.log('🔧 Building complete app.json...\n');

// Read .homeycompose/app.json
let appJson;
try {
  appJson = JSON.parse(fs.readFileSync(homeycomposePath, 'utf-8'));
} catch (err) {
  console.error('❌ Could not read .homeycompose/app.json:', err.message);
  process.exit(1);
}

// Add _comment
appJson._comment = 'This file is generated. Please edit .homeycompose/app.json instead.';

// Get all drivers and merge with driver.compose.json
const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

console.log(`📦 Processing ${drivers.length} drivers...\n`);

const driverEntries = [];
let successful = 0;
let failed = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  ${driverId}: No driver.compose.json found`);
    failed++;
    continue;
  }
  
  try {
    const driverCompose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    // Merge ID with compose
    const driverEntry = {
      id: driverId,
      ...driverCompose
    };
    
    driverEntries.push(driverEntry);
    successful++;
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
    failed++;
  }
}

appJson.drivers = driverEntries;

// Add flow cards
if (fs.existsSync(flowDir)) {
  appJson.flow = {};
  
  const triggersPath = path.join(flowDir, 'triggers.json');
  if (fs.existsSync(triggersPath)) {
    appJson.flow.triggers = JSON.parse(fs.readFileSync(triggersPath, 'utf-8'));
  }
  
  const conditionsPath = path.join(flowDir, 'conditions.json');
  if (fs.existsSync(conditionsPath)) {
    appJson.flow.conditions = JSON.parse(fs.readFileSync(conditionsPath, 'utf-8'));
  }
  
  const actionsPath = path.join(flowDir, 'actions.json');
  if (fs.existsSync(actionsPath)) {
    appJson.flow.actions = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));
  }
}

// Write app.json
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   BUILD SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Successful: ${successful}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📦 Total drivers in app.json: ${driverEntries.length}`);

if (appJson.flow) {
  console.log(`\n🎴 Flow cards:`);
  console.log(`   - Triggers: ${appJson.flow.triggers?.length || 0}`);
  console.log(`   - Conditions: ${appJson.flow.conditions?.length || 0}`);
  console.log(`   - Actions: ${appJson.flow.actions?.length || 0}`);
}

console.log('\n✅ app.json built successfully!');
