'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

/**
 * P2322 — PresentSky #2206 + Gabriel #2186/#2188 complementary fixes
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2322 PresentSky dimmer + Gabriel 4gang', () => {
  it('wall_dimmer flow driver TX uses _txCapability not bare setCapabilityValue', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_dimmer_tuya/driver.js'), 'utf8');
    assert.ok(src.includes('_txCapability'));
    assert.ok(src.includes("'dim'"));
    assert.ok(!/setCapabilityValue\('brightness'/.test(src));
  });

  it('wall_dimmer device forces magic + IEEE persist + TX throw', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_dimmer_tuya/device.js'), 'utf8');
    assert.ok(src.includes('_ensureDimmerMagicHandshake'));
    assert.ok(src.includes('_persistIeeeFromNode'));
    assert.ok(src.includes('writeBool soft-fail'));
    assert.ok(src.includes('P2322'));
  });

  it('healZigbeeNodeIdentity reads device.node IEEE', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/io/healZigbeeNodeIdentity.js'), 'utf8');
    assert.ok(src.includes('node.ieeeAddress'));
    assert.ok(src.includes('P2322'));
  });

  it('lwthnp7j registry locks TS0004 wall_switch_4gang_1way', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const c = (reg.cases || []).find((x) => x.id === 'lwthnp7j-zcl-4gang');
    assert.ok(c);
    assert.strictEqual(c.canonicalDriver, 'wall_switch_4gang_1way');
    assert.ok(c.productId.includes('TS0004'));
    assert.ok(c.forbidMode === 'couple');
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/wall_switch_4gang_1way/driver.compose.json'), 'utf8'));
    assert.ok(compose.zigbee.manufacturerName.some((m) => /lwthnp7j/i.test(m)));
    assert.ok(compose.zigbee.productId.includes('TS0004'));
  });

  it('heal accepts colon IEEE from PresentSky interview', () => {
    const { _looksLikeIeee, healZigbeeNodeIdentity } = require('../../lib/io/healZigbeeNodeIdentity');
    assert.ok(_looksLikeIeee('a4:c1:38:d8:d7:89:0d:43'));
    const zclNode = {};
    const device = {
      zclNode,
      node: { ieeeAddress: 'a4:c1:38:d8:d7:89:0d:43' },
      getData: () => ({}),
      getSetting: () => null,
      getStoreValue: () => null,
      setStoreValue: async () => {},
      log: () => {},
    };
    return healZigbeeNodeIdentity(device, { force: true }).then((r) => {
      assert.strictEqual(r.ok, true);
      assert.ok(zclNode.ieeeAddr || zclNode.ieeeAddress);
    });
  });
});
