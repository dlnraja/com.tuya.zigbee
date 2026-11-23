'use strict';

/**
 * P3362 / t1007u-t1008u: read-only lessons from Johan topic 26439
 * posts 5537-5543 (never post there). Exact couples only.
 */

const { describe, it } = require('./_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}
function hasCouple(driverId, mfr, pid) {
  const z = compose(driverId).zigbee || {};
  const mfrs = (z.manufacturerName || []).map((m) => String(m).toLowerCase());
  const pids = (z.productId || []).map(String);
  return mfrs.includes(String(mfr).toLowerCase()) && pids.includes(pid);
}
function owners(mfr, pid) {
  const out = [];
  for (const dir of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join(ROOT, 'drivers', dir, 'driver.compose.json');
    if (!fs.existsSync(p)) {continue;}
    try {
      const z = JSON.parse(fs.readFileSync(p, 'utf8')).zigbee || {};
      const mfrs = (z.manufacturerName || []).map((m) => String(m).toLowerCase());
      const pids = (z.productId || []).map(String);
      if (mfrs.includes(String(mfr).toLowerCase()) && pids.includes(pid)) {out.push(dir);}
    } catch (_e) { /* skip */ }
  }
  return out;
}

const {
  classifyOperatingFamily,
  applyDesiredMode,
  TS004F_ONE_BUTTON_SCENE_MFR,
} = require('../lib/zigbee/DeviceOperatingMode');
const { scaleHumidity } = require('../lib/utils/scaleHumidity');
const { shouldDrop, installOnce, normalizeAction } = require('../lib/utils/PressActionDedup');

function mockDevice({ mfr, pid, driver, buttonMode, store = {} }) {
  const settings = {
    zb_manufacturer_name: mfr || '',
    zb_model_id: pid || '',
    button_mode: buttonMode,
  };
  return {
    driver: { id: driver },
    logs: [],
    log(...args) { this.logs.push(args.join(' ')); },
    getSetting(k) { return settings[k] ?? null; },
    getStoreValue(k) { return store[k] ?? null; },
    async setStoreValue(k, v) { store[k] = v; },
    async setSettings(u) { Object.assign(settings, u); },
    getData() { return { manufacturerName: mfr, productId: pid }; },
  };
}

describe('P3362 forum 26439 lessons (read-only)', () => {
  it('5537: _TZ3000_qja6nq5z / TS004F is only on smart_knob_rotary in dimmer mode', () => {
    assert.deepStrictEqual(owners('_TZ3000_qja6nq5z', 'TS004F'), ['smart_knob_rotary']);
    const fam = classifyOperatingFamily(mockDevice({
      mfr: '_TZ3000_qja6nq5z', pid: 'TS004F', driver: 'smart_knob_rotary', buttonMode: 'auto',
    }));
    assert.strictEqual(fam.defaultMode, 'dimmer');
    const src = fs.readFileSync(path.join(ROOT, 'drivers/smart_knob_rotary/device.js'), 'utf8');
    assert.match(src, /PressActionDedup|shouldDrop/);
    assert.match(src, /installOnce/);
    assert.match(src, /configureReporting/);
    assert.match(src, /DO NOT configureReporting on sleepy TS004x/);
    // on/off/toggle of one press collapse as a single class (not on=single/off=double)
    assert.match(src, /on' \|\| action === 'off' \|\| action === 'toggle'/);
  });

  it('5537: knob on/off/toggle collapse together; rotation is a different action', () => {
    const store = {};
    assert.strictEqual(normalizeAction('rotate_left'), 'rotate_left');
    assert.strictEqual(shouldDrop(store, 1, 'single', 1000, 400).drop, false);
    assert.strictEqual(shouldDrop(store, 1, 'single', 1100, 400).drop, true);
    // rotation must not be eaten by a recent press
    assert.strictEqual(shouldDrop(store, 1, 'rotate_left', 1100, 400).drop, false);
  });

  it('5537: installOnce prevents a second listener bind on the same node', () => {
    const node = {};
    assert.strictEqual(installOnce(node, '_smartKnobRotaryStacksBound'), true);
    assert.strictEqual(installOnce(node, '_smartKnobRotaryStacksBound'), false);
  });

  it('5541: _TZ3000_ja5osu5g / TS004F stays on smart_knob in scene mode, not rotary or 4-btn', () => {
    assert.deepStrictEqual(owners('_TZ3000_ja5osu5g', 'TS004F'), ['smart_knob']);
    assert.ok(TS004F_ONE_BUTTON_SCENE_MFR.test('_TZ3000_ja5osu5g'));
    const fam = classifyOperatingFamily(mockDevice({
      mfr: '_TZ3000_ja5osu5g', pid: 'TS004F', driver: 'smart_knob', buttonMode: 'dimmer',
    }));
    assert.strictEqual(fam.defaultMode, 'scene');
    assert.ok(!hasCouple('smart_knob_rotary', '_TZ3000_ja5osu5g', 'TS004F'));
    assert.ok(!hasCouple('button_wireless_4', '_TZ3000_ja5osu5g', 'TS004F'));
  });

  it('5541: applyDesiredMode resets a stuck dimmer setting back to scene for ja5osu5g', async () => {
    const device = mockDevice({
      mfr: '_TZ3000_ja5osu5g',
      pid: 'TS004F',
      driver: 'smart_knob',
      buttonMode: 'dimmer',
    });
    const r = await applyDesiredMode(device, null);
    assert.strictEqual(r.desired, 'scene');
    assert.strictEqual(device.getSetting('button_mode'), 'auto');
  });

  it('5540: scaleHumidity is adaptive (values >100 /10, 80 stays 80)', () => {
    assert.strictEqual(scaleHumidity(450), 45);
    assert.strictEqual(scaleHumidity(80), 80);
    assert.strictEqual(scaleHumidity(100), 100);
    assert.strictEqual(scaleHumidity(4500), 45);
    assert.strictEqual(scaleHumidity(-1), null);
    const src = fs.readFileSync(path.join(ROOT, 'drivers/climate_sensor/device.js'), 'utf8');
    assert.match(src, /scaleHumidity/);
    assert.match(src, /bjawzodf/);
  });

  it('5540: exact couples stay on the sensor drivers, not a switch', () => {
    assert.deepStrictEqual(owners('_TZE200_bjawzodf', 'TS0601'), ['climate_sensor']);
    assert.deepStrictEqual(owners('_TZ3000_bjawzodf', 'TY0201'), ['lcdtemphumidsensor']);
    assert.deepStrictEqual(owners('_TZ3000_bjawzodf', 'TS0201'), ['lcdtemphumidsensor']);
    for (const id of owners('_TZ3000_bjawzodf', 'TY0201').concat(owners('_TZE200_bjawzodf', 'TS0601'))) {
      const cls = compose(id).class;
      assert.strictEqual(cls, 'sensor', `${id} class ${cls}`);
    }
  });

  it('5538: HOBEIAN ZG-204ZM / _TZE200_2aaelwxk map matches Z2M and is not on pir_sensor_2', () => {
    const { getSensorConfig } = require('../drivers/presence_sensor_radar/configs');
    const cfg = getSensorConfig('HOBEIAN', 'ZG-204ZM');
    assert.ok(cfg && cfg.dpMap);
    assert.strictEqual(cfg.dpMap[1].cap, 'alarm_motion');
    assert.strictEqual(cfg.dpMap[2].setting, 'static_detection_sensitivity');
    assert.strictEqual(cfg.dpMap[4].divisor, 100);
    assert.strictEqual(cfg.dpMap[107].type, 'bool');
    assert.strictEqual(cfg.dpMap[122].type, 'enum');
    assert.ok(hasCouple('presence_sensor_radar', 'HOBEIAN', 'ZG-204ZM'));
    assert.ok(hasCouple('presence_sensor_radar', '_TZE200_2aaelwxk', 'TS0601'));
    assert.ok(hasCouple('pir_sensor_2', '_TZE200_kb5noeto', 'TS0601'));
    assert.ok(!hasCouple('presence_sensor_radar', '_TZE200_kb5noeto', 'TS0601'));
    const cfgSrc = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
    const block = cfgSrc.split("HOBEIAN_ZG204ZM")[1].split("HOBEIAN_ZG204ZH")[0];
    assert.doesNotMatch(block, /kb5noeto/);
  });
});
