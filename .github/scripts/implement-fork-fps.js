#!/usr/bin/env node
'use strict';
/**
 * implement-fork-fps.js — intelligent fork FP integration (P2200)
 *
 * WHY: forks carry missing mfrs; blind dump into compose degrades pairing.
 * HOW: map driver aliases → skip sinks/generics → misattribution lock →
 *      case-CI dedupe → mfr-only adds (no invented pids) → sacred gate after.
 * WHO: master enrich / monthly enrichment.
 * WHEN: after scan-forks-recursive / deep-fork-integrator.
 * AGAINST: cartesian pid invent, generic_tuya dumps, sacred-couple collisions.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DDIR = path.join(ROOT, 'drivers');
const FORK_FPS = path.join(__dirname, '..', 'state', 'new-fork-fps.json');
const REGISTRY = path.join(ROOT, 'data', 'user-misattribution-registry.json');
const DRY = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

const DRIVER_MAP = {
  switch_1_gang: 'switch_1gang',
  switch_2_gang: 'switch_2gang',
  switch_3_gang: 'switch_3gang',
  switch_4_gang: 'switch_4gang',
  wall_switch_1_gang: 'wall_switch_1gang_1way',
  wall_switch_2_gang: 'wall_switch_2gang_1way',
  wall_switch_3_gang: 'wall_switch_3gang_1way',
  wall_switch_4_gang: 'wall_switch_4gang_1way',
  smoke_sensor: 'smoke_sensor',
  smoke_detector: 'smoke_sensor',
  rain_sensor_simple: 'rain_sensor',
  rainsensor: 'rain_sensor',
  rainsensor2: 'rain_sensor',
  doorwindowsensor: 'contact_sensor',
  doorwindowsensor_2: 'contact_sensor',
  doorwindowsensor_4: 'contact_sensor',
  flood_sensor: 'water_leak_sensor',
  pirsensor: 'motion_sensor',
  pir_sensor_2: 'motion_sensor',
  motion_sensor_3: 'motion_sensor',
  rgb_bulb_E27: 'bulb_rgb',
  lcdtemphumidsensor: 'climate_sensor',
  temphumidsensor: 'climate_sensor',
  soilsensor2: 'soil_sensor',
  occupancy_sensor: 'presence_sensor_radar',
  radar_sensor: 'presence_sensor_radar',
  smartplug: 'plug_smart',
  device_radiator_valve: 'thermostat_radiator_valve',
  wall_thermostat: 'thermostat',
  curtain_motor_shutter: 'curtain_motor',
  light_bulb_dimmable_tunable: 'bulb_white_ambiance',
  tuya_dummy_device: null,
  generic_tuya: null,
  generic_diy: null,
  universal_zigbee: null,
  zigbee_universal: null,
  hybrid_fan_sensor: null,
};

const SINK_DRIVERS = new Set([
  'generic_tuya', 'generic_diy', 'universal_zigbee', 'zigbee_universal',
  'tuya_dummy_device', 'hybrid_fan_sensor',
]);

function isValidFP(mfr) {
  if (!mfr || mfr.length < 6) return false;
  if (mfr.includes('xxxxxxxx')) return false;
  if (/ts0\d{3}$/i.test(mfr)) return false;
  if (/TS0\d{3}$/.test(mfr) && mfr.length > 15) return false;
  if (mfr === 'undefined' || mfr === 'null') return false;
  if (/^_?(GENERIC|HYBRID|PLACEHOLDER)/i.test(mfr)) return false;
  if (/needs_device_assignment/i.test(mfr)) return false;
  if (/^_generic_/i.test(mfr)) return false;
  if (/dummy|placeholder|xxxxxxxx|needs_device/i.test(mfr)) return false;
  // Prefer real Tuya / OEM shapes
  if (!/^(_TZ|_TYZB|_TZE|HOBEIAN|SONOFF|eWeLink|TUYATEC|LUMI|Xiaomi|IKEA|ORVIBO|HEIMAN|Develco|Third_Reality|WOOX|Nedis|Nous|Moes)/i.test(mfr)
    && !/^[A-Za-z][A-Za-z0-9_-]{3,}$/.test(mfr)) {
    return false;
  }
  return true;
}

function loadMisattribution() {
  const byMfr = new Map(); // lower mfr -> { canonical, forbidden:Set }
  try {
    const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
    for (const c of reg.cases || []) {
      const canonical = c.canonicalDriver;
      const forbidden = new Set(c.forbiddenDrivers || []);
      for (const m of c.mfr || []) {
        byMfr.set(String(m).toLowerCase(), { canonical, forbidden });
      }
    }
  } catch (_e) { /* optional */ }
  return byMfr;
}

