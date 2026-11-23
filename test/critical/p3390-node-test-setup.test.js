'use strict';
// P3390 (22/11/2026 Paris, run 45062873515): node:test strict must preload the same setup as mocha.
// Without test/setup/host-env.js, LazyDeviceClass was first required inside a test's hooked
// Module._load window, so hermetic device.js requires stayed lazy and bound to evicted copies of their
// bases (sauna_thermostat_ae5503 not instanceof thermostat_tuya_dp, fingerbot 'seq is an unexpected property').
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const S = require(path.join(ROOT, 'tools', 'ci', 'node-test-strict.js'));

test('strict runner preloads the mocha setup file', () => {
  const mocharc = JSON.parse(fs.readFileSync(path.join(ROOT, '.mocharc.json'), 'utf8'));
  const req = [].concat(mocharc.require || []).map((f) => path.resolve(ROOT, f));
  assert.ok(req.includes(S.SETUP_FILE), 'mocha and node:test share test/setup/host-env.js');
  assert.deepStrictEqual(S.setupArgs(), ['--require', S.SETUP_FILE]);
  assert.match(fs.readFileSync(S.SETUP_FILE, 'utf8'), /require\('\.\.\/\.\.\/lib\/utils\/LazyDeviceClass'\)/);
});

test('hermetic device.js requires stay eager under the runner setup (sauna + fingerbot)', () => {
  const files = ['p3013-dedicated-z2m-drivers.test.js', 'p3050-fingerbot-senddata.test.js'].map((f) => path.join(__dirname, f));
  const r = spawnSync(process.execPath, [...S.setupArgs(), '--test', '--test-reporter=dot', ...files], { cwd: ROOT, env: S.childEnv(), encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`.slice(-2000));
});
