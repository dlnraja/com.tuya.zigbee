'use strict';
// P3065: pairing / first-start robustness. Runs every Zigbee driver's real onNodeInit in the
// virtual-clock harness (scripts/perf/pairing-trace.js, nothing leaves the process).
// - smart_heater_controller called this.registerSetting() (not a Homey API) → TypeError in onNodeInit.
// - Ratchet: the number of drivers whose first start throws in the harness may only go down.
//   Most remaining entries are harness-profile mismatches (missing cluster on the default profile),
//   not field crashes; lower BASELINE when you fix one.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TRACE = path.join(ROOT, 'scripts/perf/pairing-trace.js');
const BASELINE = 77;

function trace(ids) {
  // stdout goes to a file: the trace exits right after writing, and a pipe can lose the tail.
  const os = require('os');
  const tmp = path.join(os.tmpdir(), `p3065-pairing-${process.pid}-${Date.now()}.json`);
  const fd = fs.openSync(tmp, 'w');
  try {
    execFileSync(process.execPath, [TRACE, ...ids, '--json'], { cwd: ROOT, stdio: ['ignore', fd, 'ignore'], timeout: 120000 });
  } finally { fs.closeSync(fd); }
  try { return JSON.parse(fs.readFileSync(tmp, 'utf8')); } finally { fs.rmSync(tmp, { force: true }); }
}

test('P3065 smart_heater_controller first start does not throw (registerSetting shim)', () => {
  const [r] = trace(['smart_heater_controller']);
  assert.deepStrictEqual(r.errors, []);
});

test('P3065 smart_heater_controller does not double-send calibration (base class owns it, P3002)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers/smart_heater_controller/device.js'), 'utf8');
  assert.match(src, /key === 'temperature_calibration'\) \{ this\._temperatureCalibration = v; continue; \}/);
});

test('P3065 harness teardown no longer reports SDK onDeleted removeAllListeners as an error', () => {
  const [r] = trace(['motion_sensor']);
  assert.ok(!r.errors.some((e) => /removeAllListeners/.test(e)), JSON.stringify(r.errors));
});

test('P3065 ratchet: drivers whose first start throws in the harness never increase', () => {
  const ids = fs.readdirSync(path.join(ROOT, 'drivers'))
    .filter((d) => fs.existsSync(path.join(ROOT, 'drivers', d, 'device.js')));
  const res = trace(ids);
  const failing = res.filter((r) => r.errors && r.errors.length && !r.errors.every((e) => /onNodeInit is not a function/.test(e)));
  assert.ok(failing.length <= BASELINE, `failing=${failing.length} > baseline ${BASELINE}: ${failing.map((r) => r.driver).join(',')}`);
});
