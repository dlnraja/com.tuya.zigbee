'use strict';
// P3242: parasite productId trim — every removed pid has no sourced couple with any maker of its driver,
// stays out of the compose and app.json, and the driver keeps every sourced couple it had.
const { describe, it } = require('./_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { loadSourcedCouples, keyOf } = require('../scripts/maintenance/publish-sourced-restore.cjs');

describe('P3242 unsourced pid trim (zero sourced couple lost)', function () {
  if (this && this.timeout) this.timeout(120000);
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/p3242-unsourced-pid-trim.json'), 'utf8'));
  const src = loadSourcedCouples(ROOT);
  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
  const sacred = new Set(Object.keys(db.sacredCouples || {}).map((k) => k.toLowerCase()));
  const has = (m, p) => src.has(keyOf(m, p)) || sacred.has(`${String(m).toLowerCase()}|${String(p).toLowerCase()}`);
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const appById = new Map(app.drivers.map((d) => [d.id, d]));

  it('generic fallbacks untouched and plan non-empty', () => {
    assert.ok(plan.entries.length > 0);
    assert.ok(!plan.entries.some((e) => /^(diy_custom_zigbee|universal_zigbee)$/.test(e.id)));
  });
  for (const e of plan.entries) {
    it(`${e.id}: dropped pids absent and unsourced`, () => {
      const z = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', e.id, 'driver.compose.json'), 'utf8')).zigbee;
      const a = appById.get(e.id);
      assert.ok(a, 'driver id kept');
      for (const p of e.dropped) {
        assert.ok(!z.productId.includes(p), `${p} back in compose`);
        assert.ok(!a.zigbee.productId.includes(p), `${p} back in app.json`);
        const hit = z.manufacturerName.find((m) => has(m, p));
        assert.ok(!hit, `${hit}|${p} is now sourced: re-add ${p} to ${e.id}`);
      }
      assert.ok(z.productId.length > 0);
    });
  }
});
