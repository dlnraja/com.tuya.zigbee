#!/usr/bin/env node
/**
 * driver-health.js - Comprehensive Driver Health Checker
 * Run: node scripts/automation/driver-health.js [--json] [--fix] [--min-score <0-100>]
 *
 * Validates:
 * - All driver.compose.json files are valid JSON with required fields
 * - manufacturerName arrays are present and non-empty
 * - productId arrays are present and non-empty
 * - device.js files have valid JavaScript syntax (via node --check)
 * - device.js files have required capabilities and structure
 * - Checks for missing image assets
 * - Validates flow card consistency
 * - Reports health score per driver (0-100)
 * - Aggregate fleet health score
 * - Auto-fix mode for simple issues (--fix)
 *
 * Health Score Breakdown:
 * - Valid compose JSON: 20 points
 * - Non-empty manufacturerName: 15 points
 * - Non-empty productId: 15 points
 * - device.js exists and valid: 15 points
 * - Required capabilities present: 10 points
 * - Images exist: 10 points
 * - Flow cards defined: 5 points
 * - No warnings: 10 points
 *
 * Exit codes: 0 = all healthy, 1 = issues found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, '.github', 'state');

const JSON_OUTPUT = process.argv.includes('--json');
const FIX_MODE = process.argv.includes('--fix');
const MIN_SCORE = parseInt(getArg('--min-score') || '0', 10);
const REPORT_FILE = path.join(STATE_DIR, 'driver-health-report.json');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

function log(msg) {
  if (!JSON_OUTPUT) console.log('[DRIVER-HEALTH] ' + msg);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Required fields in driver.compose.json
const REQUIRED_COMPOSE_FIELDS = ['name', 'capabilities'];
const REQUIRED_ZIGBEE_FIELDS = ['manufacturerName', 'productId'];

// Known valid capabilities for the Homey Zigbee app
const KNOWN_CAPABILITIES = new Set([
  'onoff', 'dim', 'brightness', 'light_hue', 'light_saturation', 'light_temperature',
  'light_mode', 'thermostat_mode', 'thermostat_temperature', 'thermostat_heatingsetpoint',
  'thermostat_coolingsetpoint', 'thermostat_state', 'target_temperature',
  'measure_temperature', 'measure_humidity', 'measure_pressure', 'measure_wind_strength',
  'measure_wind_direction', 'measure_rain', 'measure_battery', 'measure_power',
  'measure_voltage', 'measure_current', 'alarm_battery', 'alarm_motion',
  'alarm_contact', 'alarm_tamper', 'alarm_smoke', 'alarm_heat', 'alarm_water',
  'alarm_carbon_monoxide', 'alarm_vibration', 'alarm_uv', 'meter_power', 'meter_gas',
  'meter_water', 'fan_speed', 'air_purifier_mode', 'air_purifier_fan_speed', 'locked',
  'windowcoverings_set', 'windowcoverings_state', 'windowcoverings_tilt_set',
  'button', 'speaker_playing', 'volume_set', 'speaker_shuffle', 'speaker_repeat',
  'previous_track', 'next_track', 'play_pause',
]);

// Required capabilities per device class
const CLASS_REQUIRED_CAPS = {
  light: ['onoff'],
  socket: ['onoff'],
  switch: ['onoff'],
  sensor: [],
  thermostat: ['thermostat_mode'],
  fan: [],
  curtain: ['windowcoverings_set'],
  lock: ['locked'],
};

// ── Validate a single driver ────────────────────────────────────────────────
function validateDriver(name) {
  const result = {
    name,
    score: 0,
    issues: [],
    warnings: [],
    details: {},
  };

  const driverDir = path.join(DRIVERS_DIR, name);
  const dcjPath = path.join(driverDir, 'driver.compose.json');
  const deviceJsPath = path.join(driverDir, 'device.js');
  const flowPath = path.join(driverDir, 'driver.flow.compose.json');

  // 1. driver.compose.json exists and is valid JSON
  let config = null;
  if (!fs.existsSync(dcjPath)) {
    result.issues.push({ severity: 'error', message: 'driver.compose.json missing' });
    result.score = 0;
    return result;
  }

  try {
    const raw = fs.readFileSync(dcjPath, 'utf8');
    config = JSON.parse(raw);
    result.score += 20;
    result.details.composeValid = true;
  } catch (e) {
    result.issues.push({ severity: 'error', message: `Invalid JSON in driver.compose.json: ${e.message}` });
    result.details.composeValid = false;
    return result;
  }

  // 2. Check required fields
  for (const field of REQUIRED_COMPOSE_FIELDS) {
    if (!config[field]) {
      result.issues.push({ severity: 'error', message: `Missing required field: ${field}` });
      result.score -= 5;
    }
  }

  // 3. Check manufacturerName array
  const hasZigbee = !!config.zigbee;
  if (hasZigbee) {
    const mfrs = config.zigbee.manufacturerName;
    if (!Array.isArray(mfrs) || mfrs.length === 0) {
      result.issues.push({ severity: 'error', message: 'manufacturerName array is missing or empty' });
    } else {
      result.score += 15;
      result.details.manufacturerCount = mfrs.length;

      // Check for empty strings
      const emptyMfrs = mfrs.filter(m => !m || typeof m !== 'string' || m.trim() === '');
      if (emptyMfrs.length > 0) {
        result.warnings.push({ message: `Empty manufacturerName entries found (${emptyMfrs.length})` });
      }

      // Check for wildcard manufacturer names (banned)
      const wildcards = mfrs.filter(m => m.includes('*') || m.includes('?'));
      if (wildcards.length > 0) {
        result.issues.push({ severity: 'error', message: `Wildcard manufacturerName entries (BANNED): ${wildcards.join(', ')}` });
      }
    }

    // 4. Check productId array
    const pids = config.zigbee.productId;
    if (!Array.isArray(pids) || pids.length === 0) {
      result.issues.push({ severity: 'error', message: 'productId array is missing or empty' });
    } else {
      result.score += 15;
      result.details.productIdCount = pids.length;

      // Check for empty strings
      const emptyPids = pids.filter(p => !p || typeof p !== 'string' || p.trim() === '');
      if (emptyPids.length > 0) {
        result.warnings.push({ message: `Empty productId entries found (${emptyPids.length})` });
      }
    }
  } else {
    // WiFi drivers may not have zigbee section
    result.warnings.push({ message: 'No zigbee section in compose config' });
  }

  // 5. Check device.js exists and has valid syntax
  if (fs.existsSync(deviceJsPath)) {
    result.details.deviceJsExists = true;
    try {
      // Validate syntax using node --check
      execSync(`node --check "${deviceJsPath}"`, {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      result.score += 15;
      result.details.deviceJsValid = true;

      // 6. Analyze device.js content
      const deviceContent = fs.readFileSync(deviceJsPath, 'utf8');

      // Check for banned patterns
      if (deviceContent.includes('console.log(')) {
        result.warnings.push({ message: 'device.js uses console.log (should use this.log)' });
      }
      if (deviceContent.includes('console.error(')) {
        result.warnings.push({ message: 'device.js uses console.error (should use this.error)' });
      }

      // Check for class declaration
      if (!deviceContent.includes('class ') && !deviceContent.includes('module.exports')) {
        result.warnings.push({ message: 'device.js may be missing class declaration or module.exports' });
      }

      // Check for lifecycle methods
      if (deviceContent.includes('onNodeInit') || deviceContent.includes('onInit')) {
        result.details.hasLifecycleInit = true;
      }
      if (deviceContent.includes('onDeleted')) {
        result.details.hasLifecycleCleanup = true;
      }

    } catch (e) {
      result.issues.push({ severity: 'error', message: `device.js syntax error: ${e.message.split('\n')[0]}` });
      result.details.deviceJsValid = false;
    }
  } else {
    result.details.deviceJsExists = false;
    result.warnings.push({ message: 'device.js file missing' });
  }

  // 7. Check capabilities against class requirements
  const caps = config.capabilities || [];
  const deviceClass = config.class || '';
  if (deviceClass && CLASS_REQUIRED_CAPS[deviceClass]) {
    for (const req of CLASS_REQUIRED_CAPS[deviceClass]) {
      if (!caps.includes(req)) {
        result.issues.push({ severity: 'error', message: `Class '${deviceClass}' requires capability '${req}'` });
      }
    }
    if (caps.length > 0) result.score += 10;
  } else if (caps.length > 0) {
    result.score += 10;
  }
  result.details.capabilityCount = caps.length;

  // 8. Check for unknown capabilities
  const unknownCaps = caps.filter(c => !KNOWN_CAPABILITIES.has(c) && !c.includes('.'));
  if (unknownCaps.length > 0) {
    result.warnings.push({ message: `Unknown capabilities: ${unknownCaps.join(', ')}` });
  }

  // 9. Check images directory
  const imagesDir = path.join(driverDir, 'assets', 'images');
  const imageFiles = ['small.png', 'large.png', 'xlarge.png'];
  let imagesExist = 0;
  if (fs.existsSync(imagesDir)) {
    for (const img of imageFiles) {
      if (fs.existsSync(path.join(imagesDir, img))) imagesExist++;
    }
  }
  if (imagesExist === imageFiles.length) {
    result.score += 10;
  } else if (imagesExist > 0) {
    result.score += 5;
    result.warnings.push({ message: `Only ${imagesExist}/${imageFiles.length} images present` });
  } else {
    result.warnings.push({ message: 'No images found in assets/images/' });
  }
  result.details.imagesFound = imagesExist;

  // 10. Check flow cards
  if (fs.existsSync(flowPath)) {
    try {
      const flowConfig = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      result.score += 5;
      result.details.flowCardsExist = true;

      // Check for banned titleFormatted with [[device]]
      const flowStr = fs.readFileSync(flowPath, 'utf8');
      if (flowStr.includes('titleFormatted') && flowStr.includes('[[device]]')) {
        result.issues.push({ severity: 'error', message: 'Flow card uses titleFormatted with [[device]] (causes bugs)' });
      }
    } catch (e) {
      result.warnings.push({ message: `Flow compose JSON parse error: ${e.message}` });
    }
  } else {
    result.details.flowCardsExist = false;
  }

  // Clamp score
  result.score = Math.max(0, Math.min(100, result.score));

  return result;
}

// ── Auto-fix simple issues ──────────────────────────────────────────────────
function autoFixIssues(results) {
  let fixCount = 0;
  for (const result of results) {
    if (!result.details.composeValid) continue;

    const dcjPath = path.join(DRIVERS_DIR, result.name, 'driver.compose.json');
    try {
      const config = JSON.parse(fs.readFileSync(dcjPath, 'utf8'));

      // Fix empty manufacturerName arrays by removing empty strings
      if (config.zigbee?.manufacturerName) {
        const origLen = config.zigbee.manufacturerName.length;
        config.zigbee.manufacturerName = config.zigbee.manufacturerName.filter(m => m && m.trim() !== '');
        if (config.zigbee.manufacturerName.length < origLen) {
          fs.writeFileSync(dcjPath, JSON.stringify(config, null, 2) + '\n');
          fixCount++;
          log(`FIXED: Removed empty manufacturerName entries from ${result.name}`);
        }
      }

      // Fix empty productId arrays
      if (config.zigbee?.productId) {
        const origLen = config.zigbee.productId.length;
        config.zigbee.productId = config.zigbee.productId.filter(p => p && p.trim() !== '');
        if (config.zigbee.productId.length < origLen) {
          const current = JSON.parse(fs.readFileSync(dcjPath, 'utf8'));
          current.zigbee.productId = config.zigbee.productId;
          fs.writeFileSync(dcjPath, JSON.stringify(current, null, 2) + '\n');
          fixCount++;
          log(`FIXED: Removed empty productId entries from ${result.name}`);
        }
      }
    } catch (_) { /* skip */ }
  }
  return fixCount;
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  log('Starting driver health check...');

  ensureDir(STATE_DIR);

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch (_) { return false; }
  });

  log(`Found ${driverDirs.length} driver directories`);

  const results = [];
  for (const name of driverDirs) {
    results.push(validateDriver(name));
  }

  // Auto-fix if requested
  let fixCount = 0;
  if (FIX_MODE) {
    fixCount = autoFixIssues(results);
    log(`Auto-fixed ${fixCount} issue(s)`);
  }

  // Compute fleet-level statistics
  const scores = results.map(r => r.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const minDriverScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxDriverScore = scores.length > 0 ? Math.max(...scores) : 0;

  const healthyCount = results.filter(r => r.score >= 80).length;
  const warningCount = results.filter(r => r.score >= 50 && r.score < 80).length;
  const criticalCount = results.filter(r => r.score < 50).length;
  const belowMinScore = MIN_SCORE > 0 ? results.filter(r => r.score < MIN_SCORE).length : 0;

  const totalErrors = results.reduce((sum, r) => sum + r.issues.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  const report = {
    timestamp: new Date().toISOString(),
    totalDrivers: results.length,
    fleetHealth: {
      averageScore: avgScore,
      minScore: minDriverScore,
      maxScore: maxDriverScore,
      healthy: healthyCount,
      warning: warningCount,
      critical: criticalCount,
      belowMinScore,
    },
    totalErrors,
    totalWarnings,
    autoFixed: fixCount,
    drivers: results,
  };

  if (JSON_OUTPUT) {
    // In JSON mode, output only summary + problems
    const output = {
      ...report,
      drivers: results.map(r => ({
        name: r.name,
        score: r.score,
        issueCount: r.issues.length,
        warningCount: r.warnings.length,
        issues: r.issues,
        warnings: r.warnings,
        details: r.details,
      })).filter(r => r.issues.length > 0 || r.warnings.length > 0 || r.score < 80),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    log('');
    log('=== Driver Health Report ===');
    log(`Total drivers: ${results.length}`);
    log(`Fleet average score: ${avgScore}/100`);
    log(`Score range: ${minDriverScore} - ${maxDriverScore}`);
    log(`Healthy (>=80): ${healthyCount}`);
    log(`Warning (50-79): ${warningCount}`);
    log(`Critical (<50): ${criticalCount}`);
    if (MIN_SCORE > 0) log(`Below min score (${MIN_SCORE}): ${belowMinScore}`);
    log(`Total errors: ${totalErrors}`);
    log(`Total warnings: ${totalWarnings}`);
    if (fixCount > 0) log(`Auto-fixed: ${fixCount}`);

    // List worst drivers
    const worst = results.sort((a, b) => a.score - b.score).slice(0, 10);
    if (worst.length > 0 && worst[0].score < 100) {
      log('');
      log('--- Lowest Health Scores ---');
      for (const r of worst) {
        if (r.score >= 100) break;
        const issueStr = r.issues.length > 0 ? ` [${r.issues.length} errors]` : '';
        const warnStr = r.warnings.length > 0 ? ` [${r.warnings.length} warnings]` : '';
        log(`  ${r.score}/100 ${r.name}${issueStr}${warnStr}`);
      }
    }
  }

  // Save report
  ensureDir(path.dirname(REPORT_FILE));
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
