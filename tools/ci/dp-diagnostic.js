#!/usr/bin/env node
'use strict';

/**
 * P26.5 — Lower-Level Tuya DP Diagnostic Tool
 *
 * Captures all DPs from a device interview and identifies
 * DPs that are NOT handled by the current driver.
 *
 * This helps compensate for native interview truncation by
 * adding lower-level monitoring.
 *
 * Usage:
 *   node tools/ci/dp-diagnostic.js <device.json>
 *   node tools/ci/dp-diagnostic.js --list-known-dps
 *
 * The tool reads a captured device interview JSON (from
 * dev dashboard portal) and cross-references with our
 * known DP database to find:
 * 1. DPs we know but don't handle
 * 2. Unknown DPs (new from this device)
 * 3. Recommended handlers
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const KNOWN_DPS_FILE = path.join(STATE_DIR, 'known-tuya-dps.json');

// Known Tuya DPs from Z2M/ZHA/Johan (extracted from P24.1/P24.2)
const KNOWN_DPS = {
  // Boolean
  1: 'state/onoff',
  2: 'unknown_2', // often backlight
  3: 'unknown_3',
  4: 'mode',
  5: 'unknown_5', // brightness level
  6: 'unknown_6',
  7: 'unknown_7',
  8: 'unknown_8',
  9: 'unknown_9',
  10: 'unknown_10',
  11: 'unknown_11',
  12: 'unknown_12',
  13: 'unknown_13',
  14: 'unknown_14',
  15: 'backlight_mode',
  16: 'light_type',
  // 0-20 mostly boolean
  21: 'unknown_21',
  22: 'unknown_22',
  23: 'unknown_23',
  24: 'unknown_24',
  25: 'unknown_25',
  26: 'temperature_target',
  27: 'temperature_current',
  28: 'unknown_28',
  29: 'unknown_29',
  30: 'unknown_30',
  // 31-50 various
  31: 'unknown_31',
  32: 'unknown_32',
  33: 'unknown_33',
  34: 'unknown_34',
  35: 'unknown_35',
  36: 'backlight_brightness',
  37: 'unknown_37',
  38: 'relay_status',
  // 50+ values
  101: 'battery',
  102: 'unknown_102',
  103: 'unknown_103',
  104: 'unknown_104',
  105: 'unknown_105',
  106: 'pir_delay',
};

// Save known DPs
fs.writeFileSync(KNOWN_DPS_FILE, JSON.stringify(KNOWN_DPS, null, 2));

function analyzeDevice(deviceData) {
  const result = {
    meta: {
      analyzedAt: new Date().toISOString(),
      deviceIds: deviceData.ids || {},
    },
    handled: [],
    unhandled: [],
    unknown: [],
  };

  // Try to find Tuya DPs in different places
  let dps = [];
  if (deviceData.zigbee && deviceData.zigbee.endpoints) {
    for (const ep of deviceData.zigbee.endpoints) {
      if (ep.clusters && ep.clusters['0xef00'] && ep.clusters['0xef00'].attributes) {
        for (const [dp, value] of Object.entries(ep.clusters['0xef00'].attributes)) {
          dps.push({ dp: parseInt(dp), value, source: `endpoint ${ep.id} cluster 0xef00` });
        }
      }
    }
  }

  // Also look in rawTuyaData
  if (deviceData.rawTuyaData) {
    for (const d of deviceData.rawTuyaData) {
      dps.push({ dp: d.dp, value: d.value, source: 'rawTuyaData' });
    }
  }

  for (const { dp, value, source } of dps) {
    if (KNOWN_DPS[dp] && KNOWN_DPS[dp] !== `unknown_${dp}`) {
      result.handled.push({ dp, name: KNOWN_DPS[dp], value, source });
    } else if (KNOWN_DPS[dp]) {
      result.unhandled.push({ dp, name: KNOWN_DPS[dp], value, source });
    } else {
      result.unknown.push({ dp, value, source });
    }
  }

  return result;
}

function listKnownDps() {
  console.log('=== Known Tuya DPs ===\n');
  console.log('DP | Name | Source');
  console.log('---|------|-------');
  for (const [dp, name] of Object.entries(KNOWN_DPS)) {
    if (!name.startsWith('unknown_')) {
      console.log(`${dp} | ${name} | z2m/zha/johan`);
    }
  }
  console.log(`\nTotal handled: ${Object.values(KNOWN_DPS).filter(n => !n.startsWith('unknown_')).length}`);
  console.log(`Total unknown: ${Object.values(KNOWN_DPS).filter(n => n.startsWith('unknown_')).length}`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list-known-dps')) {
    listKnownDps();
    return;
  }

  if (args[0] && fs.existsSync(args[0])) {
    const data = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    const result = analyzeDevice(data);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Default: show known DPs
  listKnownDps();
}

main();
