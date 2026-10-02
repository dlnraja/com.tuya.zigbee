'use strict';

/**
 * P2796 / GH#550 — _TZE204_gkfbdvyx / TS0601 presence radar DP map + quirk pack.
 * Locks Z2M ZY-M100-24GV3 layout so presence works without re-pair; dead onoff/button handled.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const Q = require('../../lib/quirks/FirmwareQuirks');
const quirksData = require('../../lib/data/firmware-quirks.json');
const { SENSOR_CONFIGS } = require('../../drivers/presence_sensor_radar/configs');

function fakeDevice(mfr, pid) {
  const logs = [];
  return {
    logs,
    getSettings: () => ({ zb_manufacturer_name: mfr, zb_model_id: pid }),
    getStoreValue: () => null,
    log: (...a) => logs.push(a.join(' ')),
  };
}

describe('P2796 GH#550 gkfbdvyx presence DPs + firmware quirk pack', () => {
  it('ZY_M100_CEILING_24G lists gkfbdvyx and matches Z2M DP map', () => {
    const cfg = SENSOR_CONFIGS.ZY_M100_CEILING_24G;
    assert.ok(cfg, 'ceiling config exists');
    const sensors = (cfg.sensors || []).map((s) => s.toLowerCase());
    assert.ok(sensors.includes('_tze204_gkfbdvyx'));
    assert.ok(sensors.includes('_tze200_gkfbdvyx'));
    assert.equal(cfg.hasRelay, false);
    assert.equal(cfg.enableFindSwitchOnBoot, true);
    const map = cfg.dpMap;
    // Z2M ZY-M100-24GV3: DP1 state enum, DP9 distance÷10, DP101 find_switch, DP103 lux, DP105 fade
    assert.equal(map[1].cap, 'alarm_motion');
    assert.ok(String(map[1].type || '').startsWith('presence_enum'));
    assert.equal(map[9].cap, 'measure_luminance.distance');
    assert.equal(map[101].autoEnableFindSwitch, true);
    assert.equal(map[103].cap, 'measure_luminance');
    assert.equal(map[103].type, 'lux_direct');
    // DP10 must NOT be lux; DP104 must NOT be presence on V3
    assert.notEqual(map[10]?.cap, 'measure_luminance');
    assert.notEqual(map[104]?.cap, 'alarm_motion');
    assert.equal(map[105].setting || map[105].internal, map[105].setting || 'fading_time');
  });

  it('compose capabilities exclude onoff/button phantoms', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(root, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    const caps = compose.capabilities || [];
    assert.ok(!caps.includes('onoff'));
    assert.ok(!caps.includes('button.1'));
    assert.ok(!caps.includes('button'));
    const opts = compose.capabilitiesOptions || {};
    assert.ok(!opts.onoff, 'capabilitiesOptions.onoff removed');
    assert.ok(!opts['button.1'], 'capabilitiesOptions.button.1 removed');
    assert.ok(caps.includes('alarm_motion'));
    assert.ok(caps.includes('alarm_human'));
    assert.ok(caps.includes('measure_luminance'));
  });

  it('device soft-listeners + phantom strip remain for GH#550 Missing Listener', () => {
    const src = fs.readFileSync(path.join(root, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes("_registerPhantomRelaySoftListeners"));
    assert.ok(src.includes("registerCapabilityListener('onoff'"));
    assert.ok(src.includes("registerCapabilityListener('button.1'"));
    assert.ok(src.includes('FirmwareQuirks.shouldDropDp'));
    assert.ok(/gkfbdvyx/.test(src) && src.includes("phantoms.push('button.1', 'button', 'onoff')"));
  });

  it('drop_zero_dp drops sensitivity 0 only for ceiling V3 pairs', () => {
    const gkf = fakeDevice('_TZE204_gkfbdvyx', 'TS0601');
    assert.equal(Q.shouldDropDp(gkf, 2, 0), true);
    assert.equal(Q.shouldDropDp(gkf, 102, 0), true);
    assert.equal(Q.shouldDropDp(gkf, 2, 7), false);
    assert.equal(Q.shouldDropDp(gkf, 1, 0), false); // presence clear must pass
    assert.equal(Q.shouldDropDp(fakeDevice('_TZE204_qasjif9e', 'TS0601'), 2, 0), false);
  });

  it('ceiling quirk pack has multi-source entries', () => {
    const need = [
      'ceiling_v3_sensitivity_zero',
      'ceiling_v3_sticky_dp1',
      'ceiling_v3_find_switch_dp101',
      'ceiling_v3_dp10_not_illuminance',
      'ceiling_v3_phantom_onoff_button',
    ];
    for (const id of need) {
      const q = quirksData.quirks.find((x) => x.id === id);
      assert.ok(q, id);
      assert.ok(Array.isArray(q.source) && q.source.length >= 2, `${id} needs ≥2 sources`);
      assert.ok(q.mfr.some((m) => /gkfbdvyx/i.test(m)), id);
      assert.ok(q.pid.includes('TS0601'), id);
    }
    const sens = quirksData.quirks.find((x) => x.id === 'ceiling_v3_sensitivity_zero');
    assert.equal(sens.status, 'runtime');
    assert.equal(sens.type, 'drop_zero_dp');
  });
});
