#!/usr/bin/env node
'use strict';

/**
 * Fix drivers using {{driverAssetsPath}} template
 * Ensures physical images exist even if compose.json uses templates
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Fixing template image paths and creating missing images...\n');

// Drivers that use {{driverAssetsPath}} template
const templateDrivers = [
  'lonsonho_shortcut_button_other',
  'lsc_wireless_switch_4button_other',
  'tuya_air_conditioner_hybrid',
  'tuya_dehumidifier_hybrid',
  'wireless_button',
  'zemismart_sound_controller_other'
];

// Find a good template image source
const templateSources = [
  path.join(driversDir, 'avatto_sos_emergency_button', 'assets', 'images'),
  path.join(driversDir, 'button_1gang', 'assets', 'images'),
  path.join(__dirname, '../assets/images')
];

let templateSource = null;
for (const source of templateSources) {
  if (fs.existsSync(path.join(source, 'small.png'))) {
    templateSource = source;
    break;
  }
}

if (!templateSource) {
  console.error('❌ No template source found!');
  process.exit(1);
}

console.log(`📋 Using template images from: ${path.basename(path.dirname(templateSource))}\n`);

let fixed = 0;

for (const driverId of templateDrivers) {
  const imagesDir = path.join(driversDir, driverId, 'assets', 'images');
  
  // Ensure directory exists
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  let driverFixed = false;
  
  for (const size of ['small', 'large', 'xlarge']) {
    const targetPath = path.join(imagesDir, `${size}.png`);
    const sourcePath = path.join(templateSource, `${size}.png`);
    
    if (!fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`  ✅ ${driverId}/${size}.png created`);
      driverFixed = true;
    }
  }
  
  if (driverFixed) {
    fixed++;
    console.log();
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log(`✅ Fixed: ${fixed} drivers`);
console.log('═══════════════════════════════════════════════════════════\n');

// Now fix drivers with missing learnmode.svg
console.log('🔧 Creating missing learnmode.svg files...\n');

const learnmodeSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="#f0f0f0"/>
  <circle cx="250" cy="250" r="100" fill="#4CAF50" opacity="0.8"/>
  <text x="250" y="270" font-family="Arial" font-size="48" fill="#333" text-anchor="middle">?</text>
  <text x="250" y="350" font-family="Arial" font-size="24" fill="#666" text-anchor="middle">Pairing Mode</text>
</svg>`;

const learnmodeDrivers = [
  'avatto_radiator_valve_smart_hybrid',
  'avatto_smart_switch_2gang_hybrid',
  'avatto_smart_switch_4gang_hybrid',
  'avatto_switch_2gang_hybrid',
  'avatto_thermostat_hybrid',
  'avatto_thermostat_smart_internal',
  'avatto_water_valve_smart_hybrid',
  'zemismart_air_quality_monitor_pro_internal',
  'zemismart_curtain_motor_internal',
  'zemismart_doorbell_button_internal',
  'zemismart_scene_controller',
  'zemismart_smart_switch_1gang_hybrid',
  'zemismart_smart_switch_1gang_internal',
  'zemismart_smart_switch_3gang_hybrid',
  'zemismart_temperature_controller_hybrid'
];

let learnmodeFixed = 0;

for (const driverId of learnmodeDrivers) {
  const assetsDir = path.join(driversDir, driverId, 'assets');
  const learnmodePath = path.join(assetsDir, 'learnmode.svg');
  
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  if (!fs.existsSync(learnmodePath)) {
    fs.writeFileSync(learnmodePath, learnmodeSVG);
    console.log(`  ✅ ${driverId}/assets/learnmode.svg created`);
    learnmodeFixed++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`✅ Created: ${learnmodeFixed} learnmode.svg files`);
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`\n🎉 All template images fixed! Total: ${fixed + learnmodeFixed} improvements\n`);
