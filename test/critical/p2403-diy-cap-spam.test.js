'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const ROOT = path.join(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('P2403 — DIY tuya_dp_* crash/diag spam', () => {
  it('setCapabilityValue refuses DIY caps before P2308 depth', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    const idx = src.indexOf('async setCapabilityValue(capability, value)');
    assert.ok(idx > 0);
    const body = src.slice(idx, idx + 1200);
    assert.ok(body.includes('tuya_dp_(raw|value|string|bitmap)'), 'DIY refuse regex');
    assert.ok(body.includes('__capSetDepth'), 'depth cap still present');
    assert.ok(body.indexOf('tuya_dp_(raw|value|string|bitmap)') < body.indexOf('__capSetDepth'), 'DIY before depth');
    assert.ok(body.includes('P2403') || body.includes('DIY recursion aborted once'), 'soft DIY abort');
  });

  it('UniversalBridge skips DIY writes when _diyCapsEnabled false', () => {
    const src = read('lib/TuyaUniversalBridge.js');
    assert.ok(src.includes('_diyCapsEnabled === false'));
    assert.ok(src.includes('P2403') || src.includes('P2392'));
  });
});
