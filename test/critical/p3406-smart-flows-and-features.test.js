'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const IdleAutoOffSoft = require(path.join(ROOT, 'lib/features/IdleAutoOffSoft'));
const LuxAdaptiveDim = require(path.join(ROOT, 'lib/features/LuxAdaptiveDim'));
const WelcomeHomeSoft = require(path.join(ROOT, 'lib/features/WelcomeHomeSoft'));
const QuietHoursGuard = require(path.join(ROOT, 'lib/features/QuietHoursGuard'));
const SmartFlowManager = require(path.join(ROOT, 'lib/dynamic/SmartFlowManager'));

test('P3406: IdleAutoOffSoft calls triggerCapabilityListener(onoff, false), preserves this, and prunes destroyed lights', async () => {
  const calls = [];
  const fakeHomey = { setInterval: () => 1, clearInterval: () => {} };
  const mgr = new IdleAutoOffSoft({ homey: fakeHomey, log: () => {} });

  const light = {
    getData: () => ({ id: 'l1' }),
    getName: () => 'Hallway',
    hasCapability: (c) => c === 'onoff',
    getCapabilityValue: () => true,
    triggerCapabilityListener: async (cap, val) => { calls.push([cap, val]); },
  };
  const dead = {
    _destroyed: true,
    getData: () => ({ id: 'l2' }),
    hasCapability: () => true,
  };

  mgr.enroll(light, { idleMinutes: 1 });
  mgr.enroll(dead, { idleMinutes: 1 });
  mgr._devices.get('l1').lastChange = Date.now() - 120000;

  await mgr._tick();
  assert.deepEqual(calls, [['onoff', false]]);
  assert.equal(mgr._devices.has('l2'), false, 'Destroyed light should be pruned');
  assert.equal(mgr.unenroll(light), true);
  assert.equal(mgr.snapshot().devices, 0);
  mgr.destroy();
});

test('P3406: LuxAdaptiveDim uses triggerCapabilityListener(dim) and stops interval when empty', async () => {
  const dims = [];
  let cleared = false;
  const fakeHomey = { setInterval: () => 42, clearInterval: () => { cleared = true; } };
  const mgr = new LuxAdaptiveDim({ homey: fakeHomey });

  const light = {
    getData: () => ({ id: 'd1' }),
    hasCapability: (c) => c === 'onoff' || c === 'dim',
    getCapabilityValue: (c) => c === 'onoff' ? true : 0.5,
    getStoreValue: () => 20, // dark room -> brightTarget (0.85)
    triggerCapabilityListener: async (cap, val) => { dims.push([cap, val]); },
  };

  mgr.enroll(light, null, { luxLow: 40, luxHigh: 400, brightTarget: 0.85, dimFloor: 0.15 });
  await mgr._tick();
  assert.deepEqual(dims, [['dim', 0.85]]);

  mgr.unenroll(light);
  assert.equal(cleared, true, 'Interval should stop when no lights remain enrolled');
  mgr.destroy();
});

test('P3406: WelcomeHomeSoft respects quiet hours cap and skips destroyed lights', async () => {
  const mgr = new WelcomeHomeSoft({ homey: null });
  const alive = { _destroyed: false, hasCapability: () => true, getCapabilityValue: () => false };
  const dead = { _destroyed: true };
  mgr.enroll('entry', [alive, dead], { dim: 0.8, quietDim: 0.12, quietStart: '22:00', quietEnd: '07:00' });

  const nightDate = new Date(2026, 10, 28, 23, 30, 0);
  const res = await mgr.onOccupied('entry', { date: nightDate });
  assert.equal(res.fired, true);
  assert.equal(res.lights, 1);
  assert.equal(res.quiet, true);
  mgr.destroy();
});

test('P3406: QuietHoursGuard trims whitespace and handles invalid Date safely', () => {
  const night = new Date(2026, 10, 28, 23, 15, 0);
  assert.equal(QuietHoursGuard.isInQuietHours(' 22:00 ', ' 07:00 ', night), true);
  assert.equal(QuietHoursGuard.parseHm(' 08:30 '), 510);
  assert.equal(typeof QuietHoursGuard.isInQuietHours('22:00', '07:00', new Date('invalid')), 'boolean');
});

test('P3406: SmartFlowManager suppresses first-report baseline and skips destroyed devices', async () => {
  const fired = [];
  const dev = {
    _destroyed: false,
    homey: { setTimeout: () => 1, clearTimeout: () => {} },
    driver: { id: 'test_driver' },
    log: () => {},
    error: () => {},
  };
  const sfm = new SmartFlowManager(dev);
  sfm._triggerWithCooldown = async (id, tokens) => { fired.push([id, tokens]); };

  // First value seeds baseline only (no restart trigger storm)
  await sfm._onValueChange('measure_temperature', 20);
  assert.equal(fired.length, 0);

  // Second value fires normally
  await sfm._onValueChange('measure_temperature', 22);
  assert.ok(fired.some(([id]) => id === 'measure_temperature_changed'));

  // Destroyed device never fires
  const before = fired.length;
  dev._destroyed = true;
  await sfm._onValueChange('measure_temperature', 25);
  assert.equal(fired.length, before);
});
