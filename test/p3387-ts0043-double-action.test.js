'use strict';

/**
 * P3387 - TS0043 3-button remote: one press must run a Flow once.
 * Root causes covered:
 *  1) snappy card fan-out fired the preferred heuristic card and the same id
 *     again from the declared list (generic "Button pressed" ran twice);
 *  2) byte-identical ZCL retransmits (same TSN) reached every receive path.
 */

require('./_support/homey-stub');
const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { planSnappyCards } = require('../lib/buttons/SnappyCardPlan');
const { isDuplicate, installZclTsnGate, tsnOf } = require('../lib/buttons/ZclTsnGate');

const TRIGGERS = require('../drivers/button_wireless_3/driver.flow.compose.json').triggers.map((t) => t.id);

function fakeDevice() {
  const fired = [];
  const makeCard = (id) => ({ trigger: async () => { fired.push(id); return true; } });
  const homey = {
    manifest: { flow: { triggers: [...TRIGGERS, 'button_pressed', 'button_double_press', 'button_long_press', 'button_multi_press', 'button_matrix'].map((id) => ({ id })) } },
    flow: { getDeviceTriggerCard: makeCard, getTriggerCard: makeCard },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    drivers: { getDrivers: () => ({}) },
  };
  const ButtonDevice = require('../lib/devices/ButtonDevice');
  const dev = Object.create(ButtonDevice.prototype);
  Object.assign(dev, {
    homey,
    driver: { id: 'button_wireless_3', manifest: { flow: { triggers: TRIGGERS.map((id) => ({ id })) } } },
    buttonCount: 3,
    gangCount: 3,
    mainsPowered: false,
    _nativeEventTracker: { lastTripleTime: {}, lastReleaseTime: {} },
    _clickPatternState: {},
    _holdReleaseTimers: {},
    log() {},
    error() {},
    getSetting() { return null; },
    getSettings() { return {}; },
    hasCapability(c) { return c === 'measure_battery'; },
    getCapabilityValue() { return 100; },
    setCapabilityValue: async () => {},
    safeSetCapabilityValue: async () => {},
    getData() { return {}; },
    getStoreValue() { return null; },
    setStoreValue: async () => {},
  });
  dev.getDeviceProfile = require('../drivers/button_wireless_3/device').prototype.getDeviceProfile.bind(dev);
  return { dev, fired };
}

const settle = () => new Promise((r) => setTimeout(r, 30));

describe('P3387 TS0043 double action', () => {
  it('one physical single press fires each Flow card id at most once', async () => {
    const { dev, fired } = fakeDevice();
    await dev.triggerButtonPress(1, 'single', 1, { source: 'physical' });
    await settle();
    const counts = {};
    for (const id of fired) { counts[id] = (counts[id] || 0) + 1; }
    const dup = Object.entries(counts).filter(([, n]) => n > 1);
    assert.deepStrictEqual(dup, [], `duplicate card fires: ${JSON.stringify(counts)}`);
    // Nothing that used to fire is lost.
    assert.ok(counts.button_wireless_3_button_3gang_button_pressed === 1, JSON.stringify(counts));
    assert.ok(counts.button_wireless_3_button_3gang_button_1_pressed === 1, JSON.stringify(counts));
    assert.ok(counts.button_pressed === 1, JSON.stringify(counts));
  });

  it('typed double and long presses fire their cards once each, never dropped', async () => {
    for (const type of ['double', 'long']) {
      const { dev, fired } = fakeDevice();
      await dev.triggerButtonPress(2, type, type === 'double' ? 2 : 1, { source: 'physical' });
      await settle();
      const generic = `button_wireless_3_button_3gang_button_${type === 'double' ? 'double_press' : 'long_press'}`;
      const n = fired.filter((id) => id === generic).length;
      assert.strictEqual(n, 1, `${type}: ${JSON.stringify(fired)}`);
    }
  });

  it('plan keeps a heuristic card that is not fired directly', () => {
    const plan = planSnappyCards({ candidates: ['a', 'b'], declared: ['b'], universal: 'button_pressed', preferred: 'a' });
    assert.deepStrictEqual(plan.heuristic, ['a', 'b']);
    const skip = planSnappyCards({ candidates: ['a', 'b'], declared: ['A'], universal: null, preferred: 'a' });
    assert.strictEqual(skip.heuristic, null);
    const fallback = planSnappyCards({ candidates: ['button_pressed', 'b', 'c'], declared: ['b'], universal: 'button_pressed', preferred: null });
    assert.deepStrictEqual(fallback.heuristic, ['c']);
  });
});

describe('P3387 ZCL TSN gate (Z2M hasAlreadyProcessedMessage idea)', () => {
  // cluster-specific, server->client, disable default response off, tsn 0x2a, cmd 0xFD, value 0 (single)
  const fdSingle = (tsn) => Buffer.from([0x01, tsn, 0xfd, 0x00]);

  it('reads the TSN with and without the manufacturer-specific header', () => {
    assert.strictEqual(tsnOf(fdSingle(0x2a)), 0x2a);
    assert.strictEqual(tsnOf(Buffer.from([0x05, 0x02, 0x10, 0x33, 0xfd, 0x00])), 0x33);
  });

  it('drops a byte-identical retransmit inside the window, keeps a new TSN', () => {
    const st = {};
    assert.strictEqual(isDuplicate(st, 1, 6, fdSingle(7), { now: 1000 }).drop, false);
    assert.strictEqual(isDuplicate(st, 1, 6, fdSingle(7), { now: 1900 }).drop, true);
    // Real second press: new TSN -> kept (a fast real double click survives).
    assert.strictEqual(isDuplicate(st, 1, 6, fdSingle(8), { now: 2000 }).drop, false);
    // Same TSN on another endpoint is another button.
    assert.strictEqual(isDuplicate(st, 2, 6, fdSingle(7), { now: 2000 }).drop, false);
    // After the window the same bytes are accepted again.
    assert.strictEqual(isDuplicate(st, 1, 6, fdSingle(7), { now: 1000 + 6000 }).drop, false);
  });

  it('never drops a typed double report that follows a single', () => {
    const st = {};
    isDuplicate(st, 1, 6, Buffer.from([0x01, 9, 0xfd, 0x00]), { now: 0 });
    assert.strictEqual(isDuplicate(st, 1, 6, Buffer.from([0x01, 10, 0xfd, 0x01]), { now: 100 }).drop, false);
  });

  it('wraps the raw node entry once and stops the copy before any listener', async () => {
    let seen = 0;
    const node = { handleFrame: async () => { seen++; } };
    const dev = { log() {} };
    assert.strictEqual(installZclTsnGate(dev, node), true);
    const first = node.handleFrame;
    assert.strictEqual(installZclTsnGate(dev, node), true);
    assert.strictEqual(node.handleFrame, first, 'idempotent');
    await node.handleFrame(1, 6, fdSingle(42), {});
    await node.handleFrame(1, 6, fdSingle(42), {});
    await node.handleFrame(1, 6, fdSingle(43), {});
    assert.strictEqual(seen, 2);
    assert.strictEqual(dev._p3387TsnState.dropped, 1);
  });

  it('ButtonDevice.onNodeInit installs the gate on the raw node', () => {
    const src = require('fs').readFileSync(require.resolve('../lib/devices/ButtonDevice'), 'utf8');
    assert.ok(/installZclTsnGate\(this, this\.node\)/.test(src));
  });
});
