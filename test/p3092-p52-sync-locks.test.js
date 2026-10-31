'use strict';
/* eslint-env mocha */
// P3092: P52 master→stable sync must keep stable's compose-backed fingerprint routes and write one ordered
// changelog line per version.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it } = global.describe ? global : require('node:test');
const { applyLocks } = require('../tools/ci/p52-fingerprint-locks');

const ROOT = path.join(__dirname, '..');

describe('P3092 P52 sync locks', () => {
  it('keeps _TZE204_z7a2jmyy on climate_sensor when master routes it to water_valve_smart', () => {
    const before = { _TZE204_z7a2jmyy: { driverId: 'climate_sensor' } };
    const after = { _TZE204_z7a2jmyy: { driverId: 'water_valve_smart' }, _NEW: { driverId: 'x' } };
    const kept = applyLocks(ROOT, before, after);
    assert.strictEqual(after._TZE204_z7a2jmyy.driverId, 'climate_sensor');
    assert.strictEqual(kept.length, 1);
    assert.ok(after._NEW, 'additive: new keys stay');
  });
  it('lets master win when stable compose agrees with master', () => {
    const r = fs.mkdtempSync(path.join(os.tmpdir(), 'p52-'));
    for (const [d, m] of [['a', []], ['b', ['_X']]]) {
      fs.mkdirSync(path.join(r, 'drivers', d), { recursive: true });
      fs.writeFileSync(path.join(r, 'drivers', d, 'driver.compose.json'), JSON.stringify({ zigbee: { manufacturerName: m } }));
    }
    const after = { _X: { driverId: 'b' } };
    assert.strictEqual(applyLocks(r, { _X: { driverId: 'a' } }, after).length, 0);
    assert.strictEqual(after._X.driverId, 'b');
  });
  it('the workflow runs the lock and inserts the changelog in version order', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/safe-sync-stable.yml'), 'utf8');
    assert.ok(wf.includes('p52-fingerprint-locks.js'));
    assert.ok(wf.includes('orderChangelog'));
    assert.ok(!wf.includes("'P52-auto: synced safe changes from master'"));
    const ce = require('../scripts/automation/changelog-entry');
    const keys = Object.keys(ce.orderChangelog({ '5.12.1': {}, '5.12.10': {}, '5.12.2': {} }));
    assert.deepStrictEqual(keys, ['5.12.10', '5.12.2', '5.12.1']);
  });
});
