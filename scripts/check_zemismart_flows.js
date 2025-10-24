#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔍 Checking Zemismart drivers for flow cards...\n');

const zemismartDrivers = fs.readdirSync(driversDir)
  .filter(name => name.startsWith('zemismart_'))
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

const withFlows = [];
const withoutFlows = [];

for (const driverId of zemismartDrivers) {
  const flowPath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
  const capabilities = compose.capabilities || [];
  
  if (fs.existsSync(flowPath)) {
    const flows = JSON.parse(fs.readFileSync(flowPath, 'utf-8'));
    const triggerCount = (flows.triggers || []).length;
    const conditionCount = (flows.conditions || []).length;
    const actionCount = (flows.actions || []).length;
    
    withFlows.push({
      id: driverId,
      class: compose.class,
      capabilities: capabilities.length,
      triggers: triggerCount,
      conditions: conditionCount,
      actions: actionCount
    });
  } else {
    withoutFlows.push({
      id: driverId,
      class: compose.class,
      capabilities: capabilities.length
    });
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('   ZEMISMART FLOW CARDS STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Drivers WITH flow cards: ${withFlows.length}/${zemismartDrivers.length}`);
console.log('─────────────────────────────────────────────────────────\n');

for (const driver of withFlows) {
  console.log(`  ✅ ${driver.id}`);
  console.log(`     Class: ${driver.class} | Capabilities: ${driver.capabilities}`);
  console.log(`     Flows: ${driver.triggers}T + ${driver.conditions}C + ${driver.actions}A\n`);
}

console.log(`\n❌ Drivers WITHOUT flow cards: ${withoutFlows.length}/${zemismartDrivers.length}`);
console.log('─────────────────────────────────────────────────────────\n');

const byClass = {};
for (const driver of withoutFlows) {
  if (!byClass[driver.class]) byClass[driver.class] = [];
  byClass[driver.class].push(driver);
}

for (const [deviceClass, drivers] of Object.entries(byClass)) {
  console.log(`\n📦 ${deviceClass.toUpperCase()} (${drivers.length}):`);
  for (const driver of drivers) {
    console.log(`  ❌ ${driver.id} (${driver.capabilities} capabilities)`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const percentage = Math.round((withFlows.length / zemismartDrivers.length) * 100);
console.log(`Total Zemismart drivers: ${zemismartDrivers.length}`);
console.log(`✅ With flows: ${withFlows.length} (${percentage}%)`);
console.log(`❌ Without flows: ${withoutFlows.length} (${100 - percentage}%)\n`);

if (withoutFlows.length > 0) {
  console.log('🔥 CRITICAL: Ces drivers ne sont PAS visibles dans flows Homey!\n');
}
