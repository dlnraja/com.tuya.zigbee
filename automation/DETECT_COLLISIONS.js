#!/usr/bin/env node
/**
 * DETECT COLLISIONS & OVERLAPS
 *
 * Rules for safe fingerprinting:
 * 1. manufacturerName + productId must be UNIQUE across all drivers
 * 2. Same manufacturerName in multiple drivers = COLLISION RISK
 * 3. productId must match device TYPE (sensor vs switch vs TRV)
 * 4. Never add productId without verifying device type
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Device type categories
const DEVICE_TYPES = {
  sensor: ['climate_sensor', 'motion_sensor', 'contact_sensor', 'water_leak_sensor',
    'vibration_sensor', 'soil_sensor', 'presence_sensor', 'smoke_detector',
    'gas_detector', 'co_sensor', 'air_quality', 'temphumidsensor', 'lcdtemphumidsensor',
    'formaldehyde_sensor', 'rain_sensor', 'weather_station'],
  switch: ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang', 'switch_wall',
    'switch_wireless', 'module_mini_switch'],
  plug: ['plug_smart', 'plug_energy_monitor', 'usb_outlet', 'socket'],
  light: ['bulb_rgb', 'bulb_rgbw', 'bulb_dimmable', 'bulb_tunable_white', 'bulb_white',
    'led_strip', 'led_controller', 'led_strip_advanced', 'led_strip_rgbw'],
  dimmer: ['dimmer_wall_1gang', 'dimmer_dual_channel'],
  button: ['button_wireless', 'button_emergency_sos', 'scene_switch'],
  cover: ['curtain_motor', 'shutter_roller_controller', 'curtain_motor_tilt'],
  climate: ['thermostat', 'radiator_valve', 'hvac', 'smart_heater'],
  lock: ['lock_smart', 'door_controller'],
  valve: ['water_valve', 'valve_irrigation', 'valve_single'],
  other: ['siren', 'doorbell', 'gateway', 'zigbee_universal', 'generic_tuya',
    'ceiling_fan', 'power_meter', 'energy_meter', 'smart_rcbo'],
};

function getDeviceType(driverName) {
  for (const [type, patterns] of Object.entries(DEVICE_TYPES)) {
    for (const pattern of patterns) {
      if (driverName.includes(pattern) || driverName === pattern) {
        return type;
      }
    }
  }
  return 'unknown';
}

// Standard productIds by device type
const VALID_PRODUCT_IDS = {
  sensor: ['TS0201', 'TS0202', 'TS0203', 'TS0204', 'TS0205', 'TS0207', 'TS0210', 'TS0601'],
  switch: ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012', 'TS0013', 'TS0014', 'TS0601'],
  plug: ['TS0121', 'TS011F', 'TS0601'],
  light: ['TS0501A', 'TS0501B', 'TS0502A', 'TS0502B', 'TS0503A', 'TS0503B', 'TS0504A', 'TS0504B'],
  dimmer: ['TS0101', 'TS110E', 'TS110F', 'TS0601'],
  button: ['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F', 'TS0601'],
  cover: ['TS0601'],
  climate: ['TS0601'],
  lock: ['TS0601'],
  valve: ['TS0601'],
  other: ['TS0601'],
};

function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 COLLISION & OVERLAP DETECTION');
  console.log('════════════════════════════════════════════════════════════════\n');

  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  // Build maps
  const mfrToDrivers = new Map(); // manufacturerName -> [{ driver, productIds, type }]
  const mfrPidToDrivers = new Map(); // "mfr|pid" -> [drivers]
  const driverData = new Map();

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      const pids = config.zigbee?.productId || [];
      const type = getDeviceType(driver.name);

      driverData.set(driver.name, { mfrs, pids, type, config });

      for (const mfr of mfrs) {
        if (!mfrToDrivers.has(mfr)) {
          mfrToDrivers.set(mfr, []);
        }
        mfrToDrivers.get(mfr).push({ driver: driver.name, productIds: pids, type });

        // Track mfr+pid combinations
        for (const pid of pids) {
          const key = `${mfr}|${pid}`;
          if (!mfrPidToDrivers.has(key)) {
            mfrPidToDrivers.set(key, []);
          }
          mfrPidToDrivers.get(key).push(driver.name);
        }
      }
    } catch { }
  }

  // 1. Find manufacturerNames in multiple drivers (COLLISION RISK)
  console.log('🚨 COLLISION RISKS (same manufacturerName, multiple drivers):\n');

  const collisions = [];
  for (const [mfr, driverList] of mfrToDrivers) {
    if (driverList.length > 1) {
      // Check if they have different types
      const types = new Set(driverList.map(d => d.type));
      if (types.size > 1) {
        collisions.push({
          mfr,
          drivers: driverList,
          types: [...types],
          severity: 'HIGH', // Different device types = definite collision
        });
      } else {
        collisions.push({
          mfr,
          drivers: driverList,
          types: [...types],
          severity: 'MEDIUM', // Same type but multiple drivers
        });
      }
    }
  }

  // Sort by severity
  const highSeverity = collisions.filter(c => c.severity === 'HIGH');
  const mediumSeverity = collisions.filter(c => c.severity === 'MEDIUM');

  console.log(`  HIGH severity (different device types): ${highSeverity.length}`);
  console.log(`  MEDIUM severity (same type, multiple drivers): ${mediumSeverity.length}`);

  if (highSeverity.length > 0) {
    console.log('\n  ❌ HIGH SEVERITY COLLISIONS:');
    highSeverity.slice(0, 20).forEach(c => {
      console.log(`    ${c.mfr}:`);
      c.drivers.forEach(d => console.log(`      - ${d.driver} (${d.type})`));
    });
    if (highSeverity.length > 20) {
      console.log(`    ... and ${highSeverity.length - 20} more`);
    }
  }

  // 2. Find exact duplicates (same mfr + same pid in multiple drivers)
  console.log('\n\n🔴 EXACT DUPLICATES (same mfr+productId in multiple drivers):\n');

  const exactDupes = [];
  for (const [key, driverList] of mfrPidToDrivers) {
    if (driverList.length > 1) {
      const [mfr, pid] = key.split('|');
      exactDupes.push({ mfr, pid, drivers: driverList });
    }
  }

  console.log(`  Found: ${exactDupes.length}`);
  if (exactDupes.length > 0) {
    exactDupes.slice(0, 10).forEach(d => {
      console.log(`    ${d.mfr} + ${d.pid}: ${d.drivers.join(', ')}`);
    });
  }

  // 3. Find drivers without productId (incomplete fingerprint)
  console.log('\n\n⚠️ DRIVERS WITHOUT productId (incomplete fingerprint):\n');

  const noProductId = [];
  for (const [driverName, data] of driverData) {
    if (data.pids.length === 0 && data.mfrs.length > 0) {
      noProductId.push({
        driver: driverName,
        type: data.type,
        mfrCount: data.mfrs.length,
      });
    }
  }

  console.log(`  Found: ${noProductId.length}`);
  noProductId.forEach(d => {
    console.log(`    ${d.driver} (${d.type}): ${d.mfrCount} manufacturers, NO productId`);
  });

  // 4. Find productIds that don't match device type
  console.log('\n\n🟡 MISMATCHED productIds (wrong for device type):\n');

  const mismatched = [];
  for (const [driverName, data] of driverData) {
    const validPids = VALID_PRODUCT_IDS[data.type] || VALID_PRODUCT_IDS.other;

    for (const pid of data.pids) {
      if (!validPids.includes(pid) && pid !== 'TS0601') {
        mismatched.push({
          driver: driverName,
          type: data.type,
          pid,
          expected: validPids,
        });
      }
    }
  }

  console.log(`  Found: ${mismatched.length}`);
  mismatched.slice(0, 10).forEach(m => {
    console.log(`    ${m.driver}: has ${m.pid}, expected ${m.expected.slice(0, 3).join('/')}`);
  });

  // Summary
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Total drivers: ${drivers.length}`);
  console.log(`  HIGH severity collisions: ${highSeverity.length}`);
  console.log(`  MEDIUM severity collisions: ${mediumSeverity.length}`);
  console.log(`  Exact duplicates (mfr+pid): ${exactDupes.length}`);
  console.log(`  Drivers without productId: ${noProductId.length}`);
  console.log(`  Mismatched productIds: ${mismatched.length}`);
  console.log('════════════════════════════════════════════════════════════════');

  // Save report
  const report = {
    generated: new Date().toISOString(),
    summary: {
      totalDrivers: drivers.length,
      highSeverityCollisions: highSeverity.length,
      mediumSeverityCollisions: mediumSeverity.length,
      exactDuplicates: exactDupes.length,
      driversWithoutProductId: noProductId.length,
      mismatchedProductIds: mismatched.length,
    },
    highSeverityCollisions: highSeverity,
    exactDuplicates: exactDupes,
    driversWithoutProductId: noProductId,
    mismatchedProductIds: mismatched,
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'COLLISION_REPORT.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📄 Report saved to data/COLLISION_REPORT.json');

  return report;
}

if (require.main === module) {
  main();
}

module.exports = { main, getDeviceType, VALID_PRODUCT_IDS };
