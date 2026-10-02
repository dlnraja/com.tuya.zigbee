'use strict';

/**
 * P2790 — software workarounds for every recorded firmware quirk (pair-scoped, opt-in).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const Q = require('../../lib/quirks/FirmwareQuirks');
const data = require('../../lib/data/firmware-quirks.json');

function fakeDevice(mfr, pid) {
  const logs = [];
  return {
    logs,
    getSettings: () => ({ zb_manufacturer_name: mfr, zb_model_id: pid }),
    getStoreValue: () => null,
    log: (...a) => logs.push(a.join(' ')),
  };
}

describe('P2790 firmware quirk workarounds', () => {
  it('every runtime quirk has a known type and a source', () => {
    const known = new Set(['invert_bool_dp', 'keepalive_basic_read', 'alarm_pulse_guard', 'button_dedupe',
      'onoff_commands_single', 'gang_echo_restore', 'enum_remap', 'invert_cover_position', 'invert_color_temperature', 'drop_zero_dp']);
    for (const q of data.quirks.filter((x) => x.status === 'runtime')) {
      assert.ok(known.has(q.type), `${q.id}: ${q.type}`);
      assert.ok(Array.isArray(q.source) && q.source.length, q.id);
    }
  });

  it('button_dedupe only for wkai4ga5 TS0044 (TS0042 couple untouched); parked since P2791', () => {
    // P2791: parked — physical Homey testing found one usable frame per action
    assert.equal(data.quirks.find((x) => x.id === 'wkai4ga5_frame_multiplicity').enabled, false);
    assert.equal(Q.buttonDedupeMs(fakeDevice('_TZ3000_wkai4ga5', 'TS0044')), 0);
    const on = fakeDevice('_TZ3000_wkai4ga5', 'TS0044');
    Q.forDevice(on);
    on._fwQuirks = [{ id: 't', type: 'button_dedupe', params: { windowMs: 500 } }];
    assert.equal(Q.buttonDedupeMs(on), 500);
    assert.equal(Q.buttonDedupeMs(fakeDevice('_TZ3000_wkai4ga5', 'TS0042')), 0);
    assert.equal(Q.buttonDedupeMs(fakeDevice('_TZ3000_xabckq1v', 'TS004F')), 0);
  });

  it('onoff_commands_single only for rco1yzb1 TS004F', () => {
    assert.equal(Q.onOffCommandsAreSingle(fakeDevice('_TZ3000_rco1yzb1', 'TS004F')), true);
    assert.equal(Q.onOffCommandsAreSingle(fakeDevice('_TZ3000_xabckq1v', 'TS004F')), false);
  });

  it('gang_echo_restore armed for pzao9ls1 and restores only when ALL other gangs echoed', () => {
    assert.ok(Q.getRuntime(fakeDevice('_TZ3002_pzao9ls1', 'TS0726'), 'gang_echo_restore'));
    assert.equal(Q.getRuntime(fakeDevice('_TZ3002_other000', 'TS0726'), 'gang_echo_restore'), null);
    // all 3 other gangs flipped to the commanded value → restore all
    assert.deepEqual(Q.gangsToRestore({ 2: false, 3: false, 4: false }, { 2: true, 3: true, 4: true }, true), [2, 3, 4]);
    // only one other gang changed (plausible real press) → no restore
    assert.deepEqual(Q.gangsToRestore({ 2: false, 3: false, 4: false }, { 2: true, 3: false, 4: false }, true), []);
    // a gang already at the commanded value → cannot tell an echo → no restore
    assert.deepEqual(Q.gangsToRestore({ 2: true, 3: false }, { 2: true, 3: true }, true), []);
    assert.deepEqual(Q.gangsToRestore({}, {}, true), []);
  });

  it('call sites are wired (ButtonDevice, button_wireless_4, wall_switch_4gang_1way)', () => {
    const btn = fs.readFileSync(path.join(root, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(btn.includes('buttonDedupeMs(this)'));
    const b4 = fs.readFileSync(path.join(root, 'drivers/button_wireless_4/device.js'), 'utf8');
    assert.ok(b4.includes('onOffCommandsAreSingle(this)'));
    const w4 = fs.readFileSync(path.join(root, 'drivers/wall_switch_4gang_1way/device.js'), 'utf8');
    assert.ok(w4.includes('gangsToRestore(before, after, commanded)'));
  });

  it('parked quirk (enabled=false) is not applied: bquwrqh1 DP1 stays as reported', () => {
    const q = data.quirks.find((x) => x.id === 'bquwrqh1_presence_polarity_provisional');
    assert.equal(q.enabled, false);
    assert.equal(q.type, 'invert_bool_dp');
    assert.equal(Q.transformDp(fakeDevice('_TZE284_bquwrqh1', 'TS0601'), 1, 1), 1);
    // the active sibling mechanism still works
    assert.equal(Q.transformDp(fakeDevice('_TZE284_iadro9bf', 'TS0601'), 1, 1), 0);
  });

  it('enum_remap maps listed values only', () => {
    const list = [{ id: 't', mfr: ['_TZE204_aaaaaaaa'], pid: ['TS0601'], status: 'runtime', type: 'enum_remap', params: { dp: 2, map: { 0: 1, 1: 0 } } }];
    const dev = fakeDevice('_TZE204_aaaaaaaa', 'TS0601');
    dev._fwQuirksKey = '_tze204_aaaaaaaa|ts0601';
    dev._fwQuirks = Q.getQuirks('_TZE204_aaaaaaaa', 'TS0601', list);
    assert.equal(Q.transformDp(dev, 2, 0), 1);
    assert.equal(Q.transformDp(dev, 2, 5), 5);
    assert.equal(Q.transformDp(dev, 3, 0), 0);
  });

  it('existing knob-dimmer guard: no periodic onOff/level reporting configured', () => {
    for (const d of ['wall_dimmer_tuya', 'dimmer_1_gang_tuya', 'dimmer_wall_1gang']) {
      const src = fs.readFileSync(path.join(root, 'drivers', d, 'device.js'), 'utf8');
      assert.ok(!/attributeName:\s*['"](onOff|currentLevel)['"]/.test(src), d);
    }
  });

  it('existing epoch guard: grxx6qek answers time sync with the 1970 epoch', () => {
    const T = require('../../lib/tuya/TuyaSpecificCluster');
    assert.equal(T.needsEpoch2000('_TZE284_grxx6qek'), false);
  });
  it('parked cover/colour-temperature quirks are not applied by default', () => {
    for (const id of ['zah67ekd_position_inverted_provisional', 'riwp3k79_color_temperature_reversed_provisional']) {
      const q = data.quirks.find((x) => x.id === id);
      assert.ok(q, id);
      assert.equal(q.enabled, false, id);
      assert.ok(q.enableWhen && q.source.length, id);
    }
    assert.equal(Q.coverPositionInverted(fakeDevice('_TZE200_zah67ekd', 'TS0601')), false);
    assert.equal(Q.mapColorTemperature(fakeDevice('_TZ3000_riwp3k79', 'TS0505A'), 0.2), 0.2);
  });

  it('cover/colour-temperature helpers work once a quirk is enabled', () => {
    const withQuirk = (mfr, pid, type) => {
      const d = fakeDevice(mfr, pid);
      Q.forDevice(d); // primes the per-device cache key
      d._fwQuirks = [{ id: 't', type, params: {} }];
      return d;
    };
    assert.equal(Q.coverPositionInverted(withQuirk('_TZE200_zah67ekd', 'TS0601', 'invert_cover_position')), true);
    const d = withQuirk('_TZ3000_riwp3k79', 'TS0505A', 'invert_color_temperature');
    assert.ok(Math.abs(Q.mapColorTemperature(d, 0.2) - 0.8) < 1e-9);
    assert.equal(Q.mapColorTemperature(d, 0), 1);
    assert.equal(Q.mapColorTemperature(d, 'x'), 'x');
  });

  it('cover and light call sites are wired', () => {
    const cover = fs.readFileSync(path.join(root, 'lib/devices/UnifiedCoverBase.js'), 'utf8');
    assert.match(cover, /coverPositionInverted\(this\)\) \{this\._invertedPosition = true;\}/);
    const light = fs.readFileSync(path.join(root, 'lib/TuyaZigBeeLightDevice.js'), 'utf8');
    assert.ok((light.match(/mapColorTemperature\(this/g) || []).length >= 5);
  });
});
