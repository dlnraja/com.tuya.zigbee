/**
 * BATCH CONFLICT FIXER v5.5.105
 * Resolves conflicts by group using pattern-based rules
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../../drivers');

// PRIORITY ORDER: More specific driver wins
// When there's a conflict, remove from the LESS specific driver
const DRIVER_PRIORITY = {
  // Most specific first
  'radiator_valve': 100,
  'soil_sensor': 100,
  'smoke_detector_advanced': 100,
  'motion_sensor_radar_mmwave': 95,
  'curtain_motor': 90,
  'curtain_motor_tilt': 90,
  'dimmer_wall_1gang': 85,
  'dimmer_dual_channel': 85,
  'button_wireless_4': 80,
  'button_wireless_2': 80,
  'button_wireless_1': 75,
  'contact_sensor': 75,
  'motion_sensor': 75,
  'vibration_sensor': 75,
  'climate_sensor': 70,
  'plug_energy_monitor': 70,
  'usb_outlet_advanced': 65,
  'switch_2gang': 60,
  'switch_3gang': 60,
  'switch_4gang': 60,
  'switch_1gang': 55,
  'module_mini_switch': 50,
  'plug_smart': 50,
  'thermostat_tuya_dp': 45,
  'generic_tuya': 10,
  'zigbee_universal': 5,
};

function loadDriverCompose(driverName) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return null;
  return JSON.parse(fs.readFileSync(composePath, 'utf8'));
}

function saveDriverCompose(driverName, data) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  fs.writeFileSync(composePath, JSON.stringify(data, null, 2), 'utf8');
}

function findAllConflicts() {
  const conflicts = {};
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );

  for (const driver of drivers) {
    const compose = loadDriverCompose(driver);
    if (!compose?.zigbee?.manufacturerName || !compose.zigbee.productId) continue;

    const mfrs = Array.isArray(compose.zigbee.manufacturerName)
      ? compose.zigbee.manufacturerName
      : [compose.zigbee.manufacturerName];
    const prods = Array.isArray(compose.zigbee.productId)
      ? compose.zigbee.productId
      : [compose.zigbee.productId];

    for (const mfr of mfrs) {
      for (const prod of prods) {
        const key = `${mfr}/${prod}`;
        if (!conflicts[key]) conflicts[key] = [];
        if (!conflicts[key].includes(driver)) {
          conflicts[key].push(driver);
        }
      }
    }
  }

  return Object.entries(conflicts)
    .filter(([_, drivers]) => drivers.length > 1)
    .map(([combo, drivers]) => ({ combo, drivers }));
}

function resolveConflict(combo, drivers) {
  // Sort drivers by priority (highest first)
  const sorted = drivers.sort((a, b) => {
    const prioA = DRIVER_PRIORITY[a] || 30;
    const prioB = DRIVER_PRIORITY[b] || 30;
    return prioB - prioA;
  });

  const keeper = sorted[0];
  const toRemove = sorted.slice(1);

  return { combo, keeper, toRemove };
}

function fixConflicts() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     BATCH CONFLICT FIXER v5.5.105                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const conflicts = findAllConflicts();
  console.log(`Found ${conflicts.length} conflicts to resolve\n`);

  let resolved = 0;
  const changes = {};

  for (const { combo, drivers } of conflicts) {
    const { keeper, toRemove } = resolveConflict(combo, drivers);
    const [mfr, prod] = combo.split('/');

    for (const driver of toRemove) {
      if (!changes[driver]) changes[driver] = [];
      changes[driver].push({ mfr, prod, keeper });
    }
  }

  // Apply changes
  for (const [driver, mfrsToRemove] of Object.entries(changes)) {
    const compose = loadDriverCompose(driver);
    if (!compose) continue;

    const originalCount = compose.zigbee.manufacturerName.length;

    for (const { mfr, prod, keeper } of mfrsToRemove) {
      // Only remove if this driver has this productId
      if (!compose.zigbee.productId.includes(prod)) continue;

      const idx = compose.zigbee.manufacturerName.indexOf(mfr);
      if (idx !== -1) {
        compose.zigbee.manufacturerName.splice(idx, 1);
        console.log(`  ${mfr}/${prod}: ${driver} → ${keeper}`);
        resolved++;
      }
    }

    if (compose.zigbee.manufacturerName.length < originalCount) {
      saveDriverCompose(driver, compose);
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                         SUMMARY                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`  Conflicts resolved: ${resolved}`);
}

fixConflicts();
