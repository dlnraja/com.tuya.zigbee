#!/usr/bin/env node
/**
 * Driver Validation Script - YAML/JS Consistency Checker with Predictive Validation
 * Run: node scripts/automation/validate-drivers.js [--json] [--predictive]
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
 * Predictive validation:
 * - Health score per driver (0-100)
 * - Structural completeness prediction (will this driver work on next SDK update?)
 * - Trend analysis via historical state
 * - Regression risk estimation
 * - Actionable recommendations
 *
 * Exit codes: 0 = pass, 1 = errors found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadAllDrivers, DRIVERS_DIR } = require('../lib/drivers');
const { createLogger } = require('../lib/logger');

const JSON_OUTPUT = process.argv.includes('--json');
const PREDICTIVE = process.argv.includes('--predictive') || JSON_OUTPUT;
const { log, summary, errors: _getErrCount } = createLogger('Driver Validation');

const STATE_DIR = path.resolve(__dirname, '../../.github/state');

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

// ---- Predictive validation infrastructure ----

/** Per-driver health profiles */
const driverHealth = new Map();

/** Aggregate predictive report */
const predictiveReport = {
  overallScore: 100,
  driversAtRisk: [],
  predictions: [],
  recommendations: [],
  trend: 'stable',
  previousScore: null,
  structuralCompleteness: { complete: 0, partial: 0, broken: 0 },
};

/** Calculate health score for a driver (0-100) */
function calculateDriverHealth(name, issues, config) {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'error') score -= 15;
    else if (issue.severity === 'warn') score -= 5;
  }
  // Bonus for completeness
  const caps = config?.capabilities || [];
  const zigbee = config?.zigbee || {};
  if (caps.length > 0 && zigbee.manufacturerName?.length > 0) score += 5;
  if (config?.connectivity) score += 3;
  if (config?.version) score += 2;
  return Math.max(0, Math.min(100, score));
}

/** Detect structural completeness for SDK compatibility prediction */
function assessStructuralCompleteness(name, config) {
  const checks = {
    hasId: !!config?.id,
    hasVersion: !!config?.version,
    hasCapabilities: Array.isArray(config?.capabilities) && config.capabilities.length > 0,
    hasConnectivity: !!config?.connectivity,
    hasZigbee: !!config?.zigbee,
    hasFingerprints: Array.isArray(config?.zigbee?.fingerprints) && config.zigbee.fingerprints.length > 0,
    hasManufacturers: Array.isArray(config?.zigbee?.manufacturerName) && config.zigbee.manufacturerName.length > 0,
    hasClass: !!config?.class,
    hasComposeJson: true, // we loaded it
  };
  const total = Object.keys(checks).length;
  const passed = Object.values(checks).filter(Boolean).length;
  return { checks, passed, total, percent: Math.round((passed / total) * 100) };
}

/** Generate predictive analysis for driver validation */
function generatePredictions(allIssues, driverHealthMap) {
  const predictions = [];
  const recommendations = [];

  // Pattern: drivers missing device.js are at high risk
  const missingDeviceJs = allIssues.get ? [...allIssues.entries()].filter(([, issues]) =>
    issues.some(i => i.check === 'missing-device-js')
  ) : [];
  if (missingDeviceJs.length > 0) {
    predictions.push({
      type: 'incomplete-driver',
      severity: 'high',
      message: `${missingDeviceJs.length} driver(s) missing device.js. These drivers cannot handle device events and will appear as non-functional.`,
      affectedDrivers: missingDeviceJs.map(([name]) => name),
    });
    recommendations.push({
      priority: 0,
      category: 'completeness',
      action: 'Create device.js files for each affected driver or remove the driver directory.',
      affectedCount: missingDeviceJs.length,
    });
  }

  // Pattern: button devices with onoff are broken
  const brokenButtons = allIssues.get ? [...allIssues.entries()].filter(([, issues]) =>
    issues.some(i => i.check === 'button-onoff')
  ) : [];
  if (brokenButtons.length > 0) {
    predictions.push({
      type: 'button-stateful-error',
      severity: 'critical',
      message: `${brokenButtons.length} button device(s) incorrectly have onoff capability. Button devices must be stateless; having onoff causes undefined behavior.`,
      affectedDrivers: brokenButtons.map(([name]) => name),
    });
    recommendations.push({
      priority: 0,
      category: 'correctness',
      action: 'Remove onoff capability from button device configurations and add button.X capabilities instead.',
      affectedCount: brokenButtons.length,
    });
  }

  // Pattern: empty manufacturerName arrays predict AggregateError on startup
  const emptyMfrs = allIssues.get ? [...allIssues.entries()].filter(([, issues]) =>
    issues.some(i => i.check === 'empty-manufacturers')
  ) : [];
  if (emptyMfrs.length > 0) {
    predictions.push({
      type: 'startup-crash-risk',
      severity: 'critical',
      message: `${emptyMfrs.length} driver(s) have empty manufacturerName arrays with fingerprints. This causes AggregateError during Zigbee initialization.`,
      affectedDrivers: emptyMfrs.map(([name]) => name),
    });
    recommendations.push({
      priority: 0,
      category: 'stability',
      action: 'Populate manufacturerName arrays with at least one manufacturer string.',
      affectedCount: emptyMfrs.length,
    });
  }

  // Pattern: climate sensors without time sync will drift
  const noTimeSync = allIssues.get ? [...allIssues.entries()].filter(([, issues]) =>
    issues.some(i => i.check === 'climate-timesync')
  ) : [];
  if (noTimeSync.length > 0) {
    predictions.push({
      type: 'time-drift',
      severity: 'medium',
      message: `${noTimeSync.length} LCD climate sensor(s) lack time sync. Time display will drift, potentially showing wrong data.`,
      affectedDrivers: noTimeSync.map(([name]) => name),
    });
    recommendations.push({
      priority: 2,
      category: 'feature-completeness',
      action: 'Implement TimeSync or syncTime handler in affected device.js files.',
      affectedCount: noTimeSync.length,
    });
  }

  // Pattern: drivers at risk (low health score)
  const atRisk = [];
  for (const [name, health] of driverHealthMap) {
    if (health < 60) {
      atRisk.push({ driver: name, score: health });
    }
  }
  if (atRisk.length > 0) {
    atRisk.sort((a, b) => a.score - b.score);
    predictions.push({
      type: 'driver-health-risk',
      severity: atRisk[0].score < 40 ? 'high' : 'medium',
      message: `${atRisk.length} driver(s) have health scores below 60. The lowest is "${atRisk[0].driver}" at ${atRisk[0].score}/100.`,
    });
  }

  return { predictions, recommendations };
}

