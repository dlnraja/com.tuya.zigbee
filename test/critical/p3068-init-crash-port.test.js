'use strict';
// P3068: first-start crash guards ported to every branch (master f5727aecfa + d1eea228de TRV hunk).
// - smart_heater_controller called this.registerSetting() (not a Homey API) → TypeError, onNodeInit aborted.
// - radiator_valve_zigbee assigned this.dpMappings while UnifiedThermostatBase only defines a getter → TypeError.
// Runs the real onNodeInit in the P3065 lifecycle harness (in-process stubs, nothing leaves the process).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const HARNESS = path.join(ROOT, 'scripts/perf/p3065-lifecycle-leak-harness.js');

function run(drivers) {
  // unique file per process: no shared temp file when suites run in parallel
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'p3068-init-')), 'out.json');
  try {
    execFileSync(process.execPath, ['--expose-gc', HARNESS, ROOT, String(drivers.length * 2), '3', '1'], {
      cwd: ROOT, stdio: 'ignore', timeout: 180000,
      env: { ...process.env, DRV: drivers.join(','), OUT: out },
    });
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  } finally { fs.rmSync(path.dirname(out), { recursive: true, force: true }); }
}

test('P3068 smart_heater_controller and radiator_valve_zigbee first start do not throw', { timeout: 200000 }, () => {
  const r = run(['smart_heater_controller', 'radiator_valve_zigbee']);
  const errs = Object.keys(r.initErrs || {});
  assert.deepStrictEqual(errs, [], errs.join('\n'));
});

test('P3068 TRV keeps a setter for dpMappings and the heater has a registerSetting shim', () => {
  const trv = fs.readFileSync(path.join(ROOT, 'drivers/radiator_valve_zigbee/device.js'), 'utf8');
  assert.match(trv, /set dpMappings\(v\)/);
  const heater = fs.readFileSync(path.join(ROOT, 'drivers/smart_heater_controller/device.js'), 'utf8');
  assert.match(heater, /registerSetting\(key, fn\)|registerSetting\(/);
  assert.match(heater, /async onSettings\(/);
});
