#!/usr/bin/env node
'use strict';

/**
 * DETECT MISSING FLOW CARDS
 * 
 * Analyzes all drivers to find which ones should have flow cards but don't
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔍 Analyzing drivers for missing flow cards...\n');

// Device classes that should have flow cards
const SHOULD_HAVE_FLOWS = {
  button: ['button_pressed', 'button_long_press', 'button_double_press'],
  sensor: ['alarm_triggered', 'measure_changed'],
  doorbell: ['doorbell_pressed'],
  lock: ['locked', 'unlocked'],
  windowcoverings: ['position_changed'],
  thermostat: ['target_temperature_changed'],
  switch: ['turned_on', 'turned_off'],
  socket: ['turned_on', 'turned_off'],
  light: ['turned_on', 'turned_off', 'dim_changed']
};

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

const results = {
  hasFlows: [],
  shouldHaveFlows: [],
  probablyOK: []
};

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  const flowPath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
  const deviceClass = compose.class || 'unknown';
  const hasFlowFile = fs.existsSync(flowPath);
  
  if (hasFlowFile) {
    results.hasFlows.push({
      id: driverId,
      class: deviceClass
    });
  } else if (SHOULD_HAVE_FLOWS[deviceClass]) {
    results.shouldHaveFlows.push({
      id: driverId,
      class: deviceClass,
      suggestedFlows: SHOULD_HAVE_FLOWS[deviceClass]
    });
  } else {
    results.probablyOK.push({
      id: driverId,
      class: deviceClass
    });
  }
}

// REPORT
console.log('═══════════════════════════════════════════════════════════');
console.log('   FLOW CARDS ANALYSIS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Drivers WITH flow cards: ${results.hasFlows.length}`);
console.log('─────────────────────────────────────────────────────────\n');
for (const driver of results.hasFlows) {
  console.log(`  ✅ ${driver.id} (${driver.class})`);
}

console.log(`\n⚠️  Drivers MISSING flow cards: ${results.shouldHaveFlows.length}`);
console.log('─────────────────────────────────────────────────────────\n');

// Group by class
const byClass = {};
for (const driver of results.shouldHaveFlows) {
  if (!byClass[driver.class]) byClass[driver.class] = [];
  byClass[driver.class].push(driver);
}

for (const [deviceClass, drivers] of Object.entries(byClass)) {
  console.log(`\n📦 ${deviceClass.toUpperCase()} (${drivers.length} drivers):`);
  console.log(`   Suggested flows: ${SHOULD_HAVE_FLOWS[deviceClass].join(', ')}\n`);
  
  for (const driver of drivers.slice(0, 10)) {
    console.log(`  ⚠️  ${driver.id}`);
  }
  
  if (drivers.length > 10) {
    console.log(`  ... and ${drivers.length - 10} more\n`);
  }
}

console.log(`\n✅ Drivers probably OK (no flows needed): ${results.probablyOK.length}`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`Total drivers: ${drivers.length}`);
console.log(`✅ Has flows: ${results.hasFlows.length} (${Math.round(results.hasFlows.length / drivers.length * 100)}%)`);
console.log(`⚠️  Missing flows: ${results.shouldHaveFlows.length} (${Math.round(results.shouldHaveFlows.length / drivers.length * 100)}%)`);
console.log(`✅ No flows needed: ${results.probablyOK.length} (${Math.round(results.probablyOK.length / drivers.length * 100)}%)\n`);

// Most critical missing
console.log('🔥 MOST CRITICAL MISSING FLOW CARDS:\n');

const critical = results.shouldHaveFlows.filter(d => 
  ['button', 'doorbell', 'sensor'].includes(d.class)
);

for (const driver of critical.slice(0, 20)) {
  console.log(`  🔥 ${driver.id} (${driver.class})`);
}

if (critical.length > 20) {
  console.log(`  ... and ${critical.length - 20} more\n`);
}

// Save report
const reportPath = path.join(__dirname, '../MISSING_FLOW_CARDS_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n📊 Detailed report saved to: MISSING_FLOW_CARDS_REPORT.json\n`);
