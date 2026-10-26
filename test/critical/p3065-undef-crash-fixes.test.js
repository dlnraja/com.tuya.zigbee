'use strict';
/**
 * P3065 — ReferenceError / TypeError crash fixes found by the lifecycle harness and `no-undef`.
 * Every DP of sensor_contact_climate threw (getManufacturer undefined), every DP1 of water_leak_sensor
 * threw (boolean() is an object), onDeleted of 5 switch drivers threw (subDeviceId), etc. A throw in
 * onDeleted skips the rest of the cleanup, so these are memory bugs too.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
// Known, caught by a surrounding try/catch (indicator mode read): kept as-is, listed so new ones fail.
const ALLOWED = new Set(['drivers/wall_switch_2_gang/device.js:ZCLDataTypes', 'drivers/wall_switch_3_gang/device.js:ZCLDataTypes', 'lib/scraper/FreeScrapeStack.js:document']);

test('no undeclared identifier in drivers/ and lib/ runtime code (no-undef ratchet)', { timeout: 180000 }, async () => {
  let ESLint;
  try { ({ ESLint } = require('eslint')); } catch (_e) { return; } // eslint absent -> skip
  const eslint = new ESLint({ cwd: ROOT, useEslintrc: false, overrideConfig: { env: { node: true, es2022: true }, parserOptions: { ecmaVersion: 2022 }, rules: { 'no-undef': 'error' } } });
  const res = await eslint.lintFiles(['drivers/**/*.js', 'lib/**/*.js', 'app.js']);
  const bad = [];
  for (const r of res) {
    for (const m of r.messages) {
      if (m.ruleId !== 'no-undef') {continue;}
      const rel = path.relative(ROOT, r.filePath).split(path.sep).join('/');
      const name = (m.message.match(/'([^']+)'/) || [])[1];
      if (!ALLOWED.has(`${rel}:${name}`)) {bad.push(`${rel}:${m.line} ${name}`);}
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('water_leak_sensor DP1 transform returns a boolean instead of throwing', () => {
  const { boolean } = require(path.join(ROOT, 'lib/converters/ValueConverterRegistry'));
  const conv = boolean();
  const fn = typeof conv === 'function' ? conv : (v) => conv.fromDevice(v);
  assert.strictEqual(fn(1), true);
  assert.strictEqual(fn(0), false);
  assert.strictEqual(fn(true), true);
  const src = fs.readFileSync(path.join(ROOT, 'drivers/water_leak_sensor/device.js'), 'utf8');
  assert.match(src, /_alarmConv\.fromDevice\(v\)/);
});

test('harness: DP flood on the fixed drivers raises none of the fixed errors', { timeout: 240000 }, () => {
  const out = path.join(os.tmpdir(), `p3065-undef-${process.pid}.json`);
  const drv = ['water_leak_sensor', 'sensor_contact_climate', 'sensor_presence_radar', 'smart_rcbo', 'switch_3_gang', 'wall_switch_2_gang']
    .filter((d) => fs.existsSync(path.join(ROOT, 'drivers', d, 'device.js')));
  execFileSync(process.execPath, ['--expose-gc', '--max-old-space-size=256', path.join(ROOT, 'scripts/perf/p3065-lifecycle-leak-harness.js'), ROOT, '12', '40', '1'], {
    cwd: ROOT, stdio: 'ignore', timeout: 230000, env: { ...process.env, OUT: out, DRV: drv.join(',') },
  });
  const r = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.unlinkSync(out);
  const all = JSON.stringify([r.evErr || {}, r.initErrs || r.cycles.map((c) => c.initErrs)]);
  for (const sig of ['alarmTransform is not a function', 'getManufacturer is not defined', 'luxSmoothingState is not defined', 'subDeviceId is not defined', 'zclNode is not defined', 'divisor is not defined']) {
    assert.ok(!all.includes(sig), `still raised: ${sig}`);
  }
});
