'use strict';
/* eslint-env mocha */
// An old bulk "safe math" rewrite turned `(a - b) / c` into `(a - safeDivide(b), c)` (comma operator, always c),
// `x / 1000` into `x * 1000`, and `substring(0, 4)` into `substring(0, safeMultiply(4))` (empty string -> NaN).
// These checks keep the repaired code repaired and fail if the pattern comes back anywhere in drivers/ or lib/.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
function* jsFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'assets') { yield* jsFiles(p); } } else if (e.name.endsWith('.js')) { yield p; }
  }
}
let sources = null;
const hits = (re) => {
  if (!sources) { sources = [...jsFiles(path.join(root, 'drivers')), ...jsFiles(path.join(root, 'lib'))].map((p) => [path.relative(root, p), fs.readFileSync(p, 'utf8')]); }
  return sources.filter(([, s]) => re.test(s)).map(([p]) => p);
};

describe('safe-math rewrite damage', () => {
  it('no single-argument safeDivide/safeMultiply used as a comma expression', () => {
    assert.deepStrictEqual(hits(/safe(Divide|Multiply)\(\s*[\w.]+\s*\)\s*,/), []);
  });
  it('no substring bounds wrapped in safeMultiply (HSV parse returned NaN)', () => {
    assert.deepStrictEqual(hits(/substring\([^)]*safeMultiply\(/), []);
  });
  it('no 0-1000 DP brightness decoded with * 1000', () => {
    assert.deepStrictEqual(hits(/capability: 'dim', transform: \(v\) => Math\.max\(0\.01, v \* 1000\)/), []);
  });
  it('ZCL thermostat setpoint and local temperature are read in 0.01 degC', () => {
    assert.deepStrictEqual(hits(/'target_temperature', v \* 100\)/), []);
    assert.deepStrictEqual(hits(/'measure_temperature', parseFloat\(v \)\)/), []);
  });
  it('Tuya time sync computes the UTC offset in hours', () => {
    assert.deepStrictEqual(hits(/tzDate - safeDivide\(now\)/), []);
    assert.ok(fs.readFileSync(path.join(root, 'drivers/thermostat_tuya_dp/device.js'), 'utf8').includes('Math.round((tzDate - now) / 3600000)'));
  });
  it('ColorConverter.rgbToHsv returns the right hue', () => {
    // Child process: requiring lib modules here would pre-load them under other suites' mocks.
    const out = require('child_process').execFileSync(process.execPath, ['-e',
      "const C=require('./lib/helpers/ColorConverter.js');const K=C.ColorConverter||C;"
      + "process.stdout.write(JSON.stringify([K.rgbToHsv(0,0,255).h,K.rgbToHsv(0,255,0).h,K.rgbToHsv(255,0,0).h]))"], { cwd: root }).toString();
    const [blue, green, red] = JSON.parse(out);
    assert.ok(Math.abs(blue - 2 / 3) < 1e-9);
    assert.ok(Math.abs(green - 1 / 3) < 1e-9);
    assert.strictEqual(red, 0);
  });
  it('radar voltage battery: (dV - 20) * 10', () => {
    assert.ok(fs.readFileSync(path.join(root, 'drivers/sensor_presence_radar/device.js'), 'utf8').includes('Math.round((attrs.batteryVoltage - 20) * 10)'));
  });
});
