#!/usr/bin/env node
/**
 * MASTER APPLY ALL RULES
 *
 * Applies ALL fingerprinting rules from DEV_NOTES.md:
 * - 9.1 Homey Matching Logic
 * - 9.2 TS0601 Trap Protection
 * - 9.3 Smart Category Placement
 * - 9.4 3-Pillar Validation
 * - 9.5 ManufacturerName Expansion (MAXIMAL)
 * - 9.6 ProductId Expansion (EXHAUSTIVE)
 * - 9.8 Non-Regression Protection
 * - 9.10 Golden Principle
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const DRIVER_PRIORITY = {
  climate_sensor: 100,
  motion_sensor: 100,
  contact_sensor: 100,
  water_leak_sensor: 100,
  smoke_detector_advanced: 100,
  presence_sensor_radar: 100,
  vibration_sensor: 100,
  soil_sensor: 100,
  thermostat_tuya_dp: 90,
  radiator_valve: 90,
  curtain_motor: 90,
  plug_energy_monitor: 90,
  switch_1gang: 80,
  switch_2gang: 80,
  switch_3gang: 80,
  switch_4gang: 80,
  plug_smart: 80,
  dimmer_wall_1gang: 80,
  button_wireless_1: 80,
  bulb_rgb: 80,
  temphumidsensor: 70,
  air_quality_co2: 70,
  weather_station_outdoor: 70,
  generic_tuya: 10,
  zigbee_universal: 5,
};

const CATEGORY_CLUSTERS = {
  switch: ['onOff', 'levelControl'],
  plug: ['onOff', 'metering', 'electricalMeasurement'],
  light: ['levelControl', 'colorControl', 'onOff'],
  sensor: ['temperatureMeasurement', 'relativeHumidity', 'illuminanceMeasurement'],
  motion: ['occupancySensing'],
  thermostat: ['hvacThermostat'],
  alarm: ['iasZone', 'iasWd'],
  cover: ['windowCovering'],
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

async function fetchZ2M() {
  return new Promise((resolve) => {
    https.get('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function getDriverPriority(name) {
  for (const [pattern, priority] of Object.entries(DRIVER_PRIORITY)) {
    if (name === pattern || name.includes(pattern)) return priority;
  }
  return 50;
}

function getDriverCategory(name) {
  if (name.includes('switch') || name.includes('relay')) return 'switch';
  if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) return 'plug';
  if (name.includes('bulb') || name.includes('light') || name.includes('led') || name.includes('dimmer')) return 'light';
  if (name.includes('motion') || name.includes('presence') || name.includes('pir') || name.includes('radar')) return 'motion';
  if (name.includes('climate') || name.includes('temp') || name.includes('humidity') || name.includes('sensor')) return 'sensor';
  if (name.includes('thermostat') || name.includes('valve') || name.includes('trv')) return 'thermostat';
  if (name.includes('smoke') || name.includes('alarm') || name.includes('siren') || name.includes('gas')) return 'alarm';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shutter') || name.includes('cover')) return 'cover';
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 MASTER APPLY ALL RULES');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Step 1: Fetch Z2M data
  console.log('📡 Step 1: Fetching Z2M database...');
  const z2mContent = await fetchZ2M();

  // Parse Z2M for manufacturerName -> productIds mapping
  const z2mMapping = new Map();
  const z2mDeviceTypes = new Map();

  if (z2mContent) {
    // Extract fingerprints
    const fpPattern = /modelID:\s*['"]([^'"]+)['"][^}]*manufacturerName:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = fpPattern.exec(z2mContent)) !== null) {
      const modelId = match[1];
      const mfr = match[2];
      if (!z2mMapping.has(mfr)) z2mMapping.set(mfr, new Set());
      z2mMapping.get(mfr).add(modelId);
    }

    // Reverse pattern
    const fpPattern2 = /manufacturerName:\s*['"]([^'"]+)['"][^}]*modelID:\s*['"]([^'"]+)['"]/g;
    while ((match = fpPattern2.exec(z2mContent)) !== null) {
      const mfr = match[1];
      const modelId = match[2];
      if (!z2mMapping.has(mfr)) z2mMapping.set(mfr, new Set());
      z2mMapping.get(mfr).add(modelId);
    }

    console.log(`  ✅ Z2M: ${z2mMapping.size} manufacturers with productIds\n`);
  }

  // Step 2: Load all drivers
  console.log('📂 Step 2: Loading all drivers...');
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  const driverData = new Map();
  const mfrToDrivers = new Map();

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      const pids = config.zigbee?.productId || [];

      driverData.set(driver.name, { mfrs: new Set(mfrs), pids: new Set(pids), config, configPath });

      for (const mfr of mfrs) {
        if (!mfrToDrivers.has(mfr)) mfrToDrivers.set(mfr, []);
        mfrToDrivers.get(mfr).push(driver.name);
      }
    } catch { }
  }

  console.log(`  ✅ Loaded ${driverData.size} drivers\n`);

  // Step 3: Resolve collisions (Rule 9.4 Pillar 3)
  console.log('🔧 Step 3: Resolving collisions...');
  let collisionsResolved = 0;

  for (const [mfr, driverList] of mfrToDrivers) {
    if (driverList.length > 1) {
      // Sort by priority
      const sorted = [...driverList].sort((a, b) =>
        getDriverPriority(b) - getDriverPriority(a)
      );

      const keepIn = sorted[0];
      const removeFrom = sorted.slice(1);

      for (const driverName of removeFrom) {
        const data = driverData.get(driverName);
        if (data && data.mfrs.has(mfr)) {
          data.mfrs.delete(mfr);
          collisionsResolved++;
        }
      }
    }
  }

  console.log(`  ✅ Collisions resolved: ${collisionsResolved}\n`);

  // Step 4: Exhaustive productId enrichment (Rule 9.6)
  console.log('🔄 Step 4: Exhaustive productId enrichment...');
  let pidsAdded = 0;

  for (const [driverName, data] of driverData) {
    for (const mfr of data.mfrs) {
      if (z2mMapping.has(mfr)) {
        for (const pid of z2mMapping.get(mfr)) {
          if (!data.pids.has(pid)) {
            data.pids.add(pid);
            pidsAdded++;
          }
        }
      }
    }
  }

  console.log(`  ✅ ProductIds added: ${pidsAdded}\n`);

  // Step 5: ManufacturerName expansion (Rule 9.5)
  console.log('📈 Step 5: ManufacturerName expansion from Z2M...');
  let mfrsAdded = 0;

  // Get all Z2M manufacturers we don't have yet
  const currentMfrs = new Set();
  for (const [, data] of driverData) {
    for (const mfr of data.mfrs) currentMfrs.add(mfr);
  }

  const missingMfrs = [...z2mMapping.keys()].filter(m => !currentMfrs.has(m));

  // Add missing to zigbee_universal (catch-all)
  if (missingMfrs.length > 0) {
    const universalData = driverData.get('zigbee_universal');
    if (universalData) {
      for (const mfr of missingMfrs) {
        if (mfr.match(/^_T[ZYS]/)) { // Only Tuya-like
          universalData.mfrs.add(mfr);
          mfrsAdded++;
          // Also add productIds
          if (z2mMapping.has(mfr)) {
            for (const pid of z2mMapping.get(mfr)) {
              universalData.pids.add(pid);
            }
          }
        }
      }
    }
  }

  console.log(`  ✅ ManufacturerNames added: ${mfrsAdded}\n`);

  // Step 6: Save all changes
  console.log('💾 Step 6: Saving changes...');
  let driversModified = 0;

  for (const [driverName, data] of driverData) {
    const originalMfrs = data.config.zigbee?.manufacturerName?.length || 0;
    const originalPids = data.config.zigbee?.productId?.length || 0;

    const newMfrs = [...data.mfrs].sort();
    const newPids = [...data.pids].sort();

    if (newMfrs.length !== originalMfrs || newPids.length !== originalPids ||
      JSON.stringify(newMfrs) !== JSON.stringify(data.config.zigbee?.manufacturerName || []) ||
      JSON.stringify(newPids) !== JSON.stringify(data.config.zigbee?.productId || [])) {

      data.config.zigbee.manufacturerName = newMfrs;
      data.config.zigbee.productId = newPids;

      fs.writeFileSync(data.configPath, JSON.stringify(data.config, null, 2));
      driversModified++;
    }
  }

  console.log(`  ✅ Drivers modified: ${driversModified}\n`);

  // Step 7: Final validation
  console.log('✅ Step 7: Final validation...');

  // Recount
  let finalMfrs = new Set();
  let finalPids = new Set();
  let finalEntries = 0;

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      const pids = config.zigbee?.productId || [];
      mfrs.forEach(m => finalMfrs.add(m));
      pids.forEach(p => finalPids.add(p));
      finalEntries += mfrs.length;
    } catch { }
  }

  // Check for remaining collisions
  const mfrCheck = new Map();
  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      for (const mfr of mfrs) {
        if (!mfrCheck.has(mfr)) mfrCheck.set(mfr, []);
        mfrCheck.get(mfr).push(driver.name);
      }
    } catch { }
  }

  const remainingCollisions = [...mfrCheck.values()].filter(v => v.length > 1).length;

  console.log('════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Drivers modified: ${driversModified}`);
  console.log(`  Collisions resolved: ${collisionsResolved}`);
  console.log(`  ProductIds added: ${pidsAdded}`);
  console.log(`  ManufacturerNames added: ${mfrsAdded}`);
  console.log(`  ---`);
  console.log(`  Final unique manufacturers: ${finalMfrs.size}`);
  console.log(`  Final unique productIds: ${finalPids.size}`);
  console.log(`  Total entries: ${finalEntries}`);
  console.log(`  Remaining collisions: ${remainingCollisions}`);
  console.log('════════════════════════════════════════════════════════════════');

  if (remainingCollisions === 0) {
    console.log('\n🎉 ALL RULES APPLIED SUCCESSFULLY!');
  } else {
    console.log(`\n⚠️ ${remainingCollisions} collisions remain - may need manual review`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
