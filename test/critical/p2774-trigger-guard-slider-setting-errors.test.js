'use strict';

/**
 * P2774 — leftovers: baseline guard on direct trigger-card calls, keep_position_slider
 * setting on curtain drivers, localized errors for the set-setting Flow action.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const TG = require('../../lib/flow/TriggerGuards');
const PST = require('../../lib/covers/PositionSupportTracker');
const DSA = require('../../lib/flow/DeviceSettingAction');

describe('P2774 direct trigger-card baseline guard', () => {
  function fakeFlow() {
    const fired = [];
    const cards = {};
    return {
      fired,
      getDeviceTriggerCard(id) {
        if (!cards[id]) {cards[id] = { id, async trigger(device, tokens) { fired.push([id, tokens]); return true; } };}
        return cards[id];
      },
    };
  }

  it('first *_changed after init is dropped, then fires; other cards untouched', async () => {
    const flow = fakeFlow();
    assert.equal(TG.installTriggerCardGuard(flow), true);
    assert.equal(TG.installTriggerCardGuard(flow), true); // idempotent
    const dev = {};
    TG.markInit(dev);
    assert.equal(await flow.getDeviceTriggerCard('x_temperature_changed').trigger(dev, { v: 1 }), false);
    assert.equal(await flow.getDeviceTriggerCard('x_temperature_changed').trigger(dev, { v: 2 }), true);
    assert.equal(await flow.getDeviceTriggerCard('x_physical_on').trigger(dev), true);
    assert.deepEqual(flow.fired.map((f) => f[0]), ['x_temperature_changed', 'x_physical_on']);
  });

  it('devices without markInit (e.g. WiFi) are not affected', async () => {
    const flow = fakeFlow();
    TG.installTriggerCardGuard(flow);
    assert.equal(await flow.getDeviceTriggerCard('y_changed').trigger({}, {}), true);
  });

  it('noop cards are left alone and the guard is installed in app.js', () => {
    const noop = { __flowGuardNoop: true, async trigger() { return false; } };
    assert.equal(TG.wrapTriggerCard(noop, 'a').__p2774Guarded, undefined);
    assert.match(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), /installTriggerCardGuard\(this\.homey\.flow\)/);
  });

  it('dimmer_wall_1gang seeds its on/off baseline after a restart', () => {
    const src = fs.readFileSync(path.join(root, 'drivers/dimmer_wall_1gang/device.js'), 'utf8');
    assert.match(src, /prevCapOnoff/);
    assert.match(src, /isPhysical && !firstReport/);
  });
});

describe('P2774 keep_position_slider', () => {
  const drivers = ['curtain_motor', 'curtain_motor_shutter', 'curtain_motor_wall', 'shutter_roller_controller',
    'curtain_motor_tilt', 'smart_screen_switch', 'air_purifier_curtain'];
  it('curtain drivers declare the setting, default off', () => {
    for (const d of drivers) {
      const j = JSON.parse(fs.readFileSync(path.join(root, 'drivers', d, 'driver.compose.json'), 'utf8'));
      const s = (j.settings || []).find((x) => x.id === 'keep_position_slider');
      assert.ok(s, d);
      assert.equal(s.type, 'checkbox');
      assert.equal(s.value, false);
      assert.ok(s.label.en && s.label.fr && s.label.nl && s.label.de, d);
    }
  });
  it('setting on restores a hidden slider', async () => {
    const st = { cover_position_hidden: true };
    const caps = new Set();
    const d = {
      getStoreValue: (k) => st[k], setStoreValue: async (k, v) => { st[k] = v; },
      getSetting: (k) => k === 'keep_position_slider' ? true : undefined,
      hasCapability: (c) => caps.has(c), addCapability: async (c) => { caps.add(c); },
    };
    assert.equal(PST.noteMovement(d), false);
    await new Promise((r) => setImmediate(r));
    assert.ok(caps.has('windowcoverings_set'));
  });
});

describe('P2774 localized set-setting errors', () => {
  const dev = () => ({
    driver: { manifest: { settings: [{ id: 'delay', type: 'number', min: 0, max: 60 }, { id: 'led', type: 'checkbox' }] } },
    getSettings: () => ({ delay: 5, led: false }),
    setSettings: async () => {},
  });
  it('out of range raises a clear error (no silent clamp)', async () => {
    await assert.rejects(DSA.apply(dev(), 'delay', '99', 'en'), /outside the allowed range 0 to 60/);
    await assert.rejects(DSA.apply(dev(), 'delay', '99', 'fr'), /hors de la plage autorisée 0 à 60/);
    await assert.rejects(DSA.apply(dev(), 'delay', 'abc', 'nl'), /is geen getal/);
    await assert.rejects(DSA.apply(dev(), 'led', 'vielleicht', 'de'), /ist ungültig/);
    await assert.rejects(DSA.apply(dev(), 'nope', '1', 'en'), (e) => e.code === 'not_editable');
  });
  it('every message exists in en, fr, nl, de', () => {
    for (const [k, m] of Object.entries(DSA.MESSAGES)) {
      for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(m[l], `${k}.${l}`);}
    }
  });
  it('the Flow card is registered without the swallowing wrapper', () => {
    const src = fs.readFileSync(path.join(root, 'lib/flow/FeatureFlowCards.js'), 'utf8');
    assert.doesNotMatch(src, /_safeRegister\('action', 'device_set_setting'/);
    assert.match(src, /DSA\.apply\(args\.device, args\.setting, args\.value, lang\)/);
  });
});
