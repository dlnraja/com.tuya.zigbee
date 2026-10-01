'use strict';

/**
 * P2763 — alarm_contact single source of truth (DP1 vs IAS zoneStatus latch).
 * Contre quoi: IAS bitmap alarm1=false closing a contact that DP1 reports open
 * (and vice versa) → flip-flop.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createLatchState, decide, DEFAULT_STALE_MS } = require('../../lib/sensors/ContactSourceLatch');

describe('P2763 contact source latch', () => {
  it('DP1 open is not closed by a contradicting IAS alarm1=false', () => {
    const s = createLatchState();
    assert.equal(decide(s, 'dp', true, { now: 1000 }).accept, true);
    const v = decide(s, 'ias', false, { now: 2000 });
    assert.equal(v.accept, false);
    assert.equal(s.value, true);
  });

  it('IAS alarm1=true does not open a contact DP1 reports closed', () => {
    const s = createLatchState();
    decide(s, 'dp', false, { now: 1000 });
    assert.equal(decide(s, 'ias', true, { now: 2000 }).accept, false);
  });

  it('agreeing non-owner reports are accepted (keep-alive)', () => {
    const s = createLatchState();
    decide(s, 'dp', true, { now: 1000 });
    assert.equal(decide(s, 'ias', true, { now: 2000 }).accept, true);
  });

  it('IAS-only device: IAS owns and drives both directions', () => {
    const s = createLatchState();
    assert.equal(decide(s, 'ias', true, { now: 1 }).accept, true);
    assert.equal(decide(s, 'ias', false, { now: 2 }).accept, true);
    assert.equal(s.owner, 'ias');
  });

  it('DP outranks IAS when it first appears; IAS may take over after owner silence', () => {
    const s = createLatchState();
    decide(s, 'ias', false, { now: 1 });
    const v = decide(s, 'dp', true, { now: 2 });
    assert.equal(v.accept, true);
    assert.equal(s.owner, 'dp');
    const late = decide(s, 'ias', false, { now: 3 + DEFAULT_STALE_MS });
    assert.equal(late.accept, true);
    assert.equal(s.owner, 'ias');
  });

  it('state survives store round-trip', () => {
    const s = createLatchState();
    decide(s, 'dp', true, { now: 5 });
    const r = createLatchState(JSON.parse(JSON.stringify(s)));
    assert.equal(r.owner, 'dp');
    assert.equal(decide(r, 'ias', false, { now: 6 }).accept, false);
  });

  it('contact_sensor wires the latch (soft, never blocking)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../drivers/contact_sensor/device.js'), 'utf8');
    assert.match(src, /ContactSourceLatch/);
    assert.match(src, /latch is complementary/);
    assert.doesNotMatch(src, /this\.setCapabilityValue\(/);
  });

  it('P2763b: applyToDevice latches out contradicting IAS on zigbee contact drivers', () => {
    const { applyToDevice } = require('../../lib/sensors/ContactSourceLatch');
    const store = {};
    const dev = { log() {}, getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; } };
    assert.equal(applyToDevice(dev, false, true), true);
    assert.equal(applyToDevice(dev, true, false), false);
    assert.equal(applyToDevice(dev, true, true), true);
    assert.equal(applyToDevice(null, true, false), true); // soft on bad input
    for (const d of ['contact_sensor_zigbee', 'sensor_contact_zigbee']) {
      const src = fs.readFileSync(path.join(__dirname, `../../drivers/${d}/device.js`), 'utf8');
      assert.match(src, /ContactSourceLatch\.applyToDevice\(this, isIAS, finalValue\)/, d);
      assert.match(src, /latch is complementary/, d);
    }
  });

  it('npm check:p2763 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2763']);
  });
});
