'use strict';
// P3065 D8: "Battery low" driver cards fire once per downward crossing of measure_battery
// (default 20 %, hysteresis 5 %, setting battery_low_threshold), also from low/medium/high enums.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const W = require('../../lib/flow/DeadFlowAutoWire');

const ROOT = path.join(__dirname, '..', '..');
const ID = 'x_battery_low';

function seq(device, values, start) {
  let prev = start;
  return values.map((v) => { const f = W.lowCrossed(device, ID, v, prev); prev = v; return f; });
}

test('P3065 D8: once per crossing with 5 % hysteresis', () => {
  const d = {};
  assert.deepEqual(seq(d, [25, 19, 18, 22, 19, 24, 26, 20, 10], 30),
    [false, true, false, false, false, false, false, true, false]);
});

test('P3065 D8: no fire without a known level above the threshold (restart / new device)', () => {
  assert.deepEqual(seq({}, [14, 12], 15), [false, false]);
  assert.deepEqual(seq({}, [14], null), [false]);
  assert.equal(W.lowCrossed({}, ID, 'not-a-level', 50), false);
  assert.equal(W.lowCrossed({}, ID, true, 50), false);
});

test('P3065 D8: battery state enums and their 10/50/100 % mapping', () => {
  assert.deepEqual(seq({}, ['low', 'low', 'medium', 'low', 'high'], 'high'), [true, false, false, true, false]);
  assert.deepEqual(seq({}, [10, 50, 10], 100), [true, false, true]);
});

test('P3065 D8: battery_low_threshold setting wins when valid', () => {
  const d = { getSetting: (k) => k === 'battery_low_threshold' ? 30 : null };
  assert.deepEqual(seq(d, [31, 28, 33, 36, 30], 40), [false, true, false, false, true]);
  const bad = { getSetting: () => 'x' };
  assert.deepEqual(seq(bad, [28, 19], 40), [false, true]);
});

test('P3065 D8: mapped Battery low cards fire at runtime only on the crossing', async () => {
  W._resetForTests();
  const low = Object.entries(W.loadMap().triggers).filter(([, v]) => v.when === 'low');
  assert.ok(low.length >= 8, `only ${low.length} battery-low cards mapped`);
  for (const [id, v] of low) {
    assert.equal(v.cap, 'measure_battery', id);
    const flow = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', v.driver, 'driver.flow.compose.json'), 'utf8'));
    const fired = [];
    const dev = {
      driver: { id: v.driver },
      homey: { manifest: { flow: { triggers: flow.triggers } } },
      async triggerFlowCard(cid) { fired.push(cid); return true; },
    };
    await W.fireMappedTriggers(dev, 'measure_battery', 40, 45);
    await W.fireMappedTriggers(dev, 'measure_battery', 18, 40);
    await W.fireMappedTriggers(dev, 'measure_battery', 17, 18);
    assert.deepEqual(fired.filter((f) => f === id), [id], `${id} must fire exactly once`);
  }
  // stateless callers (no device context) never fire a stateful card
  const [id, v] = low[0];
  assert.ok(!W.mappedTriggerIds(v.driver, 'measure_battery', 5).includes(id));
});
