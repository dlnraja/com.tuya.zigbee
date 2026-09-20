#!/usr/bin/env node
'use strict';

/*
 * Google Assistant / Alexa voice-safety gate.
 *
 * Homey can sync more devices to voice assistants than older app versions did.
 * Real voice commands must stay on stateful capabilities such as onoff, dim,
 * windowcoverings, locked, and alarm controls.
 *
 * Voice safety for button.* is getable:false + setable:false (never a command
 * surface). maintenanceAction:
 *   - class !== button (switches): must be true (Maintenance only — P2492)
 *   - class === button (scene remotes): true OR false allowed
 *     false = Homey device-view Button N (P2614 TS0044); true = legacy Maintenance
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

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

  const sceneRemoteClass = compose.class === 'button';

  for (const capabilityId of capabilities) {
    if (!String(capabilityId).startsWith('button.')) continue;
    checkedButtons++;

    const capabilityOptions = options[capabilityId] || {};
    if (capabilityOptions.getable !== false) {
      violations.push(`${driverName}: ${capabilityId}.getable must be false`);
    }
    if (capabilityOptions.setable !== false) {
      violations.push(`${driverName}: ${capabilityId}.setable must be false`);
    }
    if (sceneRemoteClass) {
      // P2614: allow device-view (false) or legacy Maintenance (true)
      if (capabilityOptions.maintenanceAction !== true
          && capabilityOptions.maintenanceAction !== false) {
        violations.push(
          `${driverName}: ${capabilityId}.maintenanceAction must be boolean (class:button)`,
        );
      }
    } else if (capabilityOptions.maintenanceAction !== true) {
      violations.push(
        `${driverName}: ${capabilityId}.maintenanceAction must be true (non-button class)`,
      );
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

console.log('OK: button.* event-only (getable/setable false); class:button may use device-view.');
