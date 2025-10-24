#!/usr/bin/env node
'use strict';

/**
 * COMPLETE DRIVER VALIDATION - SDK3 COMPLIANCE
 * 
 * Validates ALL drivers for:
 * - Capabilities presence and validity
 * - Flow cards generation
 * - Device class validity
 * - Zigbee configuration
 * - Images presence
 * - SDK3 compliance
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔍 COMPLETE DRIVER VALIDATION - SDK3 COMPLIANCE\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Valid Homey device classes (SDK3)
const VALID_CLASSES = [
  'light', 'socket', 'switch', 'sensor', 'thermostat', 'lock',
  'windowcoverings', 'fan', 'heater', 'button', 'doorbell',
  'remote', 'camera', 'amplifier', 'tv', 'speaker', 'blinds',
  'curtain', 'sunshade', 'garagedoor', 'valve', 'coffeemachine',
  'kettle', 'dishwasher', 'vacuumcleaner', 'refrigerator'
];

// Valid Homey capabilities
const STANDARD_CAPABILITIES = [
  'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
  'locked', 'lock_mode',
  'alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke', 'alarm_fire', 'alarm_co', 'alarm_co2',
  'alarm_battery', 'alarm_generic', 'alarm_heat', 'alarm_tamper',
  'measure_temperature', 'measure_humidity', 'measure_pressure', 'measure_luminance',
  'measure_power', 'measure_voltage', 'measure_current', 'measure_battery',
  'measure_pm25', 'measure_co', 'measure_co2', 'measure_noise',
  'meter_power', 'meter_water', 'meter_gas',
  'target_temperature', 'thermostat_mode',
  'windowcoverings_set', 'windowcoverings_state', 'windowcoverings_tilt_set',
  'volume_set', 'volume_up', 'volume_down', 'volume_mute',
  'channel_up', 'channel_down'
];

// Capabilities that should have flow cards
const FLOW_CAPABLE = {
  // Boolean capabilities (triggers + conditions + actions)
  'onoff': { triggers: ['turned_on', 'turned_off'], conditions: ['is_on'], actions: ['turn_on', 'turn_off', 'toggle'] },
  'locked': { triggers: ['locked', 'unlocked'], conditions: ['is_locked'], actions: ['lock', 'unlock'] },
  
  // Alarm capabilities (triggers)
  'alarm_motion': { triggers: ['alarm_motion_true', 'alarm_motion_false'] },
  'alarm_contact': { triggers: ['alarm_contact_true', 'alarm_contact_false'] },
  'alarm_water': { triggers: ['alarm_water_true', 'alarm_water_false'] },
  'alarm_smoke': { triggers: ['alarm_smoke_true'] },
  'alarm_fire': { triggers: ['alarm_fire_true'] },
  'alarm_co': { triggers: ['alarm_co_true'] },
  'alarm_co2': { triggers: ['alarm_co2_true'] },
  
  // Measure capabilities (triggers with tokens)
  'measure_temperature': { triggers: ['measure_temperature_changed'] },
  'measure_humidity': { triggers: ['measure_humidity_changed'] },
  'measure_power': { triggers: ['measure_power_changed'] },
  'measure_voltage': { triggers: ['measure_voltage_changed'] },
  'measure_current': { triggers: ['measure_current_changed'] },
  
  // Control capabilities
  'dim': { triggers: ['dim_changed'], actions: ['set_dim'] },
  'target_temperature': { triggers: ['target_temperature_changed'], actions: ['set_target_temperature'] },
  'windowcoverings_set': { triggers: ['windowcoverings_set_changed'], actions: ['set_windowcoverings_set', 'windowcoverings_open', 'windowcoverings_close'] }
};

const issues = {
  missingCapabilities: [],
  invalidClass: [],
  missingFlowCards: [],
  invalidCapabilities: [],
  missingImages: [],
  noEndpoints: [],
  noManufacturerIds: [],
  emptyCapabilities: []
};

const stats = {
  total: 0,
  withCapabilities: 0,
  withFlows: 0,
  withImages: 0,
  valid: 0
};

function validateDriver(driverId) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  const flowPath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composePath)) return null;
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
  const hasFlows = fs.existsSync(flowPath);
  
  const result = {
    id: driverId,
    class: compose.class || 'unknown',
    capabilities: compose.capabilities || [],
    hasFlows: hasFlows,
    issues: []
  };
  
  stats.total++;
  
  // 1. Validate device class
  if (!VALID_CLASSES.includes(result.class)) {
    issues.invalidClass.push({
      driver: driverId,
      class: result.class
    });
    result.issues.push(`Invalid class: ${result.class}`);
  }
  
  // 2. Check capabilities
  if (!result.capabilities || result.capabilities.length === 0) {
    issues.emptyCapabilities.push({
      driver: driverId,
      class: result.class
    });
    result.issues.push('No capabilities defined');
  } else {
    stats.withCapabilities++;
    
    // Validate each capability
    for (const cap of result.capabilities) {
      if (!STANDARD_CAPABILITIES.includes(cap) && !cap.startsWith('measure_') && !cap.startsWith('alarm_')) {
        issues.invalidCapabilities.push({
          driver: driverId,
          capability: cap
        });
        result.issues.push(`Unknown capability: ${cap}`);
      }
    }
  }
  
  // 3. Check flow cards
  if (hasFlows) {
    stats.withFlows++;
    
    const flows = JSON.parse(fs.readFileSync(flowPath, 'utf-8'));
    result.triggers = (flows.triggers || []).length;
    result.conditions = (flows.conditions || []).length;
    result.actions = (flows.actions || []).length;
    result.totalFlows = result.triggers + result.conditions + result.actions;
  } else {
    // Check if should have flows based on capabilities
    const shouldHaveFlows = result.capabilities.some(cap => FLOW_CAPABLE[cap]);
    
    if (shouldHaveFlows) {
      issues.missingFlowCards.push({
        driver: driverId,
        class: result.class,
        capabilities: result.capabilities,
        expectedFlows: result.capabilities.filter(cap => FLOW_CAPABLE[cap])
      });
      result.issues.push('Missing flow cards (has flow-capable capabilities)');
    }
    
    result.triggers = 0;
    result.conditions = 0;
    result.actions = 0;
    result.totalFlows = 0;
  }
  
  // 4. Check images
  const imagesDir = path.join(driversDir, driverId, 'assets', 'images');
  const hasImages = fs.existsSync(path.join(imagesDir, 'small.png')) &&
                   fs.existsSync(path.join(imagesDir, 'large.png')) &&
                   fs.existsSync(path.join(imagesDir, 'xlarge.png'));
  
  if (hasImages) {
    stats.withImages++;
  } else {
    issues.missingImages.push({
      driver: driverId,
      path: imagesDir
    });
    result.issues.push('Missing images (small/large/xlarge)');
  }
  
  // 5. Check Zigbee configuration
  if (compose.zigbee) {
    // Check manufacturer IDs
    if (!compose.zigbee.manufacturerName || compose.zigbee.manufacturerName.length === 0) {
      issues.noManufacturerIds.push({
        driver: driverId
      });
      result.issues.push('No manufacturer IDs');
    }
    
    // Check endpoints
    if (!compose.zigbee.endpoints || Object.keys(compose.zigbee.endpoints).length === 0) {
      issues.noEndpoints.push({
        driver: driverId
      });
      result.issues.push('No Zigbee endpoints defined');
    }
  }
  
  // 6. Overall validity
  if (result.issues.length === 0) {
    stats.valid++;
  }
  
  return result;
}

// Validate all drivers
const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

const results = drivers.map(validateDriver).filter(r => r !== null);

// REPORTING
console.log('\n═══════════════════════════════════════════════════════════');
console.log('   VALIDATION RESULTS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`📦 Total drivers: ${stats.total}`);
console.log(`✅ Valid (no issues): ${stats.valid} (${Math.round(stats.valid / stats.total * 100)}%)`);
console.log(`⚙️  With capabilities: ${stats.withCapabilities} (${Math.round(stats.withCapabilities / stats.total * 100)}%)`);
console.log(`🎴 With flow cards: ${stats.withFlows} (${Math.round(stats.withFlows / stats.total * 100)}%)`);
console.log(`🖼️  With images: ${stats.withImages} (${Math.round(stats.withImages / stats.total * 100)}%)\n`);

// ISSUES BY TYPE
if (issues.emptyCapabilities.length > 0) {
  console.log('\n❌ DRIVERS WITHOUT CAPABILITIES:', issues.emptyCapabilities.length);
  console.log('─────────────────────────────────────────────────────────\n');
  
  const byClass = {};
  for (const issue of issues.emptyCapabilities) {
    if (!byClass[issue.class]) byClass[issue.class] = [];
    byClass[issue.class].push(issue.driver);
  }
  
  for (const [deviceClass, driverList] of Object.entries(byClass)) {
    console.log(`  ${deviceClass.toUpperCase()} (${driverList.length}):`);
    for (const driver of driverList.slice(0, 5)) {
      console.log(`    ❌ ${driver}`);
    }
    if (driverList.length > 5) {
      console.log(`    ... and ${driverList.length - 5} more`);
    }
    console.log();
  }
}

if (issues.missingFlowCards.length > 0) {
  console.log('\n⚠️  DRIVERS MISSING FLOW CARDS:', issues.missingFlowCards.length);
  console.log('─────────────────────────────────────────────────────────\n');
  
  for (const issue of issues.missingFlowCards.slice(0, 10)) {
    console.log(`  ⚠️  ${issue.driver} (${issue.class})`);
    console.log(`     Capabilities: ${issue.capabilities.join(', ')}`);
    console.log(`     Should have: ${issue.expectedFlows.join(', ')}\n`);
  }
  
  if (issues.missingFlowCards.length > 10) {
    console.log(`  ... and ${issues.missingFlowCards.length - 10} more\n`);
  }
}

if (issues.invalidClass.length > 0) {
  console.log('\n❌ INVALID DEVICE CLASSES:', issues.invalidClass.length);
  console.log('─────────────────────────────────────────────────────────\n');
  
  for (const issue of issues.invalidClass.slice(0, 10)) {
    console.log(`  ❌ ${issue.driver}: ${issue.class}`);
  }
  
  if (issues.invalidClass.length > 10) {
    console.log(`  ... and ${issues.invalidClass.length - 10} more\n`);
  }
}

if (issues.invalidCapabilities.length > 0) {
  console.log('\n⚠️  UNKNOWN CAPABILITIES:', issues.invalidCapabilities.length);
  console.log('─────────────────────────────────────────────────────────\n');
  
  for (const issue of issues.invalidCapabilities.slice(0, 10)) {
    console.log(`  ⚠️  ${issue.driver}: ${issue.capability}`);
  }
  
  if (issues.invalidCapabilities.length > 10) {
    console.log(`  ... and ${issues.invalidCapabilities.length - 10} more\n`);
  }
}

if (issues.missingImages.length > 0) {
  console.log('\n⚠️  MISSING IMAGES:', issues.missingImages.length);
  console.log('─────────────────────────────────────────────────────────\n');
  console.log(`  ${issues.missingImages.length} drivers need images\n`);
}

if (issues.noManufacturerIds.length > 0) {
  console.log('\n⚠️  NO MANUFACTURER IDs:', issues.noManufacturerIds.length);
  console.log('─────────────────────────────────────────────────────────\n');
  console.log(`  ${issues.noManufacturerIds.length} drivers without manufacturer IDs\n`);
}

if (issues.noEndpoints.length > 0) {
  console.log('\n⚠️  NO ZIGBEE ENDPOINTS:', issues.noEndpoints.length);
  console.log('─────────────────────────────────────────────────────────\n');
  console.log(`  ${issues.noEndpoints.length} drivers without endpoints\n`);
}

// TOP ISSUES BY DRIVER
console.log('\n═══════════════════════════════════════════════════════════');
console.log('   DRIVERS WITH MOST ISSUES');
console.log('═══════════════════════════════════════════════════════════\n');

const driversWithIssues = results
  .filter(r => r.issues.length > 0)
  .sort((a, b) => b.issues.length - a.issues.length)
  .slice(0, 20);

for (const driver of driversWithIssues) {
  console.log(`  🔥 ${driver.id} (${driver.issues.length} issues)`);
  for (const issue of driver.issues) {
    console.log(`     - ${issue}`);
  }
  console.log();
}

// SUMMARY BY DEVICE CLASS
console.log('\n═══════════════════════════════════════════════════════════');
console.log('   SUMMARY BY DEVICE CLASS');
console.log('═══════════════════════════════════════════════════════════\n');

const byClass = {};
for (const driver of results) {
  if (!byClass[driver.class]) {
    byClass[driver.class] = {
      total: 0,
      withCapabilities: 0,
      withFlows: 0,
      valid: 0
    };
  }
  
  byClass[driver.class].total++;
  if (driver.capabilities.length > 0) byClass[driver.class].withCapabilities++;
  if (driver.hasFlows) byClass[driver.class].withFlows++;
  if (driver.issues.length === 0) byClass[driver.class].valid++;
}

for (const [deviceClass, classStats] of Object.entries(byClass).sort((a, b) => b[1].total - a[1].total)) {
  const flowCoverage = Math.round((classStats.withFlows / classStats.total) * 100);
  const validCoverage = Math.round((classStats.valid / classStats.total) * 100);
  
  console.log(`  ${deviceClass.toUpperCase()} (${classStats.total} drivers)`);
  console.log(`     Capabilities: ${classStats.withCapabilities}/${classStats.total}`);
  console.log(`     Flow cards: ${classStats.withFlows}/${classStats.total} (${flowCoverage}%)`);
  console.log(`     Valid: ${classStats.valid}/${classStats.total} (${validCoverage}%)\n`);
}

// Save detailed report
const reportPath = path.join(__dirname, '../COMPLETE_VALIDATION_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify({
  stats,
  issues,
  results,
  byClass
}, null, 2));

console.log(`\n📊 Detailed report saved to: COMPLETE_VALIDATION_REPORT.json\n`);

// Exit code
if (stats.valid === stats.total) {
  console.log('✅ ALL DRIVERS VALID!\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${stats.total - stats.valid} drivers have issues\n`);
  process.exit(0);
}
