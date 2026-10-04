'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const map = require('../../config/flow/dead-flow-autowire.json');
const W = require('../../lib/flow/DeadFlowAutoWire');
const { build, normTitle } = require('../../tools/flow/build-dead-flow-autowire');

test('P2803 map entries use real driver capabilities and known ops', () => {
  const fs = require('fs');
  for (const kind of ['triggers', 'conditions']) {
    for (const [id, v] of Object.entries(map[kind])) {
      const caps = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', v.driver, 'driver.compose.json'), 'utf8')).capabilities || [];
      assert.ok(caps.includes(v.cap), `${id}: ${v.cap} not on ${v.driver}`);
      if (kind === 'triggers') {assert.ok([true, false, 'change'].includes(v.when), id);} else {assert.ok([true, 'above', 'below'].includes(v.op), id);}
    }
  }
});

test('P2803 committed map is consistent with a fresh build (no stale/mismatched entry)', () => {
  const fresh = build({ strict: false });
  for (const kind of ['triggers', 'conditions']) {
    for (const [id, v] of Object.entries(map[kind])) {
      assert.deepStrictEqual(fresh[kind][id], v, `${kind}:${id}`);
    }
  }
});

test('P2803 title normaliser keeps the positive branch', () => {
  assert.strictEqual(normTitle('Soil moisture !{{is|is not}} below'), 'soil moisture is below');
  assert.strictEqual(normTitle('Is !{{on|off}}'), 'is on');
});

test('P2803 triggers: only matching driver/capability/value', () => {
  const [id, v] = Object.entries(map.triggers).find(([, x]) => x.when === true);
  assert.ok(W.mappedTriggerIds(v.driver, v.cap, true).includes(id));
  assert.ok(!W.mappedTriggerIds(v.driver, v.cap, false).includes(id));
  assert.deepStrictEqual(W.mappedTriggerIds('no_such_driver', v.cap, true), []);
});

test('P2803 conditions never throw and return false without data', () => {
  const dev = (caps, vals) => ({ hasCapability: (c) => caps.includes(c), getCapabilityValue: (c) => vals[c] });
  const above = { cap: 'measure_temperature', op: 'above', arg: 'temp' };
  assert.strictEqual(W.evaluateCondition(above, dev(['measure_temperature'], { measure_temperature: 25 }), { temp: 20 }), true);
  assert.strictEqual(W.evaluateCondition(above, dev(['measure_temperature'], { measure_temperature: 15 }), { temp: 20 }), false);
  assert.strictEqual(W.evaluateCondition(above, dev([], {}), { temp: 20 }), false);
  assert.strictEqual(W.evaluateCondition(above, dev(['measure_temperature'], { measure_temperature: null }), { temp: 20 }), false);
  assert.strictEqual(W.evaluateCondition(above, { getCapabilityValue: () => { throw new Error('x'); } }, { temp: 1 }), false);
  assert.strictEqual(W.evaluateCondition({ cap: 'alarm_motion', op: true }, dev(['alarm_motion'], { alarm_motion: true }), {}), true);
});

test('P2803 registers condition listeners only for declared cards', () => {
  const ids = [];
  const homey = { flow: { getConditionCard: (id) => { if (id.endsWith('_x')) {throw new Error('nope');} return { registerRunListener: () => ids.push(id) }; } } };
  assert.strictEqual(W.registerDeadConditions(homey), Object.keys(map.conditions).length);
});

test('P2803 air_purifier_curtain Open/Close/Stop/Set position drive the cover', async () => {
  const fs = require('fs');
  const src = fs.readFileSync(path.join(ROOT, 'drivers', 'air_purifier_curtain', 'driver.js'), 'utf8');
  for (const id of ['open', 'close', 'stop', 'set_position']) {
    assert.ok(src.includes(`'air_purifier_curtain_motor_tilt_${id}'`), id);
  }
  const { wireCoverActions, runCoverPosition } = require('../../lib/covers/CoverFlowActions');
  const listeners = {};
  const driver = { homey: { flow: { getActionCard: (id) => ({ registerRunListener: (fn) => { listeners[id] = fn; } }) } } };
  wireCoverActions(driver, { open: ['o'], stop: ['s'] });
  const sent = [];
  const device = { hasCapability: () => true, triggerCapabilityListener: async (c, v) => { sent.push([c, v]); } };
  await listeners.o({ device });
  await listeners.s({ device });
  assert.strictEqual(await runCoverPosition(device, 30), true);
  assert.strictEqual(await runCoverPosition(device, 'x'), false);
  assert.deepStrictEqual(sent, [['windowcoverings_state', 'up'], ['windowcoverings_state', 'idle'], ['windowcoverings_set', 0.3]]);
});

test('P2803 fireMappedTriggers fills typed tokens and stays silent on errors', async () => {
  const [id, v] = Object.entries(map.triggers).find(([, x]) => x.when === 'change' || x.when === true);
  const value = v.when === true ? true : 21.5;
  const calls = [];
  const device = {
    driver: { id: v.driver },
    homey: { manifest: { flow: { triggers: [{ id, tokens: [{ name: 't', type: 'number' }, { name: 's', type: 'string' }] }] } } },
    triggerFlowCard: async (cid, tokens) => { calls.push([cid, tokens]); return true; }
  };
  assert.strictEqual(await W.fireMappedTriggers(device, v.cap, value), calls.length);
  assert.ok(calls.some(([cid]) => cid === id));
  assert.strictEqual(await W.fireMappedTriggers({ driver: { id: v.driver }, homey: {}, triggerFlowCard: async () => { throw new Error('x'); } }, v.cap, value), 0);
  assert.strictEqual(await W.fireMappedTriggers({}, v.cap, value), 0);
});
