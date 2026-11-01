'use strict';

/**
 * P3141 — forum #5538 HOBEIAN ZG-204ZM "works but no control" + Johan PR #631 bjawzodf.
 *
 * Contre quoi:
 * - DP107 indicator / DP122 motion_detection_mode TX'd as VALUE type (MCU ignores the write)
 * - _TZE200_kb5noeto+TS0601 (ZG-204ZM per Z2M/ZHA/Hubitat) stays on pir_sensor_2: Johan #1481 real device is IAS motion (overrides Z2M radar claim)
 * - _TZ3000_bjawzodf+TY0201 awaiting configureReporting it rejects
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const compose = (d) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8'));
const has = (d, m) => compose(d).zigbee.manufacturerName.some((x) => x.toLowerCase() === m.toLowerCase());

describe('P3141 ZG-204ZM controls + bjawzodf reporting', () => {
  it('ZG-204ZM DP107 bool + DP122 enum, dropdown ids round-trip', () => {
    const { getSensorConfig } = require('../../drivers/presence_sensor_radar/configs');
    for (const [mfr, pid] of [['HOBEIAN', 'ZG-204ZM'], ['_TZE200_2aaelwxk', 'TS0601']]) {
      const cfg = getSensorConfig(mfr, pid);
      assert.ok(cfg && cfg.dpMap, `${mfr}/${pid}`);
      assert.strictEqual(cfg.dpMap[107].type, 'bool');
      assert.strictEqual(cfg.dpMap[122].type, 'enum');
      assert.strictEqual(cfg.dpMap[122].reverseEnumMap['2'], 2);
      assert.strictEqual(cfg.dpMap[122].enumMap[1], '1');
    }
  });

  it('_TZE200_kb5noeto+TS0601 stays on pir_sensor_2 per Johan #1481 (IAS), not radar', () => {
    assert.ok(has('pir_sensor_2', '_TZE200_kb5noeto'));
    assert.ok(!has('presence_sensor_radar', '_TZE200_kb5noeto'));
    assert.ok(compose('presence_sensor_radar').zigbee.productId.includes('TS0601'));
  });

  it('_TZ3000_bjawzodf+TY0201 stays in the LCD climate driver and skips reporting config', () => {
    assert.ok(has('lcdtemphumidsensor', '_TZ3000_bjawzodf'));
    assert.ok(compose('lcdtemphumidsensor').zigbee.productId.includes('TY0201'));
    const src = fs.readFileSync(path.join(ROOT, 'drivers/lcdtemphumidsensor/device.js'), 'utf8');
    const m = src.match(/static skipsReportingConfig\(mfr, pid\) \{([\s\S]*?)\n {2}\}/);
    assert.ok(m, 'skipsReportingConfig present');
    // eslint-disable-next-line no-new-func
    const fn = new Function('mfr', 'pid', m[1]);
    assert.strictEqual(fn('_TZ3000_BJAWZODF', 'TY0201'), true);
    assert.strictEqual(fn('_TZ3000_bjawzodf', 'TS0201'), false);
    assert.strictEqual(fn('_TZ3000_xr3htd96', 'TS0201'), false);
  });
});
