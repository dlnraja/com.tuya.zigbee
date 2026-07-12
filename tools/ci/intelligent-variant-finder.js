#!/usr/bin/env node
/**
 * intelligent-variant-finder.js
 *
 * INTELLIGENT variant finder: for each mfr, search for ALL possible device IDs
 * and alternative device names. The same mfr can implement MULTIPLE devices
 * with different PIDs, alternative names, whitelabels, etc.
 *
 * Sources searched:
 *   1. Z2M raw cache (1.3 MB) - finds all PIDs/names for each mfr
 *   2. Canonical FP DB - known driverId/type
 *   3. Heuristic patterns - TS family mappings
 *
 * Output: a comprehensive mapping of mfr → all possible PIDs/names → drivers
 *
 * @author Mavis investigation 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const Z2M_RAW = path.join(ROOT, '.github', 'state', 'z2m-tuya-raw.txt');
const CANONICAL = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const JOHAN_AUDIT = path.join(ROOT, '.diag', 'johan-shadow-comments-audit.json');
const REPORT = path.join(ROOT, '.github', 'state', 'intelligent-variants.json');

// Tuya PID family mappings
const PID_FAMILIES = {
  TS0601: { description: 'Generic Tuya (climate/soil/valve/etc.)', drivers: ['generic_tuya', 'climate_sensor', 'soil_sensor', 'valve_irrigation', 'thermostat'] },
  TS0201: { description: 'Temperature/humidity sensor', drivers: ['climate_sensor', 'temphumidsensor', 'lcdtemphumidsensor'] },
  TS0203: { description: 'Door/window contact sensor', drivers: ['door_sensor', 'contact_sensor', 'sensor_contact_zigbee', 'doorwindowsensor_3', 'doorwindowsensor_4'] },
  TS0205: { description: 'Smoke detector', drivers: ['smoke_detector_advanced'] },
  TS0207: { description: 'Water leak sensor', drivers: ['water_leak_sensor'] },
  TS0210: { description: 'Vibration sensor', drivers: ['vibration_sensor'] },
  TS011F: { description: 'Smart plug (10A)', drivers: ['plug', 'plug_smart', 'plug_energy_monitor', 'wall_socket'] },
  TS0121: { description: 'Smart plug (16A)', drivers: ['plug_smart', 'plug_energy_monitor'] },
  TS1101: { description: 'Smart plug (16A+monitoring)', drivers: ['plug_energy_monitor'] },
  TS0501B: { description: 'Dimmable bulb', drivers: ['bulb_dimmable'] },
  TS0502B: { description: 'Tunable white bulb', drivers: ['bulb_tunable_white', 'bulb_dimmable'] },
  TS0503B: { description: 'RGB bulb', drivers: ['bulb_rgb', 'light_bulb_rgb'] },
  TS0504B: { description: 'RGBW bulb', drivers: ['bulb_rgbw', 'light_bulb_rgbw'] },
  TS0505B: { description: 'RGBCW bulb', drivers: ['bulb_rgbw', 'light_bulb_rgbw'] },
  TS110E: { description: 'Dimmer module', drivers: ['dimmer_1_gang', 'dimmer_wall_1gang'] },
  TS110F: { description: 'Dimmer module (2-channel)', drivers: ['dimmer_2_gang', 'dimmer_2_gang_tuya'] },
  TS0001: { description: '1-gang switch', drivers: ['switch_1gang', 'switch_1_gang', 'wall_switch_1gang_1way', 'wall_switch_1_gang', 'wall_switch_1_gang_tuya'] },
  TS0002: { description: '2-gang switch', drivers: ['switch_2gang', 'switch_2_gang', 'wall_switch_2gang_1way', 'wall_switch_2_gang'] },
  TS0003: { description: '3-gang switch', drivers: ['switch_3gang', 'switch_3_gang', 'wall_switch_3gang_1way', 'wall_switch_3_gang'] },
  TS0004: { description: '4-gang switch', drivers: ['switch_4gang', 'switch_4_gang_metering', 'wall_switch_4gang_1way', 'wall_switch_4_gang', 'wall_switch_5_gang_tuya'] },
  TS0006: { description: '6-gang switch', drivers: ['wall_switch_6_gang', 'switch_6gang', 'wall_switch_5_gang_tuya'] },
  TS0011: { description: '1-gang switch (alt PID)', drivers: ['switch_1gang', 'wall_switch_1gang_1way', 'wall_switch_1_gang'] },
  TS0012: { description: '1-gang switch (alt PID)', drivers: ['switch_1gang', 'wall_switch_1gang_1way', 'wall_switch_1_gang'] },
  TS0013: { description: '3-gang switch (alt PID)', drivers: ['switch_3gang', 'wall_switch_3gang_1way', 'wall_switch_3_gang'] },
  TS0014: { description: '1-gang switch module', drivers: ['switch_1gang', 'wall_switch_1gang_1way', 'wall_switch_1_gang_tuya'] },
  TS0016: { description: '3-gang switch (alt)', drivers: ['switch_3gang', 'wall_switch_3gang_1way', 'wall_switch_3_gang'] },
  TS0017: { description: '4-gang switch (alt)', drivers: ['switch_4gang', 'wall_switch_4gang_1way', 'wall_switch_4_gang', 'wall_switch_5_gang_tuya'] },
  TS0018: { description: '6-gang switch (alt)', drivers: ['wall_switch_6_gang', 'switch_6gang', 'wall_switch_5_gang_tuya'] },
  TS0041: { description: '1-button scene switch', drivers: ['button_wireless_1', 'button_wireless', 'smart_remote_1_button'] },
  TS0042: { description: '2-button scene switch', drivers: ['button_wireless_2', 'handheld_remote_4_buttons', 'smart_remote_1_button_2'] },
  TS0043: { description: '3-button scene switch', drivers: ['button_wireless_3', 'scene_switch_3', 'wall_remote_3_gang', 'wall_remote_4_gang'] },
  TS0044: { description: '4-button scene switch', drivers: ['button_wireless_4', 'scene_switch_4', 'wall_remote_4_gang', 'wall_remote_4_gang_2'] },
  TS0045: { description: '5-button scene switch', drivers: ['button_wireless_5', 'smart_remote_4_buttons'] },
  TS0046: { description: '6-button scene switch', drivers: ['button_wireless_6', 'wall_remote_6_gang'] },
  TS004F: { description: '4-button scene switch (knob)', drivers: ['button_wireless_scene', 'scene_switch_4', 'wall_remote_4_gang_3'] },
};

function loadJSON(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

function findPidsForMfr(z2mRaw, mfr) {
  // Find PIDs mentioned near the mfr in Z2M raw
  const i = z2mRaw.indexOf(mfr);
  if (i < 0) return [];
  const start = Math.max(0, i - 600);
  const end = Math.min(z2mRaw.length, i + mfr.length + 300);
  const context = z2mRaw.substring(start, end);
  const pids = new Set();
  const pidMatches = context.match(/['"]?(TS\d{4}[A-Z]?)['"]?/g) || [];
  for (const p of pidMatches) pids.add(p.replace(/['"]/g, ''));
  return [...pids];
}

function findNamesForMfr(z2mRaw, mfr) {
  // Find device name patterns (vendor/description)
  const i = z2mRaw.indexOf(mfr);
  if (i < 0) return [];
  const start = Math.max(0, i - 200);
  const end = Math.min(z2mRaw.length, i + mfr.length + 100);
  const context = z2mRaw.substring(start, end);
  // Look for vendor patterns
  const vendorMatch = context.match(/vendor['"]?\s*:\s*['"]([^'"]+)['"]/);
  return vendorMatch ? [vendorMatch[1]] : [];
}

function main() {
  console.log('Intelligent Variant Finder v1.0.0\n');

  const z2mRaw = fs.existsSync(Z2M_RAW) ? fs.readFileSync(Z2M_RAW, 'utf8') : '';
  const canonical = loadJSON(CANONICAL) || {};
  const johan = loadJSON(JOHAN_AUDIT) || { fingerprints: [] };

  console.log(`Loaded: z2m=${(z2mRaw.length / 1024).toFixed(0)}K, canonical=${Object.keys(canonical).length} FPs, johan=${(johan.fingerprints || []).length} mfrs`);

  // For each johan mfr, find all possible PIDs and names
  const results = [];
  for (const fp of johan.fingerprints || []) {
    const mfr = fp.fingerprint;
    if (!mfr) continue;
    const pidsFromZ2M = findPidsForMfr(z2mRaw, mfr);
    const namesFromZ2M = findNamesForMfr(z2mRaw, mfr);
    const canonEntry = canonical[mfr] || canonical[mfr.toLowerCase()];
    const issueNumbers = fp.issueNumbers || [];
    const allPids = [...new Set([...(fp.productIds || []), ...pidsFromZ2M])];
    // Map PIDs to drivers
    const allDrivers = new Set();
    for (const pid of allPids) {
      if (PID_FAMILIES[pid]) {
        for (const d of PID_FAMILIES[pid].drivers) allDrivers.add(d);
      }
    }
    if (canonEntry?.driverId) allDrivers.add(canonEntry.driverId);
    results.push({
      mfr,
      pids: allPids,
      pidFamilies: allPids.map((p) => ({ pid: p, family: PID_FAMILIES[p]?.description || 'unknown', drivers: PID_FAMILIES[p]?.drivers || [] })),
      drivers: [...allDrivers],
      vendorNames: namesFromZ2M,
      issueCount: issueNumbers.length,
      canonicalDriver: canonEntry?.driverId || null,
    });
  }

  // Stats
  const mfrsWithMultiplePids = results.filter((r) => r.pids.length > 1).length;
  const mfrsWithMultipleDrivers = results.filter((r) => r.drivers.length > 1).length;
  const totalVariants = results.reduce((s, r) => s + r.drivers.length, 0);

  console.log(`\nResults:`);
  console.log(`  Mfrs analyzed: ${results.length}`);
  console.log(`  Mfrs with multiple PIDs: ${mfrsWithMultiplePids}`);
  console.log(`  Mfrs with multiple drivers (variants): ${mfrsWithMultipleDrivers}`);
  console.log(`  Total driver variants: ${totalVariants}`);

  // Top multi-device mfrs
  const topMulti = results
    .filter((r) => r.drivers.length > 1)
    .sort((a, b) => b.drivers.length - a.drivers.length)
    .slice(0, 15);
  console.log(`\nTop 15 mfrs with multiple driver variants:`);
  for (const r of topMulti) {
    console.log(`  ${r.mfr}:`);
    console.log(`    PIDs: ${r.pids.join(', ')}`);
    console.log(`    Drivers (${r.drivers.length}): ${r.drivers.join(', ')}`);
    if (r.vendorNames.length) console.log(`    Vendors: ${r.vendorNames.join(', ')}`);
  }

  // Top multi-PID mfrs
  const topMultiPid = results
    .filter((r) => r.pids.length > 1)
    .sort((a, b) => b.pids.length - a.pids.length)
    .slice(0, 10);
  console.log(`\nTop 10 mfrs with multiple PIDs (variants of same product):`);
  for (const r of topMultiPid) {
    console.log(`  ${r.mfr}: PIDs = ${r.pids.join(', ')}`);
  }

  // Save report
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      mfrsAnalyzed: results.length,
      mfrsWithMultiplePids,
      mfrsWithMultipleDrivers,
      totalVariants,
    },
    results,
  }, null, 2));
  console.log(`\n✓ Report: ${REPORT} (${(fs.statSync(REPORT).length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) main();

module.exports = { findPidsForMfr, findNamesForMfr, PID_FAMILIES };
