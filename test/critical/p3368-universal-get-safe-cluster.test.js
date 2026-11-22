'use strict';

/**
 * P3368 - UniversalZigbeeDevice.getSafeCluster resolves a cluster without throwing.
 * Contre quoi: it destructured getSafeCluster from lib/Util.js, which never exported it,
 * so universal_zigbee / bulb_rgbw_universal threw a TypeError instead of configuring
 * reporting for mapped capabilities (P3367 named-import scan).
 */

require('../../tools/ci/preload-homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const UniversalZigbeeDevice = require('../../lib/UniversalZigbeeDevice');

const fn = UniversalZigbeeDevice.prototype.getSafeCluster;
const basic = { name: 'basic' };
const onOff = { name: 'onOff' };
const dev = { zclNode: { endpoints: { 1: { clusters: { basic, onOff } } } } };

describe('P3368 getSafeCluster', function() {
  it('resolves by numeric id and by name', function() {
    assert.strictEqual(fn.call(dev, 0x0000, 1), basic);
    assert.strictEqual(fn.call(dev, 6, 1), onOff);
    assert.strictEqual(fn.call(dev, 'onOff'), onOff);
  });
  it('returns null for an absent cluster or endpoint, never throws', function() {
    assert.strictEqual(fn.call(dev, 0x0300, 1), null);
    assert.strictEqual(fn.call(dev, 0x0006, 2), null);
    assert.strictEqual(fn.call({}, 0x0006, 1), null);
  });
});
