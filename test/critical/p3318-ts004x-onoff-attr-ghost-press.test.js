'use strict';
/**
 * P3318 — Bastien: lights randomly switched back ON from a multi-gang remote Flow.
 * Diag 2026-11-07 (v1.0.229, button_wireless_3 / TS0043): at 16:50:07 and 17:05:07 (15 min apart)
 * the remote re-reported onOff=false on EP1..EP3. PhysicalButtonMixin logged
 * "unchanged - skipping (periodic report)", but the P2926 onoff_attr path fired
 * triggerButtonPress(btn=1/2/3, single) for each report -> every "button N pressed" Flow ran.
 */
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const { attachButtonPaths, isCommandPathRemote, onOffAttrIsPress } = require('../../lib/buttons/attachButtonPaths');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

function cluster() { const h = {}; return { h, on: (e, fn) => { h[e] = fn; } }; }
function remote({ profile = null, driverId = 'button_wireless_3' } = {}) {
  const calls = [];
  const dev = {
    log() {}, getCapabilities: () => ['button.1', 'button.2', 'button.3', 'measure_battery'],
    driver: { id: driverId, manifest: { class: 'button' } }, setStoreValue: async () => {},
    _triggerPhysicalFlow: (g, t, tok) => { calls.push([g, t, tok.path]); return Promise.resolve(true); },
  };
  if (profile) { dev.getDeviceProfile = () => profile; }
  return { dev, calls };
}
function node3() {
  const oo = [cluster(), cluster(), cluster()];
  return { oo, node: { endpoints: { 1: { clusters: { onOff: oo[0] } }, 2: { clusters: { onOff: oo[1] } }, 3: { clusters: { onOff: oo[2] } } }, handleFrame: () => 0 } };
}

describe('P3318 onOff attribute reports are not presses on TS004x scene remotes', () => {
  it('replays the 2026-11-07 TS0043 periodic reports: no Flow fires', () => {
    const { dev, calls } = remote({ profile: { sceneSwitch: true, protocol: 'zcl_0xfd_e000', productId: 'TS0043', buttonCount: 3 } });
    const { oo, node } = node3();
    attachButtonPaths(dev, node);
    for (let round = 0; round < 2; round++) { oo.forEach((c) => { c.h['attr.onOff'](false); c.h['attr.onOff'](false); }); }
    // even a flip in a state report is not a press on a command remote
    oo[0].h['attr.onOff'](true); oo[0].h['attr.onOff'](false);
    assert.deepStrictEqual(calls, [], 'state reports must not trigger button presses');
  });

  it('detects command remotes by profile, model id, or learned command path', () => {
    assert.strictEqual(isCommandPathRemote(remote({ profile: { sceneSwitch: true } }).dev), true);
    const byPid = remote().dev; byPid.getSetting = (k) => (k === 'zb_model_id' ? 'TS0044' : null);
    assert.strictEqual(isCommandPathRemote(byPid), true);
    const learned = remote().dev; learned._buttonEventRouter = { stats: { tuya_fd: { n: 2 } } };
    assert.strictEqual(isCommandPathRemote(learned), true);
    const attrOnly = remote().dev; attrOnly._buttonEventRouter = { stats: { onoff_attr: { n: 5 } } };
    assert.strictEqual(isCommandPathRemote(attrOnly), false);
  });

  it('attribute-only remotes still fire, but only on a real flip after the first report', () => {
    const { dev, calls } = remote({ driverId: 'button_wireless_1' });
    const { oo, node } = node3();
    attachButtonPaths(dev, node);
    oo[1].h['attr.onOff'](false); // seed (boot / wake / rejoin)
    oo[1].h['attr.onOff'](false); // periodic
    assert.strictEqual(calls.length, 0);
    oo[1].h['attr.onOff'](true);
    assert.deepStrictEqual(calls, [[2, 'single', 'onoff_attr']]);
    assert.strictEqual(onOffAttrIsPress(dev, 2, true), false, 'same value again = periodic');
    assert.strictEqual(onOffAttrIsPress(dev, 2, 0), true, 'numeric 0 normalised to false = flip');
  });

  it('PhysicalButtonMixin: a flip in a report on a command remote updates state without a Flow', () => {
    const Mixed = PhysicalButtonMixin(class {});
    const fired = [];
    const ctx = Object.assign(Object.create(Mixed.prototype), {
      log() {}, getCapabilities: () => ['button.1', 'measure_battery'],
      driver: { id: 'button_wireless_3', manifest: { class: 'button' } },
      getDeviceProfile: () => ({ sceneSwitch: true, productId: 'TS0043', buttonCount: 3 }),
      _isDebounced: () => false,
      _triggerPhysicalFlow: (...a) => { fired.push(a); },
      _timingProfile: { doubleClickWindow: 120, longPressThreshold: 550 },
      _physicalButtonState: { 1: { lastState: false, stateHistory: [], clickCount: 0, appCommandPending: false } },
    });
    ctx._handleAttributeReport(1, true, {});
    ctx._handleAttributeReport(1, false, {});
    assert.strictEqual(fired.length, 0);
    assert.strictEqual(ctx._physicalButtonState[1].lastState, false);
  });
});
