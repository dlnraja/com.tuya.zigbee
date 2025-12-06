#!/usr/bin/env node
/**
 * AUTO POPULATE LOCAL DB
 *
 * Scans all drivers to extract DP mappings and auto-populate
 * the COMPREHENSIVE_LOCAL_DB in INTELLIGENT_ENRICHER_v3.js
 *
 * This helps increase coverage from ~5% to ~60%+
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const LIB_DIR = path.join(__dirname, '../../lib');
const OUTPUT_FILE = path.join(__dirname, '../../data/EXTRACTED_DP_MAPPINGS.json');

// ═══════════════════════════════════════════════════════════════════════════
// BASE CLASS DP MAPPINGS (from lib/devices/)
// ═══════════════════════════════════════════════════════════════════════════

const BASE_CLASS_DPS = {
  // HybridCoverBase
  cover: [1, 2, 3, 5, 7],  // state, set, position, direction, work_state

  // DimmerDevice
  dimmer: [1, 2, 3, 4, 14], // onoff, dim, dim_min, dim_max, power_on

  // ButtonDevice
  button: [1, 2, 3, 4], // action buttons

  // ValveDevice
  valve: [1, 2, 5, 7, 11], // onoff, battery, countdown, timer, meter

  // ThermostatDevice
  thermostat: [1, 2, 3, 4, 16, 24, 27, 28, 101], // various thermostat DPs
};

// ═══════════════════════════════════════════════════════════════════════════
// DP PATTERN MATCHERS
// ═══════════════════════════════════════════════════════════════════════════

const DP_PATTERNS = [
  // Standard DP definitions: dp: 1, dp: '1', datapoint: 1
  /(?:dp|datapoint)\s*[:=]\s*['"]?(\d+)['"]?\s*[,}]/gi,

  // Case statements: case 1:
  /case\s+(\d+)\s*:/gi,

  // Object keys: 1: { capability: ... }
  /['"]?(\d+)['"]?\s*:\s*\{\s*(?:capability|name|transform)/gi,

  // DP comments: // DP 1, /* DP1 */, DP: 1
  /(?:\/\/|\/\*)\s*DP\s*:?\s*(\d+)/gi,

  // Direct assignments: status.dp === 1
  /\.dp\s*===?\s*(\d+)/gi,
];

const CAPABILITY_PATTERNS = {
  'onoff': /(?:onoff|switch|power)/i,
  'dim': /(?:dim|brightness|level)/i,
  'alarm_motion': /(?:motion|pir|occupancy)/i,
  'alarm_contact': /(?:contact|door|window|open)/i,
  'alarm_water': /(?:water|leak|flood)/i,
  'alarm_smoke': /(?:smoke|fire)/i,
  'alarm_co': /(?:co|carbon)/i,
  'alarm_vibration': /(?:vibration|shock)/i,
  'measure_temperature': /(?:temperature|temp)/i,
  'measure_humidity': /(?:humidity|humid)/i,
  'measure_battery': /(?:battery|batt)/i,
  'measure_power': /(?:power(?!_on)|watt)/i,
  'measure_voltage': /(?:voltage|volt)/i,
  'measure_current': /(?:current|amp)/i,
  'meter_power': /(?:energy|meter|kwh)/i,
  'windowcoverings_state': /(?:cover|curtain|blind).*(?:state|position)/i,
  'windowcoverings_set': /(?:cover|curtain|blind).*(?:set|position)/i,
  'target_temperature': /(?:target|set).*(?:temp)/i,
  'light_temperature': /(?:color.*temp|cct|white)/i,
  'light_hue': /(?:hue|color)/i,
  'light_saturation': /(?:saturation|sat)/i,
};

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════════

function extractDPsFromDeviceJS(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dps = new Set();

  for (const pattern of DP_PATTERNS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const dp = parseInt(match[1]);
      if (dp >= 1 && dp <= 255) {
        dps.add(dp);
      }
    }
  }

  return Array.from(dps).sort((a, b) => a - b);
}

function extractManufacturers(configPath) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config?.zigbee?.manufacturerName || [];
  } catch {
    return [];
  }
}

