#!/usr/bin/env node
'use strict';

/**
 * energy-compose-gate.js
 *
 * Homey Energy v3 rule: a driver MUST NOT define both `energy.approximation`
 * and power metering capabilities (`measure_power` / `meter_power`). That
 * combination fails Homey Pro Energy schema validation.
 *
 * Report-only: never modifies driver.compose.json files.
 *
 * Usage:
 *   node tools/ci/energy-compose-gate.js
 *   node tools/ci/energy-compose-gate.js --json
 *   node tools/ci/energy-compose-gate.js --root C:/path/to/repo
 *
 * Exit 0 = no Energy v3 conflicts
 * Exit 1 = one or more drivers have approximation + measure_power/meter_power
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let ROOT = path.join(__dirname, '..', '..');
const JSON_MODE = args.includes('--json');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') ROOT = path.resolve(args[++i]);
}

const DRIVERS_DIR = path.join(ROOT, 'drivers');
const POWER_CAPS = new Set(['measure_power', 'meter_power']);

function hasPowerCap(capabilities) {
  if (!Array.isArray(capabilities)) return false;
  return capabilities.some((c) => POWER_CAPS.has(String(c).split('.')[0]));
}

function scan() {
  const conflicts = [];
  const batteryPowerNotes = [];
  let scanned = 0;
  let parseErrors = 0;

  if (!fs.existsSync(DRIVERS_DIR)) {
    return { scanned: 0, parseErrors: 0, conflicts, batteryPowerNotes, error: `missing drivers dir: ${DRIVERS_DIR}` };
  }

  for (const dir of fs.readdirSync(DRIVERS_DIR)) {
    const composePath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    scanned += 1;
    let compose;
    try {
      compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (err) {
      parseErrors += 1;
      continue;
    }

    const caps = compose.capabilities || [];
    const energy = compose.energy || {};
    const hasApprox = energy.approximation != null;
    const hasPower = hasPowerCap(caps);
    const hasBatteries = Array.isArray(energy.batteries) && energy.batteries.length > 0;

    if (hasApprox && hasPower) {
      conflicts.push({
        driver: dir,
        path: path.relative(ROOT, composePath).replace(/\\/g, '/'),
        reason: 'energy.approximation + measure_power/meter_power (Homey Energy v3 conflict)',
        capabilities: caps.filter((c) => POWER_CAPS.has(String(c).split('.')[0])),
      });
    }

    // Soft note: batteries listed while also exposing power metering without approximation.
    // (Compose-only check; does not inspect device.js get mainsPowered.)
    if (hasBatteries && hasPower && !hasApprox) {
      batteryPowerNotes.push({
        driver: dir,
        path: path.relative(ROOT, composePath).replace(/\\/g, '/'),
        batteries: energy.batteries,
        powerCaps: caps.filter((c) => POWER_CAPS.has(String(c).split('.')[0])),
      });
    }
  }

  return { scanned, parseErrors, conflicts, batteryPowerNotes };
}

function main() {
  const result = scan();
  const ok = result.conflicts.length === 0 && !result.error;

  if (JSON_MODE) {
    console.log(JSON.stringify({
      ok,
      gate: 'energy-compose',
      scanned: result.scanned,
      parseErrors: result.parseErrors,
      conflictCount: result.conflicts.length,
      conflicts: result.conflicts,
      batteryPowerNoteCount: result.batteryPowerNotes.length,
      batteryPowerNotes: result.batteryPowerNotes,
      error: result.error || null,
    }, null, 2));
  } else {
    console.log(`energy-compose-gate: scanned ${result.scanned} driver.compose.json files`);
    if (result.error) console.log(`ERROR: ${result.error}`);
    if (result.parseErrors) console.log(`WARN: ${result.parseErrors} unreadable compose file(s)`);

    if (result.conflicts.length === 0) {
      console.log('OK: no Homey Energy v3 approximation + power-cap conflicts');
    } else {
      console.log(`FAIL: ${result.conflicts.length} Energy v3 conflict(s):`);
      for (const c of result.conflicts) {
        console.log(`  - ${c.driver}: ${c.reason} [${c.capabilities.join(', ')}]`);
      }
    }

    if (result.batteryPowerNotes.length > 0) {
      console.log(
        `NOTE: ${result.batteryPowerNotes.length} driver(s) have energy.batteries + measure_power/meter_power without approximation (informational)`
      );
    }
  }

  process.exit(ok ? 0 : 1);
}

main();
