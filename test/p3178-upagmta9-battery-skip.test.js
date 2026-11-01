'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
describe('P3178 _TZE204_upagmta9 skipBatteryReporting (ZHA #2694/#4260)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'drivers', 'climate_sensor', 'device.js'), 'utf8');
  it('keys on the exact couple only and stays additive', () => {
    assert.ok(src.includes("=== '_tze204_upagmta9'"));
    assert.ok(src.includes("=== 'TS0601'"));
    assert.ok(/base\.skipBatteryReporting == null/.test(src));
  });
  it('profile logic: exact couple -> skip, other -> untouched', () => {
    const decide = (mfr, pid, base = {}) => (String(mfr).trim().toLowerCase() === '_tze204_upagmta9'
      && String(pid).toUpperCase() === 'TS0601' && base.skipBatteryReporting == null)
      ? Object.assign({}, base, { skipBatteryReporting: true }) : base;
    assert.strictEqual(decide('_TZE204_upagmta9', 'TS0601').skipBatteryReporting, true);
    assert.strictEqual(decide('_TZE200_upagmta9', 'TS0601').skipBatteryReporting, undefined);
    assert.strictEqual(decide('_TZE204_upagmta9', 'TS0601', { skipBatteryReporting: false }).skipBatteryReporting, false);
  });
});
