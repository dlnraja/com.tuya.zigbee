'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
// P3038b (owner yes 25/10): two user-reported couples were dropped from the publish payload by the
// per-driver budget of Zigbee compaction and paired on no driver. Sacred pins keep them:
//  - _TZE200_yenbr4om|TS0601 -> curtain_motor (#576 https://github.com/dlnraja/com.tuya.zigbee/issues/576,
//    reported by @migueleap; master P3037 2dc7ff9ac3, ported to stable-v5 and bastien-home)
//  - _TZ3000_bjawzodf|TY0201 -> lcdtemphumidsensor (Homey interview docs/data/interviews/TY0201__TZ3000_bjawzodf.json)
// Checks the pins exist, are satisfiable in source, and that the rebuilt publish payload resolves each
// couple to that driver and only that one.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { compactZigbeeIdentifiers } = require(path.join(ROOT, 'scripts', 'maintenance', 'compact-zigbee-identifiers.cjs'));
const PINS = [
  { mfr: '_TZE200_yenbr4om', pid: 'TS0601', driverId: 'curtain_motor' },
  { mfr: '_TZ3000_bjawzodf', pid: 'TY0201', driverId: 'lcdtemphumidsensor' },
];
const sacred = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json'), 'utf8')).couples;
const claims = (drivers, p) => drivers.filter((d) => d.zigbee && (d.zigbee.productId || []).includes(p.pid)
  && ((d.zigbee.manufacturerName || []).length === 0 || d.zigbee.manufacturerName.includes(p.mfr))).map((d) => d.id);
let payload;
function getPayload() {
  if (!payload) {
    payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const cwd = process.cwd();
    process.chdir(ROOT);
    try { payload.__r = compactZigbeeIdentifiers(payload, {}); } finally { process.chdir(cwd); }
  }
  return payload;
}
describe('P3038b sacred pins #576 + bjawzodf', function () {
  if (this && this.timeout) this.timeout(120000);
  for (const p of PINS) {
    it(`${p.mfr}|${p.pid} pinned to ${p.driverId}`, () => {
      const hits = sacred.filter((c) => c.mfr === p.mfr && (c.pid || c.productId || c.modelId) === p.pid);
      assert.strictEqual(hits.length, 1);
      assert.strictEqual(hits[0].driverId, p.driverId);
      const z = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', p.driverId, 'driver.compose.json'), 'utf8')).zigbee;
      assert.ok(z.manufacturerName.includes(p.mfr) && z.productId.includes(p.pid), 'pin must be satisfiable from compose');
    });
  }
  it('rebuilt publish payload: each pinned couple pairs on its driver only, ceiling kept', () => {
    const m = getPayload();
    assert.strictEqual(m.__r.overTotalLimit, false);
    assert.deepStrictEqual(m.__r.sacredMissing || [], []);
    for (const p of PINS) assert.deepStrictEqual(claims(m.drivers, p), [p.driverId], `${p.mfr}|${p.pid}`);
  });
});
