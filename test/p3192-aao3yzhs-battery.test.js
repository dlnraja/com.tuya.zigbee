'use strict';
// P3192: _TZE284_aao3yzhs DP15 battery 0 % ignored while DP14 battery_state is not low (exact couple only).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'drivers', 'soil_sensor', 'device.js'), 'utf8');

describe('P3192 aao3yzhs battery', () => {
  it('detects the exact manufacturer only', () => {
    assert.ok(/get isAao3yzhsVariant\(\)/.test(src));
    assert.ok(src.includes("=== '_tze284_aao3yzhs'"));
  });
  it('DP15 zero is skipped only when DP14 state is not low', () => {
    const t = (aao, st, v) => (aao && Number(v) === 0 && st > 0 ? null : v);
    assert.ok(src.includes('this.isAao3yzhsVariant && Number(v) === 0 && this._aaoBattState > 0 ? null : v'));
    assert.strictEqual(t(true, 2, 0), null);
    assert.strictEqual(t(true, 0, 0), 0);
    assert.strictEqual(t(false, 2, 0), 0);
    assert.strictEqual(t(true, 2, 80), 80);
  });
});

describe('P3192 TuyaUnifiedDevice skips null transform result', () => {
  it('returns before writing a null capability value', () => {
    const lib = fs.readFileSync(path.join(__dirname, '..', 'lib', 'devices', 'TuyaUnifiedDevice.js'), 'utf8');
    assert.ok(lib.includes('if (finalValue === null || finalValue === undefined) {'));
  });
});