function guessDriverType(driverName, capabilities = []) {
  const name = driverName.toLowerCase();

  if (name.includes('motion') || name.includes('pir')) return 'motion_sensor';
  if (name.includes('radar') || name.includes('mmwave')) return 'motion_sensor_radar';
  if (name.includes('climate') || name.includes('temphumid')) return 'climate_sensor';
  if (name.includes('soil')) return 'soil_sensor';
  if (name.includes('thermostat')) return 'thermostat';
  if (name.includes('curtain') || name.includes('cover') || name.includes('blind')) return 'cover';
  if (name.includes('dimmer')) return 'dimmer';
  if (name.includes('led') || name.includes('light') || name.includes('bulb')) return 'led';
  if (name.includes('switch') && name.includes('wall')) return 'switch';
  if (name.includes('socket') || name.includes('plug') || name.includes('outlet')) return 'socket';
  if (name.includes('contact') || name.includes('door')) return 'contact_sensor';
  if (name.includes('water') || name.includes('leak')) return 'water_leak';
  if (name.includes('smoke')) return 'smoke_detector';
  if (name.includes('button') || name.includes('remote')) return 'button';
  if (name.includes('valve')) return 'valve';
  if (name.includes('siren') || name.includes('alarm')) return 'siren';
  if (name.includes('garage')) return 'garage_door';
  if (name.includes('vibration')) return 'vibration';
  if (name.includes('air') || name.includes('co2') || name.includes('voc')) return 'air_quality';

  return 'unknown';
}

function scanAllDrivers() {
  const results = {};
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());

  console.log(`\n📁 Scanning ${drivers.length} drivers...\n`);

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    const devicePath = path.join(DRIVERS_DIR, driver.name, 'device.js');

    if (!fs.existsSync(configPath)) continue;

    const manufacturers = extractManufacturers(configPath);
    if (manufacturers.length === 0) continue;

    let dps = [];
    if (fs.existsSync(devicePath)) {
      dps = extractDPsFromDeviceJS(devicePath);
    }

    const type = guessDriverType(driver.name);

    // If no DPs found in device.js, use base class DPs
    let finalDPs = dps;
    if (dps.length === 0 && BASE_CLASS_DPS[type]) {
      finalDPs = BASE_CLASS_DPS[type];
    }

    for (const mfr of manufacturers) {
      if (!results[mfr]) {
        results[mfr] = {
          driver: driver.name,
          type,
          dps: finalDPs,
          extracted: dps.length > 0,
          fromBaseClass: dps.length === 0 && finalDPs.length > 0
        };
      }
    }
  }

  return results;
}

function generateLocalDBCode(results) {
  const lines = [];
  lines.push('// AUTO-GENERATED DP MAPPINGS');
  lines.push('// Generated: ' + new Date().toISOString());
  lines.push('');

  // Group by type
  const byType = {};
  for (const [mfr, data] of Object.entries(results)) {
    const type = data.type || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push({ mfr, ...data });
  }

  for (const [type, entries] of Object.entries(byType).sort()) {
    lines.push(`  // ${type.toUpperCase()}`);
    for (const entry of entries.slice(0, 10)) { // Limit per type
      const dpsStr = entry.dps.length > 0
        ? `dps: [${entry.dps.join(', ')}]`
        : 'dps: []';
      lines.push(`  '${entry.mfr}': { type: '${type}', ${dpsStr} },`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 AUTO POPULATE LOCAL DB');
  console.log('════════════════════════════════════════════════════════════════');

  const results = scanAllDrivers();

  console.log(`\n✅ Extracted mappings for ${Object.keys(results).length} manufacturers`);

  // Save JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`📄 Saved to: ${OUTPUT_FILE}`);

  // Generate code snippet
  const code = generateLocalDBCode(results);
  const codeFile = path.join(__dirname, '../../data/LOCAL_DB_CODE_SNIPPET.txt');
  fs.writeFileSync(codeFile, code);
  console.log(`📝 Code snippet saved to: ${codeFile}`);

  // Stats
  const byType = {};
  for (const data of Object.values(results)) {
    byType[data.type] = (byType[data.type] || 0) + 1;
  }

  console.log('\n📊 By Type:');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
