'use strict';
// P3018b: TS130F _TZ3000_cet6ch1r EP2 / 0x0102 handled at runtime, optional, zero TX, no pairing change.
// WHY: runs under `node --test` and mocha alike.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const EC = require('../../lib/zigbee/EndpointCoverage');

function cluster() { const c = new EventEmitter(); c.writes = 0; c.writeAttributes = () => { c.writes++; }; c.bind = () => { c.writes++; }; return c; }
function device(caps = []) {
  const store = {}; const vals = {};
  return {
    store, vals, log() {}, hasCapability: (c) => caps.includes(c),
    setCapabilityValue: async (c, v) => { vals[c] = v; }, getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; },
  };
}

describe('P3018b EP2 window covering (passive)', () => {
  it('stores EP2 calibration time (moes /10 s) and mode, never writes or binds', () => {
    const wc1 = cluster(); const wc2 = cluster();
    const zcl = { endpoints: { 1: { clusters: { windowCovering: wc1 } }, 2: { clusters: { windowCovering: wc2 } }, 242: { clusters: {} } } };
    const d = device(['windowcoverings_set']);
    const st = EC.attach(d, zcl);
    assert.strictEqual(wc1.listenerCount('attr.calibrationTime'), 0, 'main EP left to the driver');
    wc2.emit('attr.calibrationTime', 253);
    wc2.emit('attr.calibrationMode', 'End');
    assert.deepStrictEqual(d.store.endpoint_info, { 'ep2.calibration_time_s': 25.3, 'ep2.calibration_mode': 'End' });
    assert.strictEqual(wc2.writes + wc1.writes, 0);
    assert.ok(st.routed.includes('ep2.windowCovering.calibrationTime'));
    assert.deepStrictEqual(EC.snapshot(d).info, { 'ep2.calibration_time_s': 25.3, 'ep2.calibration_mode': 'End' });
  });
  it('EP2 lift % routes to a same-endpoint capability only (inverted to Homey 1=open)', () => {
    const wc2 = cluster();
    const d = device(['windowcoverings_set', 'windowcoverings_set.2']);
    EC.attach(d, { endpoints: { 1: { clusters: {} }, 2: { clusters: { windowCovering: wc2 } } } });
    wc2.emit('attr.currentPositionLiftPercentage', 30);
    assert.strictEqual(d.vals['windowcoverings_set.2'], 0.7);
    assert.strictEqual(d.vals.windowcoverings_set, undefined, 'never crosses to the main cover');
  });
  it('absent EP2 → nothing attached (optional); out-of-range values are ignored', () => {
    const d = device(['windowcoverings_set']);
    const st = EC.attach(d, { endpoints: { 1: { clusters: { windowCovering: cluster() } } } });
    assert.strictEqual(st.routed.filter((r) => r.startsWith('ep2')).length, 0);
    const conv = EC.ROUTES.windowCovering.find((r) => r[0] === 'calibrationTime')[2];
    assert.strictEqual(conv(0xffff), undefined);
    assert.strictEqual(conv(-1), undefined);
  });
  it('info store stays bounded', () => { assert.ok(EC.MAX_INFO > 0 && EC.MAX_INFO <= 32); });
});
