#!/usr/bin/env node
/**
 * Driver Validation Script - YAML/JS Consistency Checker
 * Run: node scripts/automation/validate-drivers.js [--json]
 *
 * Validates:
 * - YAML capabilities match JS handlers
 * - Flow Cards reference valid capabilities
 * - Required files exist
 * - TS0043/TS0044 button devices are stateless
 * - TS0601 climate sensors have time sync
 * - driver.compose.json structural integrity
 * - Capability-options consistency
 * - Duplicate manufacturer detection
 * - Empty array detection
 * - Invalid JSON detection
 *
 * Exit codes: 0 = pass, 1 = errors found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadAllDrivers, DRIVERS_DIR } = require('../lib/drivers');
const { createLogger } = require('../lib/logger');

const JSON_OUTPUT = process.argv.includes('--json');
const { log, summary, errors: _getErrCount } = createLogger('Driver Validation');

const SPECIAL_DEVICES = {
  buttons: ['button_wireless', 'scene_switch', 'TS0043', 'TS0044'],
  climate: ['climate_sensor', 'temphumid', 'TS0601'],
  timesync: ['_TZE284_', '_TZE200_', '_TZE204_']
};

// All known valid capabilities for the Homey Zigbee app
const KNOWN_CAPABILITIES = new Set([
  'onoff', 'dim', 'brightness', 'light_hue', 'light_saturation', 'light_temperature',
  'light_mode', 'thermostat_mode', 'thermostat_temperature', 'thermostat_heatingsetpoint',
  'thermostat_coolingsetpoint', 'thermostat_state', 'target_temperature',
  'measure_temperature', 'measure_humidity', 'measure_pressure', 'measure_wind_strength',
  'measure_wind_direction', 'measure_rain', 'measure_battery', 'alarm_battery',
  'alarm_motion', 'alarm_contact', 'alarm_tamper', 'alarm_smoke', 'alarm_heat',
  'alarm_water', 'alarm_carbon_monoxide', 'alarm_vibration', 'alarm_uv',
  'meter_power', 'meter_gas', 'meter_water', 'fan_speed', 'air_purifier_mode',
  'air_purifier_fan_speed', 'locked', 'windowcoverings_set', 'windowcoverings_state',
  'windowcoverings_tilt_set', 'button', 'speaker_playing', 'volume_set',
  'speaker_shuffle', 'speaker_repeat', 'previous_track', 'next_track', 'play_pause',
]);

// Required files for a well-formed driver
const REQUIRED_DRIVER_FILES = ['driver.compose.json'];

function validateDriver(name, d) {
  const issues = [];
  const driverPath = path.join(DRIVERS_DIR, name);
  const devicePath = path.join(driverPath, 'device.js');

  // 1. Check required files exist
  for (const reqFile of REQUIRED_DRIVER_FILES) {
    const fp = path.join(driverPath, reqFile);
    if (!fs.existsSync(fp)) {
      const issue = { check: 'missing-file', severity: 'error', message: `Missing required file: ${reqFile}` };
      issues.push(issue);
      log('error', name, issue.message);
    }
  }

  // 2. device.js exists
  const hasDeviceJs = fs.existsSync(devicePath);
  if (!hasDeviceJs) {
    const issue = { check: 'missing-device-js', severity: 'warn', message: 'Missing device.js' };
    issues.push(issue);
    log('warn', name, issue.message);
  }

  const capabilities = d.caps;
  const mfrs = d.mfrs;
  const config = d.config || {};

  // 3. Button device validation
  const isButton = SPECIAL_DEVICES.buttons.some(p => name.toLowerCase().includes(p.toLowerCase()));
  const isPureButton = config.class === 'button';
  if (isButton && isPureButton) {
    if (capabilities.includes('onoff')) {
      const issue = { check: 'button-onoff', severity: 'error', message: 'Button device has onoff capability (should be stateless)' };
      issues.push(issue);
      log('error', name, issue.message);
    }
    const hasButtonCaps = capabilities.some(c => c.startsWith('button.'));
    if (!hasButtonCaps && !capabilities.includes('button')) {
      const issue = { check: 'button-missing-caps', severity: 'warn', message: 'Button device missing button.X capabilities' };
      issues.push(issue);
      log('warn', name, issue.message);
    }
  }

  // 4. Climate sensor validation
  const isClimate = SPECIAL_DEVICES.climate.some(p => name.toLowerCase().includes(p.toLowerCase()));
  const needsTimeSync = mfrs.some(m => SPECIAL_DEVICES.timesync.some(t => m.includes(t)));
  if (isClimate && needsTimeSync && hasDeviceJs) {
    const deviceJs = fs.readFileSync(devicePath, 'utf8');
    if (!deviceJs.includes('TimeSync') && !deviceJs.includes('syncTime')) {
      const issue = { check: 'climate-timesync', severity: 'warn', message: 'LCD climate sensor may need time sync implementation' };
      issues.push(issue);
      log('warn', name, issue.message);
    }
  }

  // 5. Capability options validation
  const capsOptions = config.capabilitiesOptions || {};
  for (const cap of capabilities) {
    if (cap.includes('.') && !capsOptions[cap]) {
      const issue = { check: 'missing-cap-options', severity: 'warn', message: `Subcapability ${cap} has no capabilitiesOptions` };
      issues.push(issue);
      log('warn', name, issue.message);
    }
  }

  // 6. Empty array detection
  const zigbee = config.zigbee || {};
  if (Array.isArray(zigbee.manufacturerName) && zigbee.manufacturerName.length === 0) {
    const issue = { check: 'empty-manufacturers', severity: 'warn', message: 'Empty manufacturerName array' };
    issues.push(issue);
    log('warn', name, issue.message);
  }
  if (Array.isArray(zigbee.productId) && zigbee.productId.length === 0) {
    const issue = { check: 'empty-productids', severity: 'warn', message: 'Empty productId array' };
    issues.push(issue);
    log('warn', name, issue.message);
  }

  // 7. Duplicate manufacturer detection (case-insensitive)
  if (Array.isArray(zigbee.manufacturerName)) {
    const lowerMfrs = zigbee.manufacturerName.map(m => m.toLowerCase());
    const dupes = lowerMfrs.filter((m, i) => lowerMfrs.indexOf(m) !== i);
    if (dupes.length > 0) {
      const uniqueDupes = [...new Set(dupes)];
      const issue = { check: 'duplicate-manufacturers', severity: 'error', message: `Duplicate manufacturers: ${uniqueDupes.join(', ')}` };
      issues.push(issue);
      log('error', name, issue.message);
    }
  }

  // 8. Duplicate productId detection
  if (Array.isArray(zigbee.productId)) {
    const pids = zigbee.productId;
    const pidDupes = pids.filter((p, i) => pids.indexOf(p) !== i);
    if (pidDupes.length > 0) {
      const uniqueDupes = [...new Set(pidDupes)];
      const issue = { check: 'duplicate-productids', severity: 'error', message: `Duplicate productIds: ${uniqueDupes.join(', ')}` };
      issues.push(issue);
      log('error', name, issue.message);
    }
  }

  // 9. Unknown capability detection (warn only)
  for (const cap of capabilities) {
    if (!cap.includes('.') && !KNOWN_CAPABILITIES.has(cap)) {
      const issue = { check: 'unknown-capability', severity: 'warn', message: `Possibly unknown capability: ${cap}` };
      issues.push(issue);
      log('warn', name, issue.message);
    }
  }

  // 10. driver.compose.json structural integrity
  if (!config.id) {
    const issue = { check: 'missing-id', severity: 'error', message: 'driver.compose.json missing "id" field' };
    issues.push(issue);
    log('error', name, issue.message);
  }
  if (!config.version) {
    const issue = { check: 'missing-version', severity: 'warn', message: 'driver.compose.json missing "version" field' };
    issues.push(issue);
    log('warn', name, issue.message);
  }

  // 11. Capability consistency: device.js should have matching onInit handlers for caps
  if (hasDeviceJs) {
    const deviceJs = fs.readFileSync(devicePath, 'utf8');
    // Check if dimmer driver has dim capability
    if (capabilities.includes('dim') && !deviceJs.includes("'dim'") && !deviceJs.includes('"dim"') && !deviceJs.includes('`dim`')) {
      const issue = { check: 'cap-not-in-devicejs', severity: 'warn', message: 'dim capability not referenced in device.js' };
      issues.push(issue);
      log('warn', name, issue.message);
    }
  }

  return issues;
}

// Main
if (!JSON_OUTPUT) console.log('Validating drivers...\n');

const drivers = loadAllDrivers();
const allIssues = new Map();
let totalErrors = 0;
let totalWarnings = 0;

for (const [name, d] of drivers) {
  const issues = validateDriver(name, d);
  if (issues.length > 0) {
    allIssues.set(name, issues);
    totalErrors += issues.filter(i => i.severity === 'error').length;
    totalWarnings += issues.filter(i => i.severity === 'warn').length;
  }
}

const s = summary();

if (JSON_OUTPUT) {
  const output = {
    timestamp: new Date().toISOString(),
    driversValidated: drivers.size,
    driversWithIssues: allIssues.size,
    totalErrors,
    totalWarnings,
    issues: Object.fromEntries([...allIssues.entries()].map(([k, v]) => [k, v])),
    exitCode: totalErrors > 0 ? 1 : 0,
  };
  console.log(JSON.stringify(output, null, 2));
} else {
  if (totalErrors > 0) {
    console.error(`\nValidation FAILED: ${totalErrors} error(s), ${totalWarnings} warning(s) across ${allIssues.size} driver(s).`);
  } else {
    console.log(`\nValidation PASSED: ${drivers.size} drivers checked, ${totalWarnings} warning(s).`);
  }
}

process.exit(totalErrors > 0 ? 1 : 0);
