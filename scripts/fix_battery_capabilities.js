#!/usr/bin/env node
/**
 * Fix Battery Capabilities - SDK Compliance
 *
 * SDK Rule: "Never give your driver both the measure_battery and the alarm_battery
 * capabilities. This creates duplicate UI components and Flow cards."
 *
 * Solution: Remove alarm_battery when measure_battery is present
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

// Get all driver directories
const drivers = fs.readdirSync(driversDir).filter(d => {
  const stat = fs.statSync(path.join(driversDir, d));
  return stat.isDirectory();
});

let fixed = 0;
let skipped = 0;

console.log('🔋 Fixing battery capabilities (SDK compliance)...\n');
console.log('Rule: Never use BOTH measure_battery AND alarm_battery\n');

for (const driver of drivers) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');

  if (!fs.existsSync(composePath)) {
    continue;
  }

  try {
    const content = fs.readFileSync(composePath, 'utf8');
    const json = JSON.parse(content);

    if (!json.capabilities || !Array.isArray(json.capabilities)) {
      continue;
    }

    const hasMeasure = json.capabilities.includes('measure_battery');
    const hasAlarm = json.capabilities.includes('alarm_battery');

    if (hasMeasure && hasAlarm) {
      // Remove alarm_battery, keep measure_battery (more precise)
      json.capabilities = json.capabilities.filter(c => c !== 'alarm_battery');

      // Also remove from capabilitiesOptions if present
      if (json.capabilitiesOptions && json.capabilitiesOptions.alarm_battery) {
        delete json.capabilitiesOptions.alarm_battery;
      }

      // Write back
      fs.writeFileSync(composePath, JSON.stringify(json, null, 2) + '\n');

      console.log(`✅ ${driver}: Removed alarm_battery (keeping measure_battery)`);
      fixed++;
    } else {
      skipped++;
    }
  } catch (err) {
    console.log(`❌ ${driver}: Error - ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Fixed: ${fixed}`);
console.log(`⏭️ Skipped (already OK): ${skipped}`);
console.log(`📊 Total drivers: ${drivers.length}`);
console.log('='.repeat(60));
console.log('\n📋 SDK Reference: https://apps.developer.homey.app/the-basics/devices/best-practices/battery-status');