function resolveDriver(raw, driverFiles, misattr, mfr, mfrToDrivers) {
  if (!raw) return null;
  if (DRIVER_MAP[raw] === null) return null;
  if (SINK_DRIVERS.has(raw)) return null;
  if (/^custom_/i.test(raw)) return null;

  let drv = DRIVER_MAP[raw] || raw;
  const lock = misattr.get(String(mfr).toLowerCase());
  if (lock) {
    if (lock.forbidden.has(drv)) {
      drv = lock.canonical;
    } else if (lock.canonical && driverFiles[lock.canonical]) {
      if (drv !== lock.canonical && lock.forbidden.size > 0) {
        if (!driverFiles[drv] || lock.forbidden.has(drv)) drv = lock.canonical;
      }
    }
  }

  // Sibling lock: TZE200/204/284 same suffix → prefer existing owner driver
  const sib = String(mfr).match(/^(_TZE)(200|204|284)_(.+)$/i);
  if (sib) {
    const suffix = sib[3].toLowerCase();
    for (const pref of ['200', '204', '284']) {
      const key = `_tze${pref}_${suffix}`;
      const owners = mfrToDrivers.get(key);
      if (owners && owners.length) {
        const preferred = owners.find((d) => !SINK_DRIVERS.has(d)) || owners[0];
        if (preferred && driverFiles[preferred]) {
          drv = preferred;
          break;
        }
      }
    }
  }

  if (!driverFiles[drv]) return null;
  if (SINK_DRIVERS.has(drv)) return null;
  return drv;
}

function main() {
  console.log('=== Implement Fork FPs intelligent (P2200)' + (DRY ? ' [DRY]' : '') + ' ===');

  if (!fs.existsSync(FORK_FPS)) {
    console.log('No new-fork-fps.json — skip');
    return;
  }

  const misattr = loadMisattribution();
  const allMfrsCI = new Set();
  const mfrToDrivers = new Map();
  const driverFiles = {};
  const dirs = fs.readdirSync(DDIR).filter((d) =>
    fs.existsSync(path.join(DDIR, d, 'driver.compose.json'))
  );
  for (const d of dirs) {
    const fp = path.join(DDIR, d, 'driver.compose.json');
    const f = JSON.parse(fs.readFileSync(fp, 'utf8'));
    driverFiles[d] = { path: fp, data: f };
    for (const m of f.zigbee?.manufacturerName || []) {
      const key = String(m).toLowerCase();
      allMfrsCI.add(key);
      if (!mfrToDrivers.has(key)) mfrToDrivers.set(key, []);
      mfrToDrivers.get(key).push(d);
    }
  }
  console.log(`Local: ${dirs.length} drivers, ${allMfrsCI.size} FPs (CI)`);

  const forkFPs = JSON.parse(fs.readFileSync(FORK_FPS, 'utf8'));
  console.log(`Fork FPs: ${Object.keys(forkFPs).length}`);

  const toAdd = {};
  let skipped = 0;
  let invalid = 0;
  let alreadyHave = 0;
  let remapped = 0;

  for (const [mfr, info] of Object.entries(forkFPs)) {
    if (allMfrsCI.has(String(mfr).toLowerCase())) { alreadyHave++; continue; }
    if (!isValidFP(mfr)) { invalid++; continue; }

    const raw = info.driver;
    const drv = resolveDriver(raw, driverFiles, misattr, mfr, mfrToDrivers);
    if (!drv) { skipped++; continue; }
    if (DRIVER_MAP[raw] && DRIVER_MAP[raw] !== raw) remapped++;

    if (!toAdd[drv]) toAdd[drv] = [];
    toAdd[drv].push(mfr);
  }

  console.log(`Already have: ${alreadyHave}, Invalid: ${invalid}, Skipped: ${skipped}, Remapped: ${remapped}`);

  let totalAdded = 0;
  for (const [drv, fps] of Object.entries(toAdd).sort((a, b) => b[1].length - a[1].length)) {
    const df = driverFiles[drv];
    if (!df.data.zigbee) continue;
    if (!Array.isArray(df.data.zigbee.manufacturerName)) df.data.zigbee.manufacturerName = [];
    const existing = new Set(df.data.zigbee.manufacturerName.map((m) => String(m).toLowerCase()));
    let added = 0;
    for (const mfr of fps) {
      const key = String(mfr).toLowerCase();
      if (existing.has(key)) continue;
      // Prefer canonical Tuya casing when possible
      let out = mfr;
      const m = String(mfr).match(/^(_[Tt][Zz][Ee]?[0-9A-Za-z]+)_(.+)$/);
      if (m) out = `${m[1].toUpperCase()}_${m[2].toLowerCase()}`;
      df.data.zigbee.manufacturerName.push(out);
      existing.add(key);
      allMfrsCI.add(key);
      added++;
    }
    if (added > 0) {
      if (!DRY) fs.writeFileSync(df.path, JSON.stringify(df.data, null, 2) + '\n');
      console.log(`  ${drv}: +${added} (total: ${df.data.zigbee.manufacturerName.length})`);
      totalAdded += added;
    }
  }

  // PIDs: ONLY add if already present on that driver (no invent) — skip invent path
  console.log('\n=== Done: +' + totalAdded + ' FPs, +0 PIDs (no invent) ===');
  if (DRY) console.log('(dry-run — no files written)');
}

main();
