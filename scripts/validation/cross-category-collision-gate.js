#!/usr/bin/env node
/**
 * cross-category-collision-gate.js
 * Validates that no fingerprint (manufacturerName + productId) appears in
 * drivers of different categories. This catches misassigned FPs like a
 * radar fingerprint ending up in a climate_sensor driver.
 *
 * Exit code 1 = critical cross-category collision found
 * Exit code 0 = clean (no cross-category collisions)
 *
 * Usage: node scripts/validation/cross-category-collision-gate.js [--fix]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FIX_MODE = process.argv.includes('--fix');
const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

// Category mapping — must match fix-fingerprint-conflicts.js CATEGORY
const CATEGORY = {
  switch_1gang: 'switch', switch_2gang: 'switch', switch_3gang: 'switch',
  switch_4gang: 'switch', switch_wall_5gang: 'switch', switch_wall_6gang: 'switch',
  switch_wall_8gang: 'switch', wall_switch_1gang_1way: 'switch',
  wall_switch_2gang_1way: 'switch', wall_switch_3gang_1way: 'switch',
  wall_switch_4gang_1way: 'switch', wall_switch_5_gang_tuya: 'switch',
  dimmer_wall_1gang: 'dimmer', switch_dimmer_1gang: 'dimmer',
  dimmer_dual_channel: 'dimmer', dimmer_3gang: 'dimmer',
  curtain_motor: 'cover', curtain_motor_tilt: 'cover',
  shutter_roller_controller: 'cover', garage_door: 'cover',
  door_controller: 'cover', garage_door_opener: 'cover',
  wall_curtain_switch: 'cover',
  climate_sensor: 'sensor', contact_sensor: 'sensor', motion_sensor: 'sensor',
  water_leak_sensor: 'sensor', vibration_sensor: 'sensor',
  illuminance_sensor: 'sensor', soil_sensor: 'sensor', rain_sensor: 'sensor',
  lcdtemphumidsensor: 'sensor', temphumidsensor: 'sensor',
  formaldehyde_sensor: 'sensor', air_quality_comprehensive: 'sensor',
  air_quality_co2: 'sensor', doorwindowsensor_2: 'sensor',
  contact_sensor_zigbee: 'sensor', sensor_contact_water: 'sensor',
  sensor_contact_zigbee: 'sensor',
  bed_sensor: 'sensor',
  sensor_climate_temphumidsensor: 'sensor',
  sensor_climate_air_quality: 'sensor',
  motion_sensor: 'sensor',
  presence_sensor: 'sensor',
  pir_mmwave_sensor: 'radar',
  presence_sensor_radar: 'radar', motion_sensor_radar_mmwave: 'radar',
  presence_sensor_ceiling: 'radar', radar_sensor_ceiling: 'radar',
  smoke_detector_advanced: 'safety', gas_detector: 'safety',
  gas_sensor: 'safety', co_sensor: 'safety',
  thermostat_tuya_dp: 'thermostat', radiator_valve: 'thermostat',
  radiator_controller: 'thermostat', smart_heater: 'thermostat',
  smart_heater_controller: 'thermostat',
  plug_energy_monitor: 'plug', plug_smart: 'plug', smartplug: 'plug',
  din_rail_switch: 'power', din_rail_meter: 'power',
  power_clamp_meter: 'power', power_meter: 'power',
  energy_meter_3phase: 'power', smart_breaker: 'power', smart_rcbo: 'power',
  valve_single: 'valve', water_valve_smart: 'valve',
  valve_irrigation: 'valve', water_valve_garden: 'valve',
  bulb_dimmable: 'light', bulb_rgbcct: 'light', bulb_cct: 'light',
  bulb_rgb: 'light', bulb_rgbw: 'light', bulb_tunable_white: 'light',
  bulb_white: 'light', led_strip: 'light', led_strip_advanced: 'light',
  led_strip_rgbw: 'light', led_controller_dimmable: 'light',
  led_controller_cct: 'light', led_controller_rgb: 'light',
  button_wireless_1: 'button', button_wireless_2: 'button',
  button_wireless_3: 'button', button_wireless_4: 'button',
  button_wireless_6: 'button', button_wireless_8: 'button',
  button_emergency_sos: 'button', smart_button_switch: 'button',
  smart_knob: 'button', smart_knob_switch: 'button', smart_knob_rotary: 'button',
  scene_switch_1: 'scene', scene_switch_2: 'scene', scene_switch_3: 'scene',
  scene_switch_4: 'scene', scene_switch_6: 'scene',
  wall_remote_1_gang: 'button', wall_remote_2_gang: 'button',
  wall_remote_3_gang: 'button', wall_remote_4_gang: 'button',
  wall_remote_4_gang_2: 'button', wall_remote_4_gang_3: 'button',
  wall_remote_6_gang: 'button',
  smart_remote_1_button: 'button', smart_remote_1_button_2: 'button',
  smart_remote_4_buttons: 'button', handheld_remote_4_buttons: 'button',
  ir_blaster: 'ir', pet_feeder: 'pet', pet_feeder_zigbee: 'pet',
  fingerprint_lock: 'lock', lock_smart: 'lock',
  pool_pump: 'pump', humidifier: 'hvac', air_purifier: 'hvac',
  hvac_air_conditioner: 'hvac', hvac_dehumidifier: 'hvac',
  hvac_controller: 'thermostat', smart_lcd_thermostat: 'thermostat',
  floor_heating_thermostat: 'thermostat', thermostat_4ch: 'thermostat',
  fan_controller: 'fan', ceiling_fan: 'fan',
  water_tank_monitor: 'monitor', usb_outlet_advanced: 'plug',
  usb_dongle_dual_repeater: 'repeater', zigbee_repeater: 'repeater',
  siren: 'safety', doorbell: 'safety',
  diy_custom_zigbee: 'diy', generic_diy: 'diy',
  generic_tuya: 'diy', universal_fallback: 'diy',
  module_mini_switch: 'switch',
};

// Specialization score: higher = more specialized, wins conflicts
const SPECIALIZATION = {
  cover: 90, thermostat: 85, radar: 85, safety: 80,
  valve: 80, lock: 80, pet: 80, ir: 75, pump: 75,
  monitor: 75, hvac: 70, fan: 70, scene: 70,
  power: 65, plug: 60, light: 60, button: 60,
  sensor: 55, dimmer: 50, switch: 40, repeater: 30, diy: 20,
};

function loadDrivers() {
  const drivers = new Map();
  for (const d of fs.readdirSync(DRIVERS_DIR)) {
    const dp = path.join(DRIVERS_DIR, d);
    if (!fs.statSync(dp).isDirectory()) continue;
    const cf = path.join(dp, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
      drivers.set(d, {
        path: cf,
        config: c,
        mfrs: new Set((c.zigbee?.manufacturerName || []).map(m => m.toLowerCase())),
        pids: new Set(c.zigbee?.productId || []),
        category: CATEGORY[d] || 'unknown',
      });
    } catch {}
  }
  return drivers;
}

// Generic PIDs that are used across ALL device types — skip for cross-category detection
const GENERIC_PIDS = new Set([
  'TS0601', 'TS0001', 'TS0002', 'TS0003', 'TS0004',
  'TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F',
  'TS0201', 'TS0121', 'TS011F', 'TS0202', 'TS0225', 'TY0202',
  'Tuya', 'Zigbee', '_TZE200', '_TZE204', '_TZE284', '_TZ3000',
  // Aqara/Xiaomi PIDs shared across sensor/radar/bed drivers
  '3305-S', '3325-S', '3326-L', 'CK-TLSR8656-SS5-01(7002)',
  'E1525/E1745', 'E1745', 'IH012-RT01', 'lumi.motion.ac02',
  'lumi.motion.agl04', 'lumi.sensor_motion', 'lumi.sensor_motion.aq2',
  'MS01', 'MSO1', 'RH3040', 'SML001', 'SML002', 'SML003', 'SML004',
  'TRADFRI motion sensor', 'ZG-204Z',
  // BSEED/switch PIDs shared across bulb/dimmer
  'TS0052', 'TS1101', 'TS110E', 'TS110F',
  // eWeLink PIDs shared across modules/plugs
  'ZBMINIL2', 'ZBMINI-L2',
  // Radiator valve PIDs in generic_diy
  'eTRV0100',
]);

function findCrossCategoryConflicts(drivers) {
  // Build mfr|pid -> [{driver, category}], skipping generic PIDs
  const fpMap = new Map();
  for (const [name, d] of drivers) {
    for (const m of d.mfrs) {
      for (const p of d.pids) {
        // Skip generic PIDs — they're used across all device types
        if (GENERIC_PIDS.has(p)) continue;
        const key = `${m}|${p}`;
        if (!fpMap.has(key)) fpMap.set(key, []);
        fpMap.get(key).push({ driver: name, category: d.category });
      }
    }
  }

  const conflicts = [];
  for (const [key, entries] of fpMap) {
    const uniqueDrivers = [...new Set(entries.map(e => e.driver))];
    if (uniqueDrivers.length <= 1) continue;

    // Filter out 'unknown' category drivers — we can't make decisions about them
    const knownEntries = entries.filter(e => e.category !== 'unknown');
    if (knownEntries.length <= 1) continue; // Need at least 2 known-category drivers

    const knownDrivers = [...new Set(knownEntries.map(e => e.driver))];
    if (knownDrivers.length <= 1) continue;

    const categories = [...new Set(knownEntries.map(e => e.category))];
    if (categories.length <= 1) continue; // Same category = OK

    // Cross-category conflict!
    const [mfr, pid] = key.split('|');
    const ranked = knownEntries
      .map(e => ({ ...e, score: SPECIALIZATION[e.category] || 0 }))
      .sort((a, b) => b.score - a.score);

    conflicts.push({
      mfr, pid,
      drivers: knownDrivers,
      categories,
      winner: ranked[0].driver,
      losers: ranked.slice(1).map(e => e.driver),
    });
  }
  return conflicts;
}

// ─── Main ───
const drivers = loadDrivers();
const conflicts = findCrossCategoryConflicts(drivers);

if (conflicts.length === 0) {
  console.log('✅ Cross-category collision gate: PASS — 0 cross-category conflicts');
  process.exit(0);
}

console.error(`❌ CROSS-CATEGORY COLLISIONS: ${conflicts.length} found\n`);
for (const c of conflicts) {
  console.error(`  ❌ ${c.mfr} | ${c.pid}`);
  console.error(`     Drivers: ${c.drivers.join(', ')}`);
  console.error(`     Categories: ${c.categories.join(', ')}`);
  console.error(`     Winner: ${c.winner} (score ${SPECIALIZATION[CATEGORY[c.winner]] || 0})`);
  console.error(`     Losers: ${c.losers.join(', ')}`);
  console.error('');
}

if (FIX_MODE) {
  console.log('🔧 Auto-fix mode: removing losers from conflicting FPs...');
  let fixed = 0;
  for (const c of conflicts) {
    for (const loser of c.losers) {
      const d = drivers.get(loser);
      if (!d) continue;
      const mfrs = d.config.zigbee?.manufacturerName || [];
      const newMfrs = mfrs.filter(m => m.toLowerCase() !== c.mfr);
      if (newMfrs.length < mfrs.length) {
        d.config.zigbee.manufacturerName = newMfrs;
        fs.writeFileSync(d.path, JSON.stringify(d.config, null, 2) + '\n');
        console.log(`  🔧 Removed ${c.mfr} from ${loser}`);
        fixed++;
      }
    }
  }
  console.log(`\n✅ Auto-fixed ${fixed} cross-category collision(s)`);
}

// Output GitHub annotations
for (const c of conflicts) {
  console.log(`::warning file=drivers/${c.drivers[0]}/driver.compose.json::Cross-category collision: ${c.mfr}|${c.pid} in ${c.drivers.join(' vs ')}`);
}

process.exit(FIX_MODE ? 0 : 1);
