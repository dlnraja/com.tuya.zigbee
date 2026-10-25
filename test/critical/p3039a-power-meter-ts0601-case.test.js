'use strict';
// P3039a: Homey matches productId byte-exact. power_meter carried SPM02V1-GT (_TZE2xx_wjk6rurm, Z2M) only under
// the lower-case pid `ts0601`; the exact `TS0601` form is added next to it (additive, the old form stays).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const compose = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));

describe('P3039a power_meter exact TS0601 productId', () => {
  const z = compose('power_meter').zigbee;

  it('keeps ts0601 and adds the exact TS0601 form', () => {
    assert.ok(z.productId.includes('ts0601'), 'legacy lower-case pid kept');
    assert.ok(z.productId.includes('TS0601'), 'exact TS0601 present');
  });

  it('keeps the SPM02V1-GT manufacturers (exact Z2M forms)', () => {
    for (const m of ['_TZE200_wjk6rurm', '_TZE204_wjk6rurm', '_TZE284_wjk6rurm']) {
      assert.ok(z.manufacturerName.includes(m), m);
    }
  });

  it('app.json mirrors the compose productId list', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = app.drivers.find((x) => x.id === 'power_meter');
    assert.deepStrictEqual([...d.zigbee.productId].sort(), [...z.productId].sort());
  });

  it('every compose that lists a lower-case ts0601 for a real Tuya maker also has TS0601, except reviewed ones', () => {
    // smart_motion_sensor: _TZ1800_fcdjzz3s has no TS0601 source (Z2M: TY0202), so no exact form is invented.
    const REVIEWED = new Set(['smart_motion_sensor']);
    const miss = [];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const p = path.join(ROOT, 'drivers', id, 'driver.compose.json');
      if (!fs.existsSync(p)) { continue; }
      const pids = (JSON.parse(fs.readFileSync(p, 'utf8')).zigbee || {}).productId || [];
      if (pids.includes('ts0601') && !pids.includes('TS0601') && !REVIEWED.has(id)) { miss.push(id); }
    }
    assert.deepStrictEqual(miss, []);
  });
});
