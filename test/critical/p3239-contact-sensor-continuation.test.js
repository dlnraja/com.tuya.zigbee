'use strict';
// P3239: contact_sensor_2 continuation (zero-parasite packing) — 2 makers whose only sourced couple among
// contact_sensor pids is TS0203 moved with a short pid list; zero sourced couple lost across the chain.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const DC = require('../../lib/drivers/DriverContinuations');
const { loadSourcedCouples } = require('../../scripts/maintenance/publish-sourced-restore.cjs');
const j = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const lc = (s) => String(s).toLowerCase();
const MOVED = ['lumi.sensor_magnet', 'lumi.sensor_magnet.aq2'];

describe('P3239 contact_sensor_2 continuation', () => {
  const root = j('drivers/contact_sensor/driver.compose.json');
  const cont = j('drivers/contact_sensor_2/driver.compose.json');

  it('registry links contact_sensor -> contact_sensor_2 and it is held', () => {
    DC.clearCache(); const reg = DC.load(ROOT);
    assert.strictEqual(reg.rootOf('contact_sensor_2'), 'contact_sensor');
    assert.ok(reg.entry('contact_sensor').full);
    assert.ok(j('config/publish-hold-drivers.json').drivers.some((d) => d.id === 'contact_sensor_2'));
  });

  it('carries exactly the moved makers, short TS0203/TY0203/DS01 pids, none left on the root (one couple one driver)', () => {
    assert.deepStrictEqual([...new Set(cont.zigbee.manufacturerName.map(lc))].sort(), MOVED);
    assert.deepStrictEqual([...new Set(cont.zigbee.productId.map(lc))].sort(), ['ds01', 'ts0203', 'ty0203']);
    const rp = new Set(root.zigbee.productId);
    assert.ok(cont.zigbee.productId.every((p) => rp.has(p)), 'no invented pid');
    const rm = new Set(root.zigbee.manufacturerName.map(lc));
    assert.ok(MOVED.every((m) => !rm.has(m)));
  });

  it('zero sourced couple lost: every sourced couple of a moved maker among root pids is on the continuation', () => {
    const s = loadSourcedCouples(ROOT);
    const rootPids = new Set([...root.zigbee.productId, ...cont.zigbee.productId].map(lc));
    const contKeys = new Set();
    for (const m of cont.zigbee.manufacturerName) {for (const p of cont.zigbee.productId) {contKeys.add(`${lc(m)}|${lc(p)}`);}}
    let n = 0;
    for (const k of s.keys()) {
      const i = k.lastIndexOf('|'); const m = lc(k.slice(0, i)); const p = lc(k.slice(i + 1));
      if (!MOVED.includes(m) || !rootPids.has(p)) {continue;}
      n++;
      assert.ok(contKeys.has(`${m}|${p}`), `lost ${m}|${p}`);
    }
    assert.ok(n >= MOVED.length);
  });

  it('same class/capabilities as root, own images, own flow ids, code subclasses the root', () => {
    assert.deepStrictEqual(cont.capabilities, root.capabilities);
    assert.strictEqual(cont.class, root.class);
    assert.ok(cont.images.small.includes('/contact_sensor_2/'));
    const ids = (f) => JSON.stringify(j(f)).match(/"id":"contact_sensor[^"]*"/g) || [];
    const ri = ids('drivers/contact_sensor/driver.flow.compose.json');
    const ci = ids('drivers/contact_sensor_2/driver.flow.compose.json');
    assert.strictEqual(ci.length, ri.length);
    assert.ok(ci.every((x) => x.startsWith('"id":"contact_sensor_2_')));
    for (const f of ['device.js', 'driver.js']) {
      assert.ok(fs.readFileSync(path.join(ROOT, 'drivers/contact_sensor_2', f), 'utf8').includes(`require('../contact_sensor/${f.replace('.js', '')}')`));
    }
    const a = j('app.json').drivers.find((d) => d.id === 'contact_sensor_2');
    assert.ok(a && a.class === root.class);
  });
});
