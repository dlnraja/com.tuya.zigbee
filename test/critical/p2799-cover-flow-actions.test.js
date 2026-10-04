'use strict';

/**
 * P2799 — cover flow actions Open / Close / Stop / Go to favorite position must
 * move the cover (they were log-only placeholders on three cover drivers).
 * Contre quoi: flows that report success while the curtain never moves.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const { runCoverAction, wireCoverActions, favoritePercent } = require('../../lib/covers/CoverFlowActions');

function fakeDevice(caps, settings = {}) {
  const calls = [];
  return {
    calls,
    hasCapability: (c) => caps.includes(c),
    getSetting: (k) => settings[k],
    triggerCapabilityListener: async (c, v) => { calls.push([c, v]); },
  };
}

const DRIVERS = {
  curtain_motor: 'drivers/curtain_motor/driver.settings.compose.json',
  curtain_motor_shutter: 'drivers/curtain_motor_shutter/driver.compose.json',
  curtain_motor_wall: 'drivers/curtain_motor_wall/driver.compose.json',
};

describe('P2799 cover flow actions', () => {
  it('open/close/stop use windowcoverings_state when present', async () => {
    const d = fakeDevice(['windowcoverings_state', 'windowcoverings_set']);
    await runCoverAction(d, 'open');
    await runCoverAction(d, 'close');
    await runCoverAction(d, 'stop');
    assert.deepEqual(d.calls, [['windowcoverings_state', 'up'], ['windowcoverings_state', 'down'], ['windowcoverings_state', 'idle']]);
  });

  it('open/close fall back to windowcoverings_set without a state capability', async () => {
    const d = fakeDevice(['windowcoverings_set']);
    await runCoverAction(d, 'open');
    await runCoverAction(d, 'close');
    assert.deepEqual(d.calls, [['windowcoverings_set', 1], ['windowcoverings_set', 0]]);
  });

  it('favorite goes to the setting, default 50, clamped to 0..100', async () => {
    assert.equal(favoritePercent(fakeDevice([], {})), 50);
    assert.equal(favoritePercent(fakeDevice([], { favorite_position: 130 })), 100);
    assert.equal(favoritePercent(fakeDevice([], { favorite_position: 'x' })), 50);
    const d = fakeDevice(['windowcoverings_set'], { favorite_position: 30 });
    await runCoverAction(d, 'favorite');
    assert.deepEqual(d.calls, [['windowcoverings_set', 0.3]]);
  });

  it('wireCoverActions registers listeners only for declared cards', async () => {
    const listeners = {};
    const driver = { homey: { flow: { getActionCard: (id) => id === 'missing' ? null : { registerRunListener: (fn) => { listeners[id] = fn; } } } } };
    const wired = wireCoverActions(driver, { open: ['a'], stop: ['missing'] });
    assert.deepEqual(wired, ['a']);
    const d = fakeDevice(['windowcoverings_state']);
    assert.equal(await listeners.a({ device: d }), true);
    assert.equal(await listeners.a({}), false);
  });

  for (const [drv, settingsFile] of Object.entries(DRIVERS)) {
    it(`${drv}: driver wires the cover actions and declares favorite_position`, () => {
      const src = fs.readFileSync(path.join(root, 'drivers', drv, 'driver.js'), 'utf8');
      assert.match(src, /wireCoverActions\(this,/);
      const json = JSON.parse(fs.readFileSync(path.join(root, settingsFile), 'utf8'));
      const list = Array.isArray(json) ? json : json.settings;
      const fav = list.find((s) => s.id === 'favorite_position');
      assert.ok(fav, 'favorite_position setting');
      assert.equal(fav.min, 0);
      assert.equal(fav.max, 100);
    });
  }
});
