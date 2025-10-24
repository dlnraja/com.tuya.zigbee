#!/usr/bin/env node
'use strict';

/**
 * VALIDATE ENERGY MANAGEMENT FLOW CARDS
 * 
 * Ensures all energy-related capabilities have proper flow cards
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔋 Validating Energy Management Flow Cards\n');

// Energy capabilities that MUST have flow cards
const ENERGY_CAPABILITIES = {
  'measure_power': {
    triggers: ['measure_power_changed'],
    description: 'Power consumption changed (W)'
  },
  'meter_power': {
    triggers: ['meter_power_changed'],
    description: 'Total energy consumption changed (kWh)'
  },
  'measure_voltage': {
    triggers: ['measure_voltage_changed'],
    description: 'Voltage changed (V)'
  },
  'measure_current': {
    triggers: ['measure_current_changed'],
    description: 'Current changed (A)'
  },
  'measure_battery': {
    triggers: ['measure_battery_changed'],
    description: 'Battery level changed (%)'
  },
  'alarm_battery': {
    triggers: ['alarm_battery_true'],
    description: 'Battery low alarm'
  }
};

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

const results = {
  withEnergyCapabilities: [],
  missingEnergyFlows: [],
  completeEnergyFlows: [],
  batteryManagement: []
};

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  const flowPath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
  const capabilities = compose.capabilities || [];
  
  // Check for energy capabilities
  const energyCaps = capabilities.filter(cap => ENERGY_CAPABILITIES[cap]);
  
  if (energyCaps.length > 0) {
    results.withEnergyCapabilities.push({
      driver: driverId,
      class: compose.class,
      capabilities: energyCaps
    });
    
    // Check if has flow cards
    if (fs.existsSync(flowPath)) {
      const flows = JSON.parse(fs.readFileSync(flowPath, 'utf-8'));
      const triggers = (flows.triggers || []).map(t => t.id);
      
      let hasAllFlows = true;
      const missingFlows = [];
      
      for (const cap of energyCaps) {
        const requiredFlows = ENERGY_CAPABILITIES[cap].triggers;
        
        for (const flowId of requiredFlows) {
          const expectedId = `${driverId}_${flowId}`;
          if (!triggers.includes(expectedId)) {
            hasAllFlows = false;
            missingFlows.push(flowId);
          }
        }
      }
      
      if (hasAllFlows) {
        results.completeEnergyFlows.push({
          driver: driverId,
          capabilities: energyCaps,
          triggers: triggers.filter(t => 
            t.includes('power') || t.includes('voltage') || t.includes('current') || t.includes('battery')
          ).length
        });
      } else {
        results.missingEnergyFlows.push({
          driver: driverId,
          capabilities: energyCaps,
          missing: missingFlows
        });
      }
    } else {
      results.missingEnergyFlows.push({
        driver: driverId,
        capabilities: energyCaps,
        missing: ['ALL - no flow file']
      });
    }
  }
  
  // Check for battery management
  if (capabilities.includes('measure_battery') || capabilities.includes('alarm_battery')) {
    results.batteryManagement.push({
      driver: driverId,
      class: compose.class,
      hasMeasure: capabilities.includes('measure_battery'),
      hasAlarm: capabilities.includes('alarm_battery')
    });
  }
}

// REPORTING
console.log('═══════════════════════════════════════════════════════════');
console.log('   ENERGY MANAGEMENT FLOW CARDS REPORT');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`📊 Drivers with energy capabilities: ${results.withEnergyCapabilities.length}`);
console.log(`✅ Complete energy flows: ${results.completeEnergyFlows.length}`);
console.log(`❌ Missing energy flows: ${results.missingEnergyFlows.length}`);
console.log(`🔋 Battery management: ${results.batteryManagement.length}\n`);

if (results.completeEnergyFlows.length > 0) {
  console.log('\n✅ DRIVERS WITH COMPLETE ENERGY FLOWS:', results.completeEnergyFlows.length);
  console.log('─────────────────────────────────────────────────────────\n');
  
  for (const driver of results.completeEnergyFlows.slice(0, 10)) {
    console.log(`  ✅ ${driver.driver}`);
    console.log(`     Capabilities: ${driver.capabilities.join(', ')}`);
    console.log(`     Energy triggers: ${driver.triggers}\n`);
  }
  
  if (results.completeEnergyFlows.length > 10) {
    console.log(`  ... and ${results.completeEnergyFlows.length - 10} more\n`);
  }
}

if (results.missingEnergyFlows.length > 0) {
  console.log('\n❌ DRIVERS MISSING ENERGY FLOWS:', results.missingEnergyFlows.length);
  console.log('─────────────────────────────────────────────────────────\n');
  
  for (const driver of results.missingEnergyFlows.slice(0, 10)) {
    console.log(`  ❌ ${driver.driver}`);
    console.log(`     Has capabilities: ${driver.capabilities.join(', ')}`);
    console.log(`     Missing flows: ${driver.missing.join(', ')}\n`);
  }
  
  if (results.missingEnergyFlows.length > 10) {
    console.log(`  ... and ${results.missingEnergyFlows.length - 10} more\n`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   BATTERY MANAGEMENT');
console.log('═══════════════════════════════════════════════════════════\n');

const byClass = {};
for (const driver of results.batteryManagement) {
  if (!byClass[driver.class]) byClass[driver.class] = [];
  byClass[driver.class].push(driver);
}

for (const [deviceClass, drivers] of Object.entries(byClass)) {
  console.log(`  ${deviceClass.toUpperCase()} (${drivers.length} drivers)`);
  
  const withBoth = drivers.filter(d => d.hasMeasure && d.hasAlarm).length;
  const measureOnly = drivers.filter(d => d.hasMeasure && !d.hasAlarm).length;
  const alarmOnly = drivers.filter(d => !d.hasMeasure && d.hasAlarm).length;
  
  console.log(`     Both measure + alarm: ${withBoth}`);
  console.log(`     Measure only: ${measureOnly}`);
  console.log(`     Alarm only: ${alarmOnly}\n`);
}

// Check PowerManager and BatteryManager integration
console.log('\n═══════════════════════════════════════════════════════════');
console.log('   INTELLIGENT ENERGY MANAGEMENT');
console.log('═══════════════════════════════════════════════════════════\n');

const powerManagerPath = path.join(__dirname, '../lib/PowerManager.js');
const batteryManagerPath = path.join(__dirname, '../lib/BatteryManager.js');

console.log(`  PowerManager.js: ${fs.existsSync(powerManagerPath) ? '✅ EXISTS' : '❌ MISSING'}`);
console.log(`  BatteryManager.js: ${fs.existsSync(batteryManagerPath) ? '✅ EXISTS' : '❌ MISSING'}\n`);

if (fs.existsSync(powerManagerPath)) {
  const powerManager = fs.readFileSync(powerManagerPath, 'utf-8');
  const features = {
    'Power estimation': powerManager.includes('estimatePower'),
    'V×I calculation': powerManager.includes('voltage') && powerManager.includes('current'),
    'Cross-validation': powerManager.includes('validate'),
    'Auto-hide empty': powerManager.includes('hideCapability') || powerManager.includes('removeCapability')
  };
  
  console.log('  PowerManager Features:');
  for (const [feature, hasIt] of Object.entries(features)) {
    console.log(`    ${hasIt ? '✅' : '❌'} ${feature}`);
  }
  console.log();
}

if (fs.existsSync(batteryManagerPath)) {
  const batteryManager = fs.readFileSync(batteryManagerPath, 'utf-8');
  const features = {
    'Battery percentage calc': batteryManager.includes('calculatePercentage'),
    'Health assessment': batteryManager.includes('health'),
    'Life estimation': batteryManager.includes('estimate'),
    'Type detection': batteryManager.includes('CR2032') || batteryManager.includes('AA')
  };
  
  console.log('  BatteryManager Features:');
  for (const [feature, hasIt] of Object.entries(features)) {
    console.log(`    ${hasIt ? '✅' : '❌'} ${feature}`);
  }
  console.log();
}

// Save report
const reportPath = path.join(__dirname, '../ENERGY_FLOWS_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

console.log(`\n📊 Detailed report saved to: ENERGY_FLOWS_REPORT.json\n`);

// Summary
console.log('═══════════════════════════════════════════════════════════');
console.log('   SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const coverage = Math.round((results.completeEnergyFlows.length / results.withEnergyCapabilities.length) * 100);
console.log(`  Energy flow coverage: ${results.completeEnergyFlows.length}/${results.withEnergyCapabilities.length} (${coverage}%)`);
console.log(`  Battery management: ${results.batteryManagement.length} drivers`);
console.log(`  Intelligent managers: ${fs.existsSync(powerManagerPath) && fs.existsSync(batteryManagerPath) ? '✅ ACTIVE' : '⚠️  CHECK'}\n`);

if (coverage === 100) {
  console.log('✅ ALL ENERGY DRIVERS HAVE COMPLETE FLOW CARDS!\n');
} else {
  console.log(`⚠️  ${results.missingEnergyFlows.length} drivers need energy flow cards\n`);
}
