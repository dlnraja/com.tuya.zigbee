#!/usr/bin/env node
/**
 * Fix Light Capability Options - SDK Compliance
 *
 * SDK: "Using the setOnDim capability option for the onoff capability will result
 * in Homey sending only a dim capability set instead of both onoff and dim when
 * a Flow changes the dim level of a device."
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

// Light drivers that need setOnDim
const lightDrivers = [
  'bulb_dimmable',
  'bulb_rgb',
  'bulb_rgbw',
  'bulb_tunable_white',
  'bulb_white',
  'led_controller_cct',
  'led_controller_rgb',
  'led_strip',
  'led_strip_advanced',
  'led_strip_rgbw',
  'dimmer_wall_1gang',
  'dimmer_dual_channel'
];

let fixed = 0;
let skipped = 0;

console.log('💡 Adding setOnDim capability option (SDK compliance)...\n');

for (const driver of lightDrivers) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');

  if (!fs.existsSync(composePath)) {
    console.log(`⏭️ ${driver}: No driver.compose.json found`);
    skipped++;
    continue;
  }

  try {
    const content = fs.readFileSync(composePath, 'utf8');
    const json = JSON.parse(content);

    // Check if has onoff and dim capabilities
    if (!json.capabilities?.includes('onoff') || !json.capabilities?.includes('dim')) {
      console.log(`⏭️ ${driver}: No onoff+dim capabilities`);
      skipped++;
      continue;
    }

    // Initialize capabilitiesOptions if not present
    if (!json.capabilitiesOptions) {
      json.capabilitiesOptions = {};
    }

    // Initialize onoff options if not present
    if (!json.capabilitiesOptions.onoff) {
      json.capabilitiesOptions.onoff = {};
    }

    // Check if already has setOnDim
    if (json.capabilitiesOptions.onoff.setOnDim === true) {
      console.log(`✅ ${driver}: Already has setOnDim`);
      skipped++;
      continue;
    }

    // Add setOnDim
    json.capabilitiesOptions.onoff.setOnDim = true;

    // Write back
    fs.writeFileSync(composePath, JSON.stringify(json, null, 2) + '\n');

    console.log(`✅ ${driver}: Added setOnDim option`);
    fixed++;
  } catch (err) {
    console.log(`❌ ${driver}: Error - ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Fixed: ${fixed}`);
console.log(`⏭️ Skipped: ${skipped}`);
console.log('='.repeat(60));
