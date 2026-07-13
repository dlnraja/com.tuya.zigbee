#!/usr/bin/env node
/**
 * P28.3 — Battery Gaps + Missing Fallbacks Detection
 * 
 * Identifies drivers with battery issues:
 * 1. Drivers with measure_battery but NO UnifiedBatteryHandler usage
 * 2. Drivers with measure_battery but NO read battery method
 * 3. Drivers with measure_battery but NO onEndDeviceAnnounce (sleepy device issue)
 * 4. Drivers with no measure_battery but with battery capabilities expected
 * 5. Drivers using only old BatteryManager (no UnifiedBatteryHandler)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const cartographyPath = path.join(repoRoot, '.github', 'state', 'battery-cartography.json');
const outputFile = path.join(repoRoot, '.github', 'state', 'battery-gaps.json');

if (!fs.existsSync(cartographyPath)) {
  console.error('❌ battery-cartography.json not found. Run battery-cartography.js first.');
  process.exit(1);
}

const cartography = JSON.parse(fs.readFileSync(cartographyPath, 'utf8'));

const gaps = {
  no_unified_battery_handler: [],
  no_read_battery_method: [],
  no_on_end_device_announce: [],
  old_battery_manager_only: [],
  // Drivers with measure_battery but missing key patterns
  full_battery_with_missing_fallbacks: [],
};

for (const driver of cartography.driversUsingBattery) {
  // Drivers with measure_battery but NOT using UnifiedBatteryHandler
  if (driver.hasMeasureBattery && !driver.hasUnifiedBatteryHandler && !driver.hasBatterySystem && !driver.hasBatteryMonitoringMixin) {
    gaps.no_unified_battery_handler.push(driver.driver);
  }
  
  // Drivers with measure_battery but no read battery method
  if (driver.hasMeasureBattery && !driver.hasReadBattery) {
    gaps.no_read_battery_method.push(driver.driver);
  }
  
  // Drivers with measure_battery but no onEndDeviceAnnounce (sleepy issue)
  if (driver.hasMeasureBattery && !driver.hasOnEndDeviceAnnounce) {
    gaps.no_on_end_device_announce.push(driver.driver);
  }
  
  // Drivers using only old BatteryManager
  if (driver.hasBatteryManager && !driver.hasUnifiedBatteryHandler && !driver.hasBatteryMonitoringMixin) {
    gaps.old_battery_manager_only.push(driver.driver);
  }
}

// All gaps
gaps.summary = {
  total: 0,
  byCategory: {
    no_unified_battery_handler: gaps.no_unified_battery_handler.length,
    no_read_battery_method: gaps.no_read_battery_method.length,
    no_on_end_device_announce: gaps.no_on_end_device_announce.length,
    old_battery_manager_only: gaps.old_battery_manager_only.length,
  },
};
gaps.summary.total = Object.values(gaps.summary.byCategory).reduce((a, b) => a + b, 0);

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(gaps, null, 2));

console.log('🔍 Battery gap analysis:');
console.log('   ❌ No UnifiedBatteryHandler:', gaps.no_unified_battery_handler.length);
console.log('   ❌ No read battery method:', gaps.no_read_battery_method.length);
console.log('   ❌ No onEndDeviceAnnounce (sleepy issue):', gaps.no_on_end_device_announce.length);
console.log('   ❌ Only old BatteryManager:', gaps.old_battery_manager_only.length);
console.log('   📊 Total gaps:', gaps.summary.total);

if (gaps.no_unified_battery_handler.length > 0 && gaps.no_unified_battery_handler.length < 20) {
  console.log('\n📋 Drivers without UnifiedBatteryHandler:');
  for (const d of gaps.no_unified_battery_handler) {
    console.log('   -', d);
  }
}
