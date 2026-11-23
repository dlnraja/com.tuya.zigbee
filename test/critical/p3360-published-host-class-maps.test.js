'use strict';
/**
 * P3360: class fix for the 4 still-held P3085 drivers, on the published hosts
 * that already own their couples. Couples must not move. Held ids stay held.
 */
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MAPS = require('../../lib/drivers/published-host-class-maps.json');
const { mappedDeviceClass, matchOn } = require('../../lib/drivers/PublishedHostClassMap');

const HELD = [
  'co_sensor_dcr_co',
  'fan_light_tuya_5_levels',
  'motion_sensor_excellux_zg104plv',
  'vibration_sensor_excellux_zg103v',
];

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

function fakeDevice(mfr, pid) {
  return {
    getSetting(key) {
      if (key === 'zb_manufacturer_name') return mfr;
      if (key === 'zb_model_id' || key === 'zb_product_id') return pid;
      return null;
    },
  };
}

describe('P3360 published-host class maps for held P3085 drivers', () => {
  it('covers exactly the four still-held P3085 ids and only published hosts', () => {
    const hold = require('../../config/publish-hold-drivers.json');
    const heldIds = new Set((hold.drivers || []).map((d) => d.id));
    assert.deepEqual([...heldIds].sort(), [...HELD].sort());
    const mappedHeld = new Set((MAPS.maps || []).map((m) => m.held));
    assert.deepEqual([...mappedHeld].sort(), [...HELD].sort());
    for (const m of MAPS.maps) {
      assert.ok(heldIds.has(m.held), m.held);
      assert.ok(!heldIds.has(m.into), `host ${m.into} must not be held`);
      assert.ok(fs.existsSync(path.join(ROOT, 'drivers', m.into, 'driver.js')));
    }
  });

  it('lists exact manufacturerName and productId strings and stays in sync with the held compose class/caps', () => {
    for (const m of MAPS.maps) {
      assert.ok(m.manufacturerName.length, m.held);
      assert.ok(m.productId.length, m.held);
      const c = compose(m.held);
      const h = compose(m.into);
      assert.equal(m.class, c.class);
      assert.equal(m.hostClass, h.class);
      assert.deepEqual(m.capabilities, c.capabilities);
    }
  });

  it('does not add or remove couples on the host source compose', () => {
    // Class maps are runtime-only. Source zigbee identifiers of the hosts must not
    // gain the held makers as a result of this work (P3024b pins remain the owner).
    const humidifier = compose('humidifier').zigbee.manufacturerName.map((s) => String(s).toLowerCase());
    assert.ok(!humidifier.some((m) => m.includes('ikul00sx')));
    const box = compose('smart_air_detection_box').zigbee.manufacturerName.map((s) => String(s).toLowerCase());
    assert.ok(!box.some((m) => m.includes('7bztmfm1')));
    const sw = compose('motion_sensor_switch').zigbee.manufacturerName.map((s) => String(s).toLowerCase());
    assert.ok(!sw.some((m) => m === 'piriv01' || m === 'vabrate'));
  });

  it('maps exact couples to the held id and leaves other host couples unmapped', () => {
    assert.equal(matchOn('motion_sensor_switch', 'PIRIV01', 'Excellux').held, 'motion_sensor_excellux_zg104plv');
    assert.equal(matchOn('motion_sensor_switch', 'piriv01', 'Excellux').held, 'motion_sensor_excellux_zg104plv');
    assert.equal(matchOn('motion_sensor_switch', 'VABRATE', 'Excellux').held, 'vibration_sensor_excellux_zg103v');
    assert.equal(matchOn('motion_sensor_switch', '_TZE284_pislt0wa', 'TS0001'), null);
    assert.equal(matchOn('humidifier', '_TZE284_ikul00sx', 'TS0601').held, 'fan_light_tuya_5_levels');
    assert.equal(matchOn('humidifier', '_TZE284_ikul00sx', 'TS0601_humid').held, 'fan_light_tuya_5_levels');
    assert.equal(matchOn('humidifier', '_TZE200_k7qgyrrb', 'TS0601'), null);
    assert.equal(matchOn('smart_air_detection_box', '_tze200_7bztmfm1', 'TS0601').held, 'co_sensor_dcr_co');
    assert.equal(matchOn('device_air_purifier_plug', '_TZE204_7bztmfm1', 'TS0601').held, 'co_sensor_dcr_co');
    // Other productIds on the same host must not steal the map (cartesian safety).
    assert.equal(matchOn('motion_sensor_switch', 'PIRIV01', 'TS0001'), null);
    assert.equal(typeof mappedDeviceClass, 'function');
  });

  it('each host driver.js calls mappedDeviceClass and does not use interactive or couple-moving folds', () => {
    const hosts = [...new Set((MAPS.maps || []).map((m) => m.into))];
    for (const host of hosts) {
      const src = fs.readFileSync(path.join(ROOT, 'drivers', host, 'driver.js'), 'utf8');
      assert.match(src, /onMapDeviceClass\(device\)/);
      assert.match(src, /PublishedHostClassMap/);
      assert.match(src, new RegExp(`mappedDeviceClass\\('${host}'`));
    }
    const folds = require('../../lib/drivers/held-driver-folds.json');
    for (const id of HELD) {
      assert.ok(!folds.folds[id], `${id} must not be a P3330/P3331 fold (would move or remount couples)`);
    }
  });

  it('ships hosted shims and prepare-publish keeps the held JS in the payload', () => {
    for (const id of HELD) {
      const shim = path.join(ROOT, 'lib/hosted', id, 'device.js');
      assert.ok(fs.existsSync(shim), shim);
      assert.match(fs.readFileSync(shim, 'utf8'), new RegExp(`drivers/${id}/device`));
    }
    const prep = fs.readFileSync(path.join(ROOT, 'scripts/prepare-publish.js'), 'utf8');
    assert.match(prep, /published-host-class-maps\.json/);
    assert.match(prep, /p3331KeepDirs\.add\(m\.held\)/);
  });
});
