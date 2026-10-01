'use strict';

/**
 * P2764 — pair-scoped firmware quirks (lib/data/firmware-quirks.json).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const Q = require('../../lib/quirks/FirmwareQuirks');
const data = require('../../lib/data/firmware-quirks.json');

function fakeDevice(mfr, pid) {
  const logs = [];
  return {
    logs,
    getSettings: () => ({ zb_manufacturer_name: mfr, zb_model_id: pid }),
    getStoreValue: () => null,
    log: (...a) => logs.push(a.join(' ')),
  };
}

describe('P2764 firmware quirks', () => {
  it('every quirk has pair, bug, workaround, source', () => {
    for (const q of data.quirks) {
      assert.ok(q.id && Array.isArray(q.mfr) && q.mfr.length, q.id);
      assert.ok(Array.isArray(q.pid) && q.pid.length, q.id);
      assert.ok(q.bug && q.workaround && Array.isArray(q.source) && q.source.length, q.id);
      assert.ok(['runtime', 'existing', 'documented'].includes(q.status), q.id);
    }
  });

  it('every quirk mfr exists in a driver compose (never invented)', () => {
    const drivers = fs.readdirSync(path.join(root, 'drivers'));
    const all = new Set();
    for (const d of drivers) {
      const f = path.join(root, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(f)) {continue;}
      for (const m of (JSON.parse(fs.readFileSync(f, 'utf8')).zigbee?.manufacturerName || [])) {all.add(String(m).toLowerCase());}
    }
    for (const q of data.quirks) {
      for (const m of q.mfr) {assert.ok(all.has(m.toLowerCase()), `${q.id}: ${m}`);}
    }
  });

  it('iadro9bf DP1 inverted only for the exact pair', () => {
    const dev = fakeDevice('_TZE284_iadro9bf', 'TS0601');
    assert.equal(Q.transformDp(dev, 1, 0), 1);
    assert.equal(Q.transformDp(dev, 1, true), false);
    assert.equal(Q.transformDp(dev, 9, 0), 0);
    assert.ok(dev.logs.some((l) => l.includes('[FW-QUIRK]')));
    assert.equal(Q.transformDp(fakeDevice('_TZE204_qasjif9e', 'TS0601'), 1, 0), 0);
    assert.equal(Q.transformDp(fakeDevice('_TZE284_iadro9bf', 'TS0225'), 1, 0), 0);
  });

  it('keep-alive armed only for cnicaghm and stoppable', () => {
    const timers = [];
    const mk = (mfr, pid) => Object.assign(fakeDevice(mfr, pid), {
      homey: { setInterval: (fn, ms) => { timers.push(ms); return { fn }; }, clearInterval: () => timers.pop() },
    });
    const bulb = mk('_TZ3210_cnicaghm', 'TS0505B');
    assert.equal(Q.startKeepAlive(bulb, {}), true);
    assert.equal(Q.startKeepAlive(bulb, {}), false);
    assert.deepEqual(timers, [120000]);
    Q.stop(bulb);
    assert.equal(timers.length, 0);
    assert.equal(Q.startKeepAlive(mk('_TZ3000_hodifxa9', 'TS0505B'), {}), false);
  });

  it('drivers wire the quirks softly', () => {
    const radar = fs.readFileSync(path.join(root, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.match(radar, /FirmwareQuirks\.transformDp\(this, dpId, value\)/);
    const bulb = fs.readFileSync(path.join(root, 'drivers/bulb_dimmable/device.js'), 'utf8');
    assert.match(bulb, /FirmwareQuirks\.startKeepAlive\(this, zclNode\)/);
    assert.match(bulb, /FirmwareQuirks\.stop\(this\)/);
  });

  it('npm check:p2764 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2764']);
  });
});
