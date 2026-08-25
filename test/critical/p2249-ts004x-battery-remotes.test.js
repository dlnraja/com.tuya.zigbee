'use strict';

/**
 * P2249 — TS0043 / TS0044 multi-button battery remotes (Zemismart / Moes / Peter)
 * Cross-ref: Z2M TS0043/TS0044, INT-015/170, DEVICE_TRUTH zemismart-ts0043,
 * HA first-press-ignored → genBasic 0xFFDE=0x13
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function compose(id) {
  return JSON.parse(read(`drivers/${id}/driver.compose.json`));
}

describe('P2249 TS004x battery multi-button remotes', () => {
  it('TuyaMagicPacket writes 0xFFDE setup (first-press fix)', () => {
    const src = read('lib/zigbee/TuyaMagicPacket.js');
    assert.match(src, /MAGIC_SETUP_ATTR\s*=\s*0xffde/i);
    assert.match(src, /MAGIC_SETUP_VALUE\s*=\s*0x13/);
    assert.match(src, /0xFFDE/);
  });

  it('wake does not force 0x8004 on TS0044 family', () => {
    const DOM = require('../../lib/zigbee/DeviceOperatingMode');
    const fake = {
      getSetting: (k) => (k === 'zb_model_id' ? 'TS0044' : k === 'zb_manufacturer_name' ? '_TZ3000_zgyzgdua' : null),
      getData: () => ({ modelId: 'TS0044', manufacturerName: '_TZ3000_zgyzgdua' }),
      driver: { id: 'scene_switch_4' },
    };
    const f = DOM.classifyOperatingFamily(fake);
    assert.equal(f.writeSceneAttr, false);
    assert.equal(f.family, 'ts0044');
    const mixin = read('lib/mixins/PhysicalButtonMixin.js');
    assert.match(mixin, /skip scene-mode write on wake/);
  });

  it('button_wireless_2 no longer claims TS0043/TS0044', () => {
    const pids = compose('button_wireless_2').zigbee.productId || [];
    assert.ok(!pids.includes('TS0043'));
    assert.ok(!pids.includes('TS0044'));
  });

  it('button_wireless_3 is TS0043 Zemismart home (not TS0044)', () => {
    const c = compose('button_wireless_3');
    const pids = c.zigbee.productId || [];
    assert.ok(pids.includes('TS0043'));
    assert.ok(!pids.includes('TS0044'));
    const mfr = c.zigbee.manufacturerName || [];
    assert.ok(mfr.some((m) => /a7ouggvs/i.test(m)));
    assert.ok(mfr.some((m) => /key8kk7r/i.test(m)));
    assert.ok(c.zigbee.endpoints?.['1'] && c.zigbee.endpoints?.['2'] && c.zigbee.endpoints?.['3']);
  });

  it('Moes/meter91 TS0044 locks to scene_switch_4', () => {
    const mfs = JSON.parse(read('data/mfs_db.json'));
    const sc = mfs.sacredCouples || {};
    assert.equal(sc['_tz3000_zgyzgdua|ts0044']?.driver, 'scene_switch_4');
    assert.equal(sc['_tz3000_wkai4ga5|ts0044']?.driver, 'scene_switch_4');
    assert.equal(sc['_tz3000_a7ouggvs|ts0043']?.driver, 'button_wireless_3');
    assert.equal(sc['_tz3400_key8kk7r|ts0043']?.driver, 'button_wireless_3');
  });

  it('scene_switch_4 compose has multi-EP OnOff for TS0044', () => {
    const c = compose('scene_switch_4');
    assert.ok((c.zigbee.productId || []).includes('TS0044'));
    assert.ok((c.zigbee.manufacturerName || []).some((m) => /zgyzgdua/i.test(m)));
    assert.ok((c.zigbee.manufacturerName || []).some((m) => /wkai4ga5/i.test(m)));
    for (const ep of ['1', '2', '3', '4']) {
      assert.ok(c.zigbee.endpoints?.[ep], `missing endpoint ${ep}`);
      assert.ok((c.zigbee.endpoints[ep].bindings || []).includes(6));
    }
  });
});
