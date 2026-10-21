'use strict';
/** P2927 — Basic (0x0000) chatter is quiet; RAW-FALLBACK per-frame log is bounded. */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('P2927 quiet Basic cluster frames', () => {
  it('TuyaZigbeeDevice treats 0x0000 as quiet (log + RX flood)', () => {
    const t = fs.readFileSync(path.join(__dirname, '../../lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.match(t, /quietRx = cidForRx === 0x0000/);
    assert.match(t, /quietCluster = cidNum === 0x0000/);
  });
  it('RawClusterFallback raw attr log is throttled and bounded', () => {
    const RCF = require('../../lib/clusters/RawClusterFallback.js');
    const C = RCF.RawClusterFallback || RCF;
    const logs = [];
    const dev = { log: (m) => logs.push(m), error() {}, hasCapability: () => false, getData: () => ({}), getSettings: () => ({}), homey: { settings: { get() {}, set() {} } } };
    const f = new C(dev);
    logs.length = 0;
    for (let i = 0; i < 250; i++) { try { f._onRawAttr('basic_0', { NAME: 'basic' }, 'appVersion', i, 1); } catch (_e) { /* soft */ } }
    for (let k = 0; k < 200; k++) { try { f._onRawAttr('basic_0', { NAME: 'basic' }, `a${k}`, 1, 1); } catch (_e) { /* soft */ } }
    const raw = logs.filter((l) => l.includes('RAW ZCL: basic.appVersion'));
    assert.equal(raw.length, 5); // #1,#2,#3,#100,#200
    assert.ok(f._rawLogCounts.size <= 64);
  });
});

describe('P2928 pruned publish validate', () => {
  it('flags orphan device cards', () => {
    const { findOrphanCards } = require('../../scripts/maintenance/bastien-pruned-validate.js');
    const m = { drivers: [{ id: 'a' }], flow: { triggers: [
      { id: 'ok', args: [{ type: 'device', filter: 'driver_id=a' }] },
      { id: 'bad', args: [{ type: 'device', filter: 'driver_id=gone' }] },
    ] } };
    assert.deepEqual(findOrphanCards(m), ['triggers.bad']);
  });
});
