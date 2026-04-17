#!/usr/bin/env node
/**
 * fix-fingerprint-conflicts.js
 * Detects and fixes fingerprint conflicts across drivers.
 * A conflict = same manufacturerName + productId in multiple drivers.
 *
 * Resolution strategy:
 * 1. TS0726 → only switch_4gang (BSEED 4-gang product)
 * 2. Cross-category conflicts: keep mfr in most specialized driver
 * 3. Same-category: keep in driver with matching non-TS0601 productId
 * 4. generic_diy vs diy_custom_zigbee: keep in diy_custom_zigbee
 *
 * Usage: node scripts/automation/fix-fingerprint-conflicts.js [--dry-run] [--report-only]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { DRIVERS_DIR, STATE_DIR, writeDriverJson } = require('../lib/drivers');

const DRY_RUN = process.argv.includes('--dry-run');
const REPORT_ONLY = process.argv.includes('--report-only');
const DDIR = DRIVERS_DIR;

// Device category mapping for conflict resolution priority
const CATEGORY = {
  // Switches
  switch_1gang: 'switch', switch_2gang: 'switch', switch_3gang: 'switch',
  switch_4gang: 'switch', switch_wall_5gang: 'switch', switch_wall_6gang: 'switch',
  switch_wall_8gang: 'switch', wall_switch_1gang_1way: 'switch',
  wall_switch_2gang_1way: 'switch', wall_switch_3gang_1way: 'switch',
  // Dimmers
  dimmer_wall_1gang: 'dimmer', switch_dimmer_1gang: 'dimmer',
  dimmer_dual_channel: 'dimmer', dimmer_3gang: 'dimmer',
  // Covers
  curtain_motor: 'cover', curtain_motor_tilt: 'cover',
  shutter_roller_controller: 'cover', garage_door: 'cover',
  // Sensors
  climate_sensor: 'sensor', contact_sensor: 'sensor', motion_sensor: 'sensor',
  water_leak_sensor: 'sensor', vibration_sensor: 'sensor',
  illuminance_sensor: 'sensor', soil_sensor: 'sensor', rain_sensor: 'sensor',
  // Presence/radar
  presence_sensor_radar: 'radar', motion_sensor_radar_mmwave: 'radar',
  presence_sensor_ceiling: 'radar',
  // Smoke/gas
  smoke_detector_advanced: 'safety', gas_detector: 'safety',
  gas_sensor: 'safety', co_sensor: 'safety',
  // Thermostat
  thermostat_tuya_dp: 'thermostat', radiator_valve: 'thermostat',
  radiator_controller: 'thermostat', smart_heater: 'thermostat',
  smart_heater_controller: 'thermostat',
  // Plugs/power
  plug_energy_monitor: 'plug', plug_smart: 'plug',
  din_rail_switch: 'power', din_rail_meter: 'power',
  power_clamp_meter: 'power', power_meter: 'power',
  energy_meter_3phase: 'power', smart_breaker: 'power', smart_rcbo: 'power',
  // Valves
  valve_single: 'valve', water_valve_smart: 'valve',
  valve_irrigation: 'valve',
  // Lights
  bulb_dimmable: 'light', bulb_rgbcct: 'light', bulb_cct: 'light',
  led_controller_dimmable: 'light', led_strip_rgbcct: 'light',
  // Buttons
  button_wireless_1: 'button', button_wireless_2: 'button',
  button_wireless_3: 'button', button_wireless_4: 'button',
  button_emergency_sos: 'button',
  // DIY
  diy_custom_zigbee: 'diy', generic_diy: 'diy',
  // Other
  ir_blaster: 'ir', pet_feeder: 'pet', fingerprint_lock: 'lock',
  pool_pump: 'pump', humidifier: 'hvac', air_purifier: 'hvac',
  hvac_air_conditioner: 'hvac', hvac_dehumidifier: 'hvac',
  fan_controller: 'fan', ceiling_fan: 'fan',
  scene_switch_4: 'scene', smart_knob_rotary: 'scene',
  water_tank_monitor: 'monitor', usb_outlet_advanced: 'plug',
  usb_dongle_dual_repeater: 'repeater', zigbee_repeater: 'repeater',
  // Added v5.12.0: missing categories
  wall_switch_4gang_1way: 'switch', wall_curtain_switch: 'cover',
  lcdtemphumidsensor: 'sensor', temphumidsensor: 'sensor',
  formaldehyde_sensor: 'sensor', air_quality_comprehensive: 'sensor',
  air_quality_co2: 'sensor', smart_lcd_thermostat: 'thermostat',
  floor_heating_thermostat: 'thermostat', hvac_controller: 'thermostat',
  thermostat_4ch: 'thermostat', door_controller: 'cover',
  garage_door_opener: 'cover', smart_knob: 'button', smart_knob_switch: 'button',
  button_wireless_6: 'button', button_wireless_8: 'button',
  scene_switch_1: 'scene', scene_switch_2: 'scene', scene_switch_3: 'scene',
  scene_switch_6: 'scene', wall_remote_1_gang: 'button',
  wall_remote_2_gang: 'button', wall_remote_3_gang: 'button',
  wall_remote_4_gang: 'button', wall_remote_4_gang_2: 'button',
  wall_remote_4_gang_3: 'button', wall_remote_6_gang: 'button',
  smart_remote_1_button: 'button', smart_remote_1_button_2: 'button',
  smart_remote_4_buttons: 'button', handheld_remote_4_buttons: 'button',
  smart_button_switch: 'button', bulb_rgb: 'light', bulb_rgbw: 'light',
  bulb_tunable_white: 'light', bulb_white: 'light',
  led_strip: 'light', led_strip_advanced: 'light', led_strip_rgbw: 'light',
  led_controller_cct: 'light', led_controller_rgb: 'light',
  module_mini_switch: 'switch', generic_tuya: 'diy', universal_fallback: 'diy',
  siren: 'safety', doorbell: 'safety', lock_smart: 'lock',
  pet_feeder_zigbee: 'pet', water_valve_garden: 'valve',
  // Added v5.13.0: Hybrid drivers
  sensor_motion_presence_hybrid: 'hybrid', sensor_presence_radar_hybrid: 'hybrid',
  sensor_climate_water_hybrid: 'hybrid', sensor_climate_temphumidsensor_hybrid: 'hybrid',
  sensor_contact_motion_hybrid: 'hybrid', sensor_contact_presence_hybrid: 'hybrid',
  sensor_motion_radar_hybrid: 'hybrid', plug_energy_monitor_hybrid: 'hybrid',
  switch_hybrid: 'hybrid', smart_knob_rotary_hybrid: 'hybrid',
  smart_knob_switch_hybrid: 'hybrid',
};

// Specialization score: higher = more specialized, wins conflicts
const SPECIALIZATION = {
  'hybrid': 100, // Hybrid drivers always win
  'cover': 90, 'thermostat': 85, 'radar': 85, 'safety': 80,
  'valve': 80, 'lock': 80, 'pet': 80, 'ir': 75, 'pump': 75,
  'monitor': 75, 'hvac': 70, 'fan': 70, 'scene': 70,
  'power': 65, 'plug': 60, 'light': 60, 'button': 60,
  'sensor': 55, 'dimmer': 50, 'switch': 40, 'repeater': 30, 'diy': 20,
};

function loadDrivers() {
  const drivers = new Map();
  for (const d of fs.readdirSync(DDIR).filter(d => {
    try { return fs.statSync(path.join(DDIR, d)).isDirectory(); } catch { return false; }
  })) {
    const cf = path.join(DDIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const raw = fs.readFileSync(cf, 'utf8');
      const c = JSON.parse(raw);
      drivers.set(d, {
        path: cf, raw, config: c,
        mfrs: new Set(c.zigbee?.manufacturerName || []),
        pids: new Set(c.zigbee?.productId || []),
        category: CATEGORY[d] || 'unknown',
      });
    } catch {}
  }
  return drivers;
}

function findConflicts(drivers) {
  const exactMap = new Map(); // mfr|pid -> [driverName]
  for (const [name, d] of drivers) {
    for (const m of d.mfrs) {
      const pids = d.pids.size > 0 ? Array.from(d.pids) : ['*'];
      for (const p of pids) {
        const key = m.toLowerCase() + '|' + (p || '*');
        if (!exactMap.has(key)) exactMap.set(key, []);
        exactMap.get(key).push(name);
      }
    }
  }
  const conflicts = [];
  for (const [key, drvs] of exactMap) {
    const unique = [...new Set(drvs)];
    if (unique.length > 1) {
      const [mfr, pid] = key.split('|');
      conflicts.push({ mfr, pid, drivers: unique });
    }
  }
  return conflicts;
}

// Safety: track how many mfrs each driver will have after removals
const removalCounts = new Map(); // driver -> count of planned removals

function resolveConflict(conflict, drivers) {
  const { mfr, pid, drivers: drvNames } = conflict;
  const removals = []; // [{driver, mfr}]

  // Rule 1: generic_diy loses to diy_custom_zigbee
  if (drvNames.includes('generic_diy') && drvNames.includes('diy_custom_zigbee')) {
    removals.push({ driver: 'generic_diy', mfr, reason: 'diy_custom_zigbee takes priority' });
    return removals;
  }

  // Rule 1.4: TS0203 (Contact Sensor) MUST stay in contact_sensor
  // it is often hijacked by presence_sensor_radar or universal_fallback
  if (pid.toUpperCase() === 'TS0203' && drvNames.includes('contact_sensor')) {
    for (const d of drvNames.filter(name => name !== 'contact_sensor')) {
      removals.push({ driver: d, mfr, reason: 'TS0203 is a contact sensor' });
    }
    return removals;
  }

  // Rule 1.5: climate_sensor is a catch-all — loses to ANY specialized driver
  if (drvNames.includes('climate_sensor') && drvNames.length === 2) {
    const other = drvNames.find(d => d !== 'climate_sensor');
    const otherCat = drivers.get(other)?.category || 'unknown';
    // climate_sensor loses to everything except diy/unknown
    if (otherCat !== 'diy' && otherCat !== 'unknown') {
      const planned = removalCounts.get('climate_sensor') || 0;
      const csCount = drivers.get('climate_sensor')?.mfrs?.size || 0;
      if (csCount - planned - 1 >= 3) {
        removals.push({ driver: 'climate_sensor', mfr, reason: 'climate_sensor catch-all loses to ' + otherCat + '(' + other + ')' });
        removalCounts.set('climate_sensor', planned + 1);
        return removals;
      }
    }
  }

  // Rule 1.10: TS0601 (Catch-all) deprioritization
  // If we have a conflict between TS0601 and a specific model ID (like TS0502B or TS0001)
  // The specific model ID driver SHOULD WIN if it exists.
  if (pid.toUpperCase() === 'TS0601' && drvNames.some(d => CATEGORY[d] !== 'diy' && d !== 'generic_tuya')) {
     const specialized = drvNames.find(d => CATEGORY[d] !== 'diy' && d !== 'generic_tuya' && d !== 'universal_fallback');
     if (specialized) {
        for (const loser of drvNames.filter(d => d !== specialized)) {
           removals.push({ driver: loser, mfr, reason: 'TS0601 conflict: specialized driver ' + specialized + ' wins' });
        }
        return removals;
     }
  }

  // Rule 1.6: Same-gang switch variants (switch_Xgang vs wall_switch_Xgang_1way)
  // These are legitimate overlaps — same device, different wiring. Keep both.
  const switchPairs = [
    ['switch_1gang', 'wall_switch_1gang_1way'],
    ['switch_2gang', 'wall_switch_2gang_1way'],
    ['switch_3gang', 'wall_switch_3gang_1way'],
    ['switch_4gang', 'wall_switch_4gang_1way'],
  ];
  for (const [a, b] of switchPairs) {
    if (drvNames.includes(a) && drvNames.includes(b) && drvNames.length === 2) {
      return []; // intentional overlap, no action
    }
  }

  // Rule 1.7: Button wireless vs wall remote (same gang count = intentional overlap)
  const buttonPairs = [
    ['button_wireless_1', 'wall_remote_1_gang'],
    ['button_wireless_2', 'wall_remote_2_gang'],
    ['button_wireless_3', 'wall_remote_3_gang'],
    ['button_wireless_4', 'wall_remote_4_gang'],
    ['button_wireless_4', 'wall_remote_4_gang_3'],
  ];
  for (const [a, b] of buttonPairs) {
    if (drvNames.includes(a) && drvNames.includes(b) && drvNames.length === 2) {
      return []; // intentional overlap for button remotes
    }
  }

  // Rule 1.8: bulb_rgb vs bulb_rgbw — keep both (intentional feature overlap)
  if (drvNames.includes('bulb_rgb') && drvNames.includes('bulb_rgbw') && drvNames.length === 2) {
    return []; // intentional overlap
  }

  // Rule 1.9: temphumidsensor vs lcdtemphumidsensor — climate_sensor loses to both
  // But between themselves, keep both (LCD vs non-LCD variant)

  // Rule 2: Cross-category conflicts — most specialized wins
  const categories = drvNames.map(d => ({
    name: d,
    cat: drivers.get(d)?.category || 'unknown',
    score: SPECIALIZATION[drivers.get(d)?.category] || 0,
    mfrCount: (drivers.get(d)?.mfrs?.size || 0),
  }));

  const uniqueCats = new Set(categories.map(c => c.cat));
  if (uniqueCats.size > 1) {
    const sorted = categories.sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    for (const loser of sorted.slice(1)) {
      if (loser.cat === winner.cat) continue;
      // Safety: require minimum score gap of 15 to auto-resolve
      if (winner.score - loser.score < 15) continue;
      // Safety: don't reduce a driver below 3 manufacturers
      const planned = removalCounts.get(loser.name) || 0;
      if (loser.mfrCount - planned - 1 < 3) continue;
      removals.push({
        driver: loser.name, mfr,
        reason: `${winner.cat}(${winner.name}) beats ${loser.cat}(${loser.name})`,
      });
      removalCounts.set(loser.name, planned + 1);
    }
    return removals;
  }

  // Rule 3: Same-category radar — presence_sensor_radar wins
  if (uniqueCats.size === 1 && categories[0].cat === 'radar') {
    const pri = ['presence_sensor_radar', 'presence_sensor_ceiling'];
    const winner = drvNames.find(d => pri.includes(d));
    if (winner) {
      for (const loser of drvNames.filter(d => d !== winner)) {
        const planned = removalCounts.get(loser) || 0;
        const lc = drivers.get(loser)?.mfrs?.size || 0;
        if (lc - planned - 1 < 3) continue;
        removals.push({ driver: loser, mfr, reason: `radar: ${winner} primary` });
        removalCounts.set(loser, planned + 1);
      }
    }
  }
  return removals;
}

function main() {
  const drivers = loadDrivers();
  console.log(`Loaded ${drivers.size} drivers`);

  const conflicts = findConflicts(drivers);
  console.log(`Found ${conflicts.length} conflicts (same mfr+pid in multiple drivers)\n`);

  if (REPORT_ONLY) {
    // Group by driver pair
    const groups = new Map();
    for (const c of conflicts) {
      const key = c.drivers.sort().join(' & ');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    for (const [pair, items] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 40)) {
      console.log(`${items.length}x: ${pair}`);
    }
    console.log(`\nTotal: ${conflicts.length} conflicts in ${groups.size} groups`);

    // Save report with full details for CI visibility
    const groupDetails = {};
    for (const [pair, items] of groups) {
      groupDetails[pair] = items.map(i => ({ mfr: i.mfr, pid: i.pid }));
    }
    const report = {
      timestamp: new Date().toISOString(),
      total: conflicts.length,
      groups: groups.size,
      caseInsensitive: true,
      details: groupDetails,
    };
    const reportPath = path.join(__dirname, '..', '..', '.github', 'state', 'fingerprint-conflicts.json');
    try {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`Report saved to ${reportPath}`);
    } catch {}
    return;
  }

  // Resolve conflicts
  const allRemovals = new Map(); // driver -> Set<mfr>
  let resolved = 0, unresolved = 0;

  for (const c of conflicts) {
    const removals = resolveConflict(c, drivers);
    if (removals.length > 0) {
      resolved++;
      for (const r of removals) {
        if (!allRemovals.has(r.driver)) allRemovals.set(r.driver, new Map());
        allRemovals.get(r.driver).set(r.mfr, r.reason);
      }
    } else {
      unresolved++;
    }
  }

  console.log(`Resolved: ${resolved}, Unresolved (same-category): ${unresolved}`);
  console.log(`Drivers to modify: ${allRemovals.size}\n`);

  // Apply removals
  let totalRemoved = 0;
  for (const [driverName, mfrRemovals] of allRemovals) {
    const d = drivers.get(driverName);
    if (!d) continue;

    const mfrsToRemove = new Set(mfrRemovals.keys());
    const currentMfrs = d.config.zigbee?.manufacturerName || [];
    const newMfrs = currentMfrs.filter(m => !mfrsToRemove.has(m.toLowerCase()));
    const removed = currentMfrs.length - newMfrs.length;

    if (removed === 0) continue;
    totalRemoved += removed;

    console.log(`${driverName}: removing ${removed} mfrs (keeping ${newMfrs.length})`);
    if (removed <= 5) {
      for (const [m, reason] of mfrRemovals) {
        if (currentMfrs.includes(m)) console.log(`  - ${m}: ${reason}`);
      }
    }

    if (!DRY_RUN) {
      d.config.zigbee.manufacturerName = newMfrs;
      fs.writeFileSync(d.path, JSON.stringify(d.config, null, 2) + '\n');
    }
  }

  console.log(`\nTotal fingerprints removed: ${totalRemoved}`);
  if (DRY_RUN) console.log('(DRY RUN — no files modified)');

  // Re-check conflicts after fix
  if (!DRY_RUN && totalRemoved > 0) {
    const driversAfter = loadDrivers();
    const conflictsAfter = findConflicts(driversAfter);
    console.log(`\nAfter fix: ${conflictsAfter.length} conflicts remaining (was ${conflicts.length})`);
  }

  // Save state
  const state = {
    timestamp: new Date().toISOString(),
    before: conflicts.length,
    resolved,
    removed: totalRemoved,
    unresolved,
    dryRun: DRY_RUN,
  };
  const statePath = path.join(__dirname, '..', '..', '.github', 'state', 'conflict-fix-report.json');
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch {}
}

main();





