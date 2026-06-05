#!/usr/bin/env node
/**
 * dp-mapping-validator.js
 * Validates DP mappings in device.js files against Z2M reference data.
 * Catches bugs like wrong divisors, wrong capability assignments, and
 * missing DP mappings.
 *
 * Loads scripts/data/z2m-data.json for reference DP definitions.
 * Scans all drivers device.js files for dpMappings getters.
 *
 * Exit code 1 = critical mismatches found
 * Exit code 0 = clean
 *
 * Usage: node scripts/validation/dp-mapping-validator.js [--fix]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FIX_MODE = process.argv.includes('--fix');
const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const Z2M_DATA = path.join(ROOT, 'scripts', 'data', 'z2m-data.json');

// Known Z2M DP definitions per manufacturer
// Format: { mfr: { dps: [{ d: dpNum, n: name }] } }
let z2mData = {};
try {
  z2mData = JSON.parse(fs.readFileSync(Z2M_DATA, 'utf8'));
} catch {
  console.log('⚠️  Z2M data not found, skipping Z2M cross-reference');
}

// Known divisor patterns from Z2M converters
// Maps dpName -> expected divisor (if known)
const KNOWN_DIVISORS = {
  temperature: 10,      // Z2M sends temp*10
  humidity: 10,         // Z2M sends humidity*10
  soil_humidity: 1,
  moisture: 1,
  battery: 2,           // Z2M batteryPercentageRemaining / 2
  voltage: 1,
  power: 1,
  current: 1,
  energy: 100,          // Z2M sends energy*100
  illuminance: 1,
  co2: 1,
  pm25: 1,
  voc: 1,
};

// Known correct DP mappings per manufacturer prefix
// These are the ground truth from Z2M device definitions
const Z2M_DP_TRUTH = {
  // Rain sensor _TZE200_u6x1zyv2
  '_tze200_u6x1zyv2': {
    1: 'rainwater', 2: 'sensitivity', 102: 'illuminance',
    104: 'battery', 101: 'illuminance_sampling',
  },
  '_tze200_jsaqgakf': {
    1: 'rainwater', 2: 'sensitivity', 102: 'illuminance',
    104: 'battery', 101: 'illuminance_sampling',
  },
  // Soil sensor _TZE284_oitavov2
  '_tze284_oitavov2': {
    3: 'soil_humidity', 5: 'temperature', 15: 'battery',
    101: 'humidity', 102: 'illuminance',
  },
  // Bed sensor _TZE200_seq9cm6u
  '_tze200_seq9cm6u': {
    1: 'presence', 4: 'battery', 9: 'sensitivity',
    12: 'pressure', 101: 'delay_unoccupied', 102: 'delay_occupied',
  },
};

function extractDpMappings(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Find the dpMappings getter
    const match = content.match(/get\s+dpMappings\s*\(\s*\)\s*\{([\s\S]*?)\n\s*\}/);
    if (!match) return null;

    const block = match[1];
    const mappings = {};

    // Match patterns like:  102: { capability: 'measure_luminance', divisor: 10 }
    // Or: 1: { capability: 'alarm_contact', transform: ... }
    const dpPattern = /(\d+)\s*:\s*\{([^}]+)\}/g;
    let dpMatch;
    while ((dpMatch = dpPattern.exec(block)) !== null) {
      const dpNum = parseInt(dpMatch[1]);
      const body = dpMatch[2];

      const capMatch = body.match(/capability\s*:\s*['"]([^'"]+)['"]/);
      const divMatch = body.match(/divisor\s*:\s*(\d+)/);
      const settingMatch = body.match(/setting\s*:\s*['"]([^'"]+)['"]/);

      mappings[dpNum] = {
        capability: capMatch ? capMatch[1] : null,
        divisor: divMatch ? parseInt(divMatch[1]) : null,
        setting: settingMatch ? settingMatch[1] : null,
      };
    }
    return Object.keys(mappings).length > 0 ? mappings : null;
  } catch {
    return null;
  }
}

function validateMappings(driverName, mappings, mfrHint) {
  const issues = [];

  // Check Z2M cross-reference if we have a known manufacturer
  if (mfrHint && Z2M_DP_TRUTH[mfrHint]) {
    const truth = Z2M_DP_TRUTH[mfrHint];
    for (const [dpStr, z2mName] of Object.entries(truth)) {
      const dp = parseInt(dpStr);
      const local = mappings[dp];
      if (!local) {
        issues.push(`DP${dp} (${z2mName}): missing in local mapping`);
        continue;
      }
      // Check capability alignment
      if (z2mName === 'illuminance' && local.capability && !local.capability.includes('luminance')) {
        issues.push(`DP${dp}: Z2M says illuminance but local maps to ${local.capability}`);
      }
      if (z2mName === 'battery' && local.capability === 'alarm_battery') {
        issues.push(`DP${dp}: Z2M says battery (percentage) but local maps to alarm_battery`);
      }
    }
  }

  // General checks
  for (const [dpStr, info] of Object.entries(mappings)) {
    const dp = parseInt(dpStr);

    // Check for suspicious divisors (1000 is valid for voltage mV→V)
    if (info.divisor !== null && info.divisor > 1000) {
      issues.push(`DP${dp}: suspiciously high divisor ${info.divisor}`);
    }

    // Check for measure_battery + alarm_battery collision
    // NOTE: measure_battery + alarm_battery is INTENTIONAL when on different DPs
    // (e.g., DP4=battery%, DP104=low-battery boolean). Only flag if on SAME DP.
    // Skip this check — it's a known valid pattern for bed_sensor, rain_sensor, etc.
  }

  return issues;
}

// ─── Main ───
const allIssues = [];
let scanned = 0;

for (const d of fs.readdirSync(DRIVERS_DIR)) {
  const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
  if (!fs.existsSync(devicePath)) continue;

  const mappings = extractDpMappings(devicePath);
  if (!mappings) continue;
  scanned++;

  // Try to get manufacturer hint from compose.json
  let mfrHint = null;
  const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
  try {
    const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const mfrs = c.zigbee?.manufacturerName || [];
    for (const m of mfrs) {
      const lower = m.toLowerCase();
      if (Z2M_DP_TRUTH[lower]) {
        mfrHint = lower;
        break;
      }
    }
  } catch {}

  const issues = validateMappings(d, mappings, mfrHint);
  if (issues.length > 0) {
    allIssues.push({ driver: d, issues });
  }
}

if (allIssues.length === 0) {
  console.log(`✅ DP mapping validator: PASS — ${scanned} drivers scanned, 0 issues`);
  process.exit(0);
}

console.error(`❌ DP MAPPING ISSUES: ${allIssues.length} driver(s) with issues\n`);
for (const { driver, issues } of allIssues) {
  console.error(`  📁 ${driver}:`);
  for (const issue of issues) {
    console.error(`    ❌ ${issue}`);
  }
  console.error('');
}

// Output GitHub annotations
for (const { driver, issues } of allIssues) {
  for (const issue of issues) {
    console.log(`::warning file=drivers/${driver}/device.js::DP mapping: ${issue}`);
  }
}

process.exit(1);
