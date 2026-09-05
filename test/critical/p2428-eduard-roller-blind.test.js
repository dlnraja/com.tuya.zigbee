'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');
const DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
const { isBatteryCoverMfr } = require(path.join(ROOT, 'lib', 'helpers', 'batteryPowerSource'));

describe('P2428 Eduard_Martirosyan #2228 DC tubular roller blind motor (_TZE284_fodv6bkr)', () => {
  it('DeviceFingerprintDB resolves exact and caseless to curtain_motor', () => {
    const exact = DeviceFingerprintDB.lookup('_TZE284_fodv6bkr', 'TS0601');
    assert.ok(exact, 'must resolve exact');
    assert.strictEqual(exact.driver, 'curtain_motor');
    assert.strictEqual(exact.powerSource, 'battery');

    const lower = DeviceFingerprintDB.lookup('_tze284_fodv6bkr', 'ts0601');
    assert.ok(lower, 'must resolve lower case');
    assert.strictEqual(lower.driver, 'curtain_motor');
  });

  it('isBatteryCoverMfr recognizes _TZE284_fodv6bkr and _TZE284_libht6ua as battery devices', () => {
    assert.strictEqual(isBatteryCoverMfr('_TZE284_fodv6bkr'), true);
    assert.strictEqual(isBatteryCoverMfr('_tze284_fodv6bkr'), true);
    assert.strictEqual(isBatteryCoverMfr('_TZE284_libht6ua'), true);
    assert.strictEqual(isBatteryCoverMfr('_tze284_libht6ua'), true);
  });

  it('curtain_motor compose claims _TZE284_fodv6bkr and TS0601', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers', 'curtain_motor', 'driver.compose.json'), 'utf8')
    );
    const mfrs = (compose.zigbee?.manufacturerName || []).map(m => m.toLowerCase());
    const pids = (compose.zigbee?.productId || []).map(p => String(p).toUpperCase());
    assert.ok(mfrs.includes('_tze284_fodv6bkr'));
    assert.ok(pids.includes('TS0601'));
  });

  it('sacred-keep pins _TZE284_fodv6bkr to prevent publish compaction drops', () => {
    const sacred = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json'), 'utf8')
    );
    const found = (sacred.couples || []).find(
      c => c.mfr.toLowerCase() === '_tze284_fodv6bkr' && c.pid.toUpperCase() === 'TS0601' && c.driverId === 'curtain_motor'
    );
    assert.ok(found, 'must be pinned in publish-sacred-keep-couples.json');
  });
});
