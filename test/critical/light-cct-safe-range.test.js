'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'TuyaZigBeeLightDevice.js'), 'utf8');

describe('Spec 006: colour temperature safe range', () => {
  it('report paths clamp mireds-derived value to 0..1', () => {
    assert.ok(/clamp01\(1 - \(value \/ MAX_COLORTEMPERATURE\)\)/.test(src));
    assert.ok(/clamp01\(1-\(colorTemperatureMireds \/ MAX_COLORTEMPERATURE\)\)/.test(src));
  });
  it('vendor tuyaRgbMode before CCT is best-effort', () => {
    assert.ok(/tuyaRgbMode\(\{ enable: 0 \}\)\s*\n\s*\.catch\(/.test(src));
  });
  it('clamp semantics', () => {
    const clamp01 = eval(src.match(/const clamp01 = ([^;]+);/)[1]);
    assert.strictEqual(clamp01(1 - 255 / 254), 0);
    assert.strictEqual(clamp01(0.4), 0.4);
    assert.strictEqual(clamp01(1.7), 1);
    assert.strictEqual(clamp01(undefined), undefined);
  });
});
