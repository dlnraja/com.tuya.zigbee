#!/usr/bin/env node
'use strict';

/**
 * l14-capability-writers-gate.js (P205)
 * Fail if primary battery/energy writers bypass safeSetCapabilityValue.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const JSON_MODE = process.argv.includes('--json');

const CHECKS = [
  {
    file: 'lib/managers/SmartBatteryManager.js',
    mustInclude: ['safeSetCapabilityValue', 'async _safeSet('],
  },
  {
    file: 'lib/battery/UnifiedBatteryHandler.js',
    mustInclude: ['async _safeSetCap(', 'safeSetCapabilityValue'],
    // raw setCapabilityValue only allowed inside _safeSetCap fallback
    forbidOutsideSafe: true,
  },
  {
    file: 'lib/managers/SmartEnergyManager.js',
    mustInclude: ['safeSetCapabilityValue'],
  },
  {
    file: 'lib/mixins/PhysicalButtonMixin.js',
    mustInclude: ['_triggerAppLevelButtonFlows', 'button_pressed'],
  },
  {
    file: 'lib/devices/UnifiedSwitchBase.js',
    mustInclude: ['VirtualEnergyMeterMixin', '_initVirtualEnergy'],
  },
];

function main() {
  const failures = [];
  for (const c of CHECKS) {
    const abs = path.join(ROOT, c.file);
    if (!fs.existsSync(abs)) {
      failures.push({ file: c.file, reason: 'missing' });
      continue;
    }
    const src = fs.readFileSync(abs, 'utf8');
    for (const needle of c.mustInclude) {
      if (!src.includes(needle)) {
        failures.push({ file: c.file, reason: `missing:${needle}` });
      }
    }
  }

  const summary = {
    ok: failures.length === 0,
    failures,
    checked: CHECKS.map((c) => c.file),
  };

  if (JSON_MODE) {
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } else {
    console.log(`[l14-capability-writers-gate] ${summary.ok ? 'PASS' : 'FAIL'}`);
    for (const f of failures) console.log(`  - ${f.file}: ${f.reason}`);
  }
  process.exit(summary.ok ? 0 : 1);
}

main();
