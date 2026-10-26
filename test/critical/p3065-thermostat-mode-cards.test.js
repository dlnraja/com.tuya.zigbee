'use strict';
// P3065 D9: "Mode changed" / "Heating started" / "Heating stopped" driver cards follow thermostat_mode.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const W = require('../../lib/flow/DeadFlowAutoWire');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS = ['device_air_purifier', 'device_air_purifier_thermostat', 'device_radiator_valve_thermostat'];

test('P3065 D9: modeEdge needs a known, different previous value', () => {
  assert.equal(W.modeEdge('enter:heat', 'heat', 'auto'), true);
  assert.equal(W.modeEdge('enter:heat', 'heat', 'heat'), false);
  assert.equal(W.modeEdge('enter:heat', 'heat', null), false);
  assert.equal(W.modeEdge('enter:heat', 'heat', undefined), false);
  assert.equal(W.modeEdge('enter:heat', 'off', 'auto'), false);
  assert.equal(W.modeEdge('leave:heat', 'off', 'heat'), true);
  assert.equal(W.modeEdge('leave:heat', 'auto', 'off'), false);
  assert.equal(W.modeEdge('sideways:heat', 'off', 'heat'), false);
});

test('P3065 D9: thermostat cards fire at runtime on mode transitions, mode token filled', async () => {
  W._resetForTests();
  const map = W.loadMap().triggers;
  for (const driver of DRIVERS) {
    const flow = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driver, 'driver.flow.compose.json'), 'utf8'));
    const byTitle = (t) => flow.triggers.find((c) => c.title.en === t).id;
    const changed = byTitle('Mode changed');
    const started = byTitle('Heating started');
    const stopped = byTitle('Heating stopped');
    for (const id of [changed, started, stopped]) {assert.equal(map[id] && map[id].cap, 'thermostat_mode', id);}
    const fired = [];
    const dev = {
      driver: { id: driver },
      homey: { manifest: { flow: { triggers: flow.triggers } } },
      async triggerFlowCard(id, tokens) { fired.push([id, tokens]); return true; },
    };
    await W.fireMappedTriggers(dev, 'thermostat_mode', 'heat', 'auto');
    assert.deepEqual(fired.map((f) => f[0]).sort(), [changed, started].sort(), driver);
    assert.equal(fired.find((f) => f[0] === changed)[1].mode, 'heat');
    fired.length = 0;
    await W.fireMappedTriggers(dev, 'thermostat_mode', 'off', 'heat');
    assert.deepEqual(fired.map((f) => f[0]).sort(), [changed, stopped].sort(), driver);
    fired.length = 0;
    await W.fireMappedTriggers(dev, 'thermostat_mode', 'auto', 'off');
    assert.deepEqual(fired.map((f) => f[0]), [changed], driver);
  }
});
