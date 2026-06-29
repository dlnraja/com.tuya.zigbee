#!/usr/bin/env node
'use strict';

/*
 * Google Assistant / Alexa voice-safety gate.
 *
 * Homey can sync more devices to voice assistants than older app versions did.
 * Real voice commands must stay on stateful capabilities such as onoff, dim,
 * windowcoverings, locked, and alarm controls. Tuya button.* capabilities are
 * physical events or maintenance helpers, so they must never be getable/setable
 * command surfaces.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const REQUIRED = {
  getable: false,
  setable: false,
  maintenanceAction: true,
};

const violations = [];
let checkedDrivers = 0;
let checkedButtons = 0;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

for (const entry of fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const driverName = entry.name;
  const driverDir = path.join(DRIVERS_DIR, driverName);

  const composePath = path.join(driverDir, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;

  checkedDrivers++;
  let compose;
  try {
    compose = readJson(composePath);
  } catch (err) {
    violations.push(`${driverName}: invalid driver.compose.json (${err.message})`);
    continue;
  }

  const capabilities = Array.isArray(compose.capabilities) ? compose.capabilities : [];
  const options = compose.capabilitiesOptions && typeof compose.capabilitiesOptions === 'object'
    ? compose.capabilitiesOptions
    : {};

  for (const capabilityId of capabilities) {
    if (!String(capabilityId).startsWith('button.')) continue;
    checkedButtons++;

    const capabilityOptions = options[capabilityId] || {};
    for (const [key, expected] of Object.entries(REQUIRED)) {
      if (capabilityOptions[key] !== expected) {
        violations.push(`${driverName}: ${capabilityId}.${key} must be ${expected}`);
      }
    }
  }
}

console.log('Google Assistant voice-safety gate');
console.log(`Drivers checked: ${checkedDrivers}`);
console.log(`button.* capabilities checked: ${checkedButtons}`);

if (violations.length > 0) {
  console.error(`\nVoice-safety violations: ${violations.length}`);
  for (const violation of violations.slice(0, 30)) {
    console.error(`  - ${violation}`);
  }
  if (violations.length > 30) {
    console.error(`  - ... ${violations.length - 30} more`);
  }
  console.error('\nRun: node scripts/validation/fix-button-capability-options.js --apply');
  process.exit(1);
}

console.log('OK: all button.* capabilities are event/maintenance-only.');
