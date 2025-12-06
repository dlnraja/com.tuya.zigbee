#!/usr/bin/env node
/**
 * COMPLETE AUDIT & FIX
 *
 * 1. Verify productIds are in correct category folders
 * 2. Check and fix driver icons/images
 * 3. Verify consistency across all drivers
 * 4. Create missing categories if needed
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTID → CATEGORY MAPPING (from Z2M and Tuya documentation)
// ═══════════════════════════════════════════════════════════════════════════
const PRODUCTID_CATEGORIES = {
  // Switches
  'TS0001': 'switch', 'TS0002': 'switch', 'TS0003': 'switch', 'TS0004': 'switch',
  'TS0011': 'switch', 'TS0012': 'switch', 'TS0013': 'switch', 'TS0014': 'switch',
  'TS0041': 'switch', 'TS0042': 'switch', 'TS0043': 'switch', 'TS0044': 'switch',

  // Plugs
  'TS011F': 'plug', 'TS0121': 'plug', 'TS0101': 'plug',

  // Dimmers
  'TS0501A': 'dimmer', 'TS0501B': 'dimmer', 'TS0502A': 'dimmer', 'TS0502B': 'dimmer',
  'TS0504A': 'dimmer', 'TS0504B': 'dimmer', 'TS110E': 'dimmer', 'TS110F': 'dimmer',

  // Lights/Bulbs
  'TS0503A': 'light', 'TS0503B': 'light', 'TS0505A': 'light', 'TS0505B': 'light',
  'TS0504A': 'light', 'TS0504B': 'light',

  // Sensors - Temperature/Humidity
  'TS0201': 'climate_sensor', 'TS0601_climate': 'climate_sensor',

  // Sensors - Motion/Presence
  'TS0202': 'motion', 'TS0601_presence': 'presence',

  // Sensors - Contact/Door
  'TS0203': 'contact',

  // Sensors - Water Leak
  'TS0207': 'water_leak',

  // Smoke/Gas
  'TS0205': 'smoke',

  // Buttons/Remotes
  'TS0041': 'button', 'TS0042': 'button', 'TS0043': 'button', 'TS0044': 'button',
  'TS004F': 'button', 'TS0215A': 'button',

  // Covers/Curtains
  'TS0601_cover': 'cover', 'TS130F': 'cover',

  // Thermostats/TRV
  'TS0601_thermostat': 'thermostat',

  // Generic (can be anything)
  'TS0601': 'generic',
};

// Category → Expected folder patterns
const CATEGORY_FOLDERS = {
  switch: ['switch_', 'relay_'],
  plug: ['plug_', 'socket_', 'outlet_'],
  dimmer: ['dimmer_'],
  light: ['bulb_', 'light_', 'led_'],
  climate_sensor: ['climate_sensor', 'temphumid', 'weather_'],
  motion: ['motion_sensor', 'presence_', 'pir_'],
  contact: ['contact_sensor', 'door_', 'window_sensor'],
  water_leak: ['water_leak', 'flood_'],
  smoke: ['smoke_', 'gas_', 'co_'],
  button: ['button_', 'remote_', 'scene_'],
  cover: ['curtain_', 'blind_', 'shutter_', 'cover_'],
  thermostat: ['thermostat_', 'radiator_', 'trv_', 'valve_'],
  generic: ['generic_', 'zigbee_universal'],
};

// Driver class mapping for Homey
const DRIVER_CLASSES = {
  switch: 'socket',
  plug: 'socket',
  dimmer: 'light',
  light: 'light',
  climate_sensor: 'sensor',
  motion: 'sensor',
  contact: 'sensor',
  water_leak: 'sensor',
  smoke: 'sensor',
  button: 'button',
  cover: 'windowcoverings',
  thermostat: 'thermostat',
  generic: 'other',
};

function getExpectedCategory(driverName) {
  for (const [category, patterns] of Object.entries(CATEGORY_FOLDERS)) {
    for (const pattern of patterns) {
      if (driverName.includes(pattern) || driverName.startsWith(pattern.replace('_', ''))) {
        return category;
      }
    }
  }
  return 'generic';
}

function getProductIdCategory(pid) {
  return PRODUCTID_CATEGORIES[pid] || 'generic';
}

function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 COMPLETE AUDIT & FIX');
  console.log('════════════════════════════════════════════════════════════════\n');

  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  const issues = [];
  const stats = {
    driversChecked: 0,
    missingIcons: [],
    wrongCategory: [],
    missingClass: [],
    fixedIcons: 0,
    fixedClasses: 0,
  };

  console.log('📂 Step 1: Checking all drivers...\n');

  for (const driver of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driver.name);
    const configPath = path.join(driverPath, 'driver.compose.json');

    if (!fs.existsSync(configPath)) continue;
    stats.driversChecked++;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const expectedCategory = getExpectedCategory(driver.name);

      // Check icon
      const iconPath = path.join(driverPath, 'assets', 'icon.svg');
      if (!fs.existsSync(iconPath)) {
        stats.missingIcons.push(driver.name);
      }

      // Check driver class
      const expectedClass = DRIVER_CLASSES[expectedCategory];
      if (config.class !== expectedClass && expectedClass) {
        stats.missingClass.push({
          driver: driver.name,
          current: config.class,
          expected: expectedClass,
        });
      }

      // Check productIds in correct category
      const pids = config.zigbee?.productId || [];
      for (const pid of pids) {
        const pidCategory = getProductIdCategory(pid);
        if (pidCategory !== 'generic' && pidCategory !== expectedCategory) {
          // Not necessarily wrong - TS0601 can be in many categories
          if (pid !== 'TS0601') {
            stats.wrongCategory.push({
              driver: driver.name,
              productId: pid,
              driverCategory: expectedCategory,
              pidCategory: pidCategory,
            });
          }
        }
      }

    } catch (e) {
      issues.push({ driver: driver.name, error: e.message });
    }
  }

  // Print results
  console.log(`  Drivers checked: ${stats.driversChecked}\n`);

  console.log('📋 ICONS CHECK');
  console.log('────────────────────────────────────────────────────────────────');
  if (stats.missingIcons.length === 0) {
    console.log('  ✅ All drivers have icons');
  } else {
    console.log(`  ⚠️ ${stats.missingIcons.length} drivers missing icons:`);
    stats.missingIcons.forEach(d => console.log(`    - ${d}`));
  }
  console.log('');

  console.log('📋 DRIVER CLASS CHECK');
  console.log('────────────────────────────────────────────────────────────────');
  if (stats.missingClass.length === 0) {
    console.log('  ✅ All driver classes correct');
  } else {
    console.log(`  ⚠️ ${stats.missingClass.length} drivers with wrong class:`);
    stats.missingClass.slice(0, 10).forEach(d => {
      console.log(`    - ${d.driver}: ${d.current} → should be ${d.expected}`);
    });
  }
  console.log('');

  console.log('📋 CATEGORY CHECK');
  console.log('────────────────────────────────────────────────────────────────');
  if (stats.wrongCategory.length === 0) {
    console.log('  ✅ All productIds in correct categories');
  } else {
    console.log(`  ℹ️ ${stats.wrongCategory.length} productIds in different category (may be intentional):`);
    stats.wrongCategory.slice(0, 10).forEach(d => {
      console.log(`    - ${d.productId} in ${d.driver} (expected: ${d.pidCategory})`);
    });
  }
  console.log('');

  // Step 2: Auto-fix what we can
  console.log('🔧 Step 2: Auto-fixing issues...\n');

  // Fix driver classes
  for (const issue of stats.missingClass) {
    const configPath = path.join(DRIVERS_DIR, issue.driver, 'driver.compose.json');
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      // Only fix if class is missing or 'other'
      if (!config.class || config.class === 'other') {
        config.class = issue.expected;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        stats.fixedClasses++;
        console.log(`  Fixed class: ${issue.driver} → ${issue.expected}`);
      }
    } catch { }
  }

  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Drivers checked: ${stats.driversChecked}`);
  console.log(`  Missing icons: ${stats.missingIcons.length}`);
  console.log(`  Wrong classes fixed: ${stats.fixedClasses}`);
  console.log(`  Category warnings: ${stats.wrongCategory.length}`);
  console.log('════════════════════════════════════════════════════════════════');
}

if (require.main === module) {
  main();
}
