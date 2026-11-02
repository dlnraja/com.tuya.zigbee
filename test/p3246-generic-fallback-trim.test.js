'use strict';
// P3246: generic fallbacks shrink only coordinator/gateway model ids; their catch-all reach stays.
const { describe, it } = require('./_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { loadSourcedCouples, keyOf } = require('../scripts/maintenance/publish-sourced-restore.cjs');
const rd = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));

describe('P3246 generic fallback trim keeps the catch-all', function () {
  if (this && this.timeout) this.timeout(120000);
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/p3246-generic-fallback-trim.json'), 'utf8'));
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const byId = new Map(app.drivers.map((d) => [d.id, d]));
  const src = loadSourcedCouples(ROOT);
  it('dropped coordinator ids are absent and unsourced', () => {
    for (const e of plan.entries) {
      const z = rd(e.id).zigbee;
      for (const p of e.dropped) {
        assert.ok(!z.productId.includes(p) && !byId.get(e.id).zigbee.productId.includes(p), p);
        assert.ok(!z.manufacturerName.some((m) => src.has(keyOf(m, p))), `${p} became sourced`);
      }
    }
  });
  it('diy_custom_zigbee still catches generic DIY ids, universal_zigbee keeps TS generics', () => {
    const d = rd('diy_custom_zigbee');
    for (const p of ['ROUTER', 'SENSOR', 'SWITCH', 'LIGHT', 'PTVO.SWITCH', 'DIYRUZ_CONTACT', 'ESP32-H2', 'CUSTOM']) assert.ok(d.zigbee.productId.includes(p), p);
    assert.ok(d.zigbee.manufacturerName.length >= 300 && !d.deprecated);
    const u = rd('universal_zigbee');
    for (const p of ['TS0601', 'TS0001', 'TS0002', 'TS011F', 'TS0203', 'TS0505B']) assert.ok(u.zigbee.productId.includes(p), p);
    assert.ok(!u.deprecated);
  });
});
