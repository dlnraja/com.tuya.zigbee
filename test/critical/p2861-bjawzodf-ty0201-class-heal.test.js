'use strict';
/**
 * Wilhelm Dall suggestion (2026-10-17): `_TZ3000_bjawzodf` / TY0201 temp+humidity sensor ended up on a
 * socket-class driver. Source of truth for the couple: Z2M WSD500A (TS0201 + _TZ3000_bjawzodf) and DB P2266.
 * One couple, one driver (W4): lcdtemphumidsensor owns it; socket drivers carry no such couple.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { isClimateSensorCouple, healClimateSensorClass } = require('../../lib/utils/ClimateSensorClassHeal');

const ROOT = path.join(__dirname, '..', '..');

describe('P2861 bjawzodf/TY0201 owner + class heal', () => {
  it('exactly one driver lists the couple, and it is a sensor driver', () => {
    const owners = [];
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(f)) continue;
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const m = (j.zigbee?.manufacturerName || []).map((x) => x.toLowerCase());
      const p = (j.zigbee?.productId || []).map((x) => x.toLowerCase());
      if (m.includes('_tz3000_bjawzodf') && p.includes('ty0201')) owners.push([d, j.class]);
    }
    assert.deepStrictEqual(owners, [['lcdtemphumidsensor', 'sensor']]);
  });

  it('only the exact source-backed couples are healed', () => {
    assert.ok(isClimateSensorCouple('_TZ3000_BJAWZODF', 'TY0201'));
    assert.ok(isClimateSensorCouple('_tz3000_bjawzodf', 'TS0201'));
    assert.ok(!isClimateSensorCouple('_TZ3000_other', 'TY0201'));
    assert.ok(!isClimateSensorCouple('_TZ3000_bjawzodf', 'TS011F'));
  });

  it('migrates socket -> sensor once, leaves other devices alone', async () => {
    const mk = (mfr, pid, cls) => {
      const store = {};
      const d = {
        _cls: cls,
        getSetting: (k) => ({ zb_manufacturer_name: mfr, zb_model_id: pid })[k],
        getStoreValue: (k) => (k === 'manufacturerName' ? mfr : k === 'modelId' ? pid : store[k]),
        setStoreValue: async (k, v) => { store[k] = v; },
        getClass: () => d._cls,
        setClass: async (c) => { d._cls = c; },
        log: () => {}, error: () => {},
      };
      return d;
    };
    const a = mk('_TZ3000_bjawzodf', 'TY0201', 'socket');
    assert.strictEqual(await healClimateSensorClass(a), true);
    assert.strictEqual(a._cls, 'sensor');
    assert.strictEqual(await healClimateSensorClass(a), false);
    const b = mk('_TZ3000_zzzzzzzz', 'TY0201', 'socket');
    assert.strictEqual(await healClimateSensorClass(b), false);
    assert.strictEqual(b._cls, 'socket');
  });
});