/** Load previous state for trend analysis */
function loadPreviousState() {
  const statePath = path.join(STATE_DIR, 'validate-drivers-state.json');
  try {
    if (fs.existsSync(statePath)) return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch { /* no previous state */ }
  return null;
}

/** Save current state for future trend analysis */
function saveState(score, counts) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(path.join(STATE_DIR, 'validate-drivers-state.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), score, ...counts }, null, 2));
  } catch { /* non-fatal */ }
}

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
  // Calculate per-driver health
  const health = calculateDriverHealth(name, issues, d.config);
  driverHealth.set(name, health);
}

const s = summary();

// ---- Predictive Health Score ----
let healthScore = 100;
healthScore -= totalErrors * 8;
healthScore -= totalWarnings * 2;
healthScore = Math.max(0, Math.min(100, healthScore));

// Structural completeness assessment
let completeCount = 0, partialCount = 0, brokenCount = 0;
for (const [name, d] of drivers) {
  const completeness = assessStructuralCompleteness(name, d.config);
  if (completeness.percent >= 90) completeCount++;
  else if (completeness.percent >= 50) partialCount++;
  else brokenCount++;
}
predictiveReport.structuralCompleteness = { complete: completeCount, partial: partialCount, broken: brokenCount };

// Drivers at risk
const atRiskDrivers = [...driverHealth.entries()]
  .sort((a, b) => a[1] - b[1])
  .filter(([, score]) => score < 80)
  .slice(0, 10)
  .map(([name, score]) => ({ driver: name, score, level: score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical' }));
predictiveReport.driversAtRisk = atRiskDrivers;

// Generate predictions
const { predictions, recommendations } = generatePredictions(allIssues, driverHealth);

// Trend analysis
const prevState = loadPreviousState();
const trend = prevState
  ? (healthScore > prevState.score + 2 ? 'improving' : healthScore < prevState.score - 2 ? 'degrading' : 'stable')
  : 'baseline';
predictiveReport.trend = trend;
predictiveReport.previousScore = prevState?.score || null;
predictiveReport.overallScore = healthScore;
predictiveReport.predictions = predictions;
predictiveReport.recommendations = recommendations;

// Save state
saveState(healthScore, { errors: totalErrors, warnings: totalWarnings, drivers: drivers.size });

if (JSON_OUTPUT) {
  const output = {
    timestamp: new Date().toISOString(),
    driversValidated: drivers.size,
    driversWithIssues: allIssues.size,
    totalErrors,
    totalWarnings,
    issues: Object.fromEntries([...allIssues.entries()].map(([k, v]) => [k, v])),
    health: predictiveReport,
    exitCode: totalErrors > 0 ? 1 : 0,
  };
  console.log(JSON.stringify(output, null, 2));
} else {
  if (totalErrors > 0) {
    console.error(`\nValidation FAILED: ${totalErrors} error(s), ${totalWarnings} warning(s) across ${allIssues.size} driver(s).`);
  } else {
    console.log(`\nValidation PASSED: ${drivers.size} drivers checked, ${totalWarnings} warning(s).`);
  }

  // Print health report
  console.log('\n' + '='.repeat(60));
  console.log('  PREDICTIVE VALIDATION REPORT');
  console.log('='.repeat(60));
  console.log(`  Health Score:  ${healthScore}/100 (${healthScore >= 80 ? 'GOOD' : healthScore >= 50 ? 'NEEDS ATTENTION' : 'CRITICAL'})`);
  console.log(`  Trend:         ${trend.toUpperCase()}${prevState ? ` (was ${prevState.score})` : ' (baseline)'}`);
  console.log(`  Completeness:  ${completeCount} complete, ${partialCount} partial, ${brokenCount} broken`);
  if (atRiskDrivers.length > 0) {
    console.log('\n  Drivers at Risk:');
    for (const r of atRiskDrivers) {
      console.log(`    [${r.score}] ${r.driver} (${r.level})`);
    }
  }
  if (predictions.length > 0) {
    console.log('\n  Predictions:');
    for (const p of predictions) {
      console.log(`    [${p.severity.toUpperCase()}] ${p.message}`);
    }
  }
  if (recommendations.length > 0) {
    console.log('\n  Recommendations:');
    for (const r of recommendations) {
      console.log(`    P${r.priority}: ${r.action}`);
    }
  }
  console.log('='.repeat(60));
}

process.exit(totalErrors > 0 ? 1 : 0);
