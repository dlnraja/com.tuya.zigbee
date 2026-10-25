'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
// P3038 (#576 https://github.com/dlnraja/com.tuya.zigbee/issues/576, reported by @migueleap):
// a driver with an EMPTY manufacturerName turns each productId it lists into a wildcard, so a
// TS0601 device whose exact couple lives on another driver (e.g. _TZE200_yenbr4om -> curtain_motor)
// could pair as a generic socket/dimmer/sensor. TS0601 is the generic Tuya DP model id: it never
// identifies a device on its own. Guard: no empty-mfr driver may list TS0601 (frozen exemptions
// below, master), and no empty-mfr driver may gain any other generic Tuya pid (ratchet).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const GENERIC = /^(TS\d{4}[A-Z]?|TY\d{4})$/;
const TS0601_EXEMPT = {
  "air_purifier_curtain": "deprecated driver whose only productId is TS0601; an empty productId list has unknown Homey match semantics, so it is kept until the owner decides"
};
const FROZEN_GENERIC = {"device_plug_smart":["TS0049","TS0101","TS0222","TS1201"],"dimmer_1_gang_2":["TS0001","TS0002","TS0003","TS0012","TS0013","TS0052","TS0215A","TS0505B","TS0726"],"dimmer_dual_channel":["TS1101"],"pirsensor":["TS0202"],"remote_button_wireless_smart":["TS0215A"],"sensor_lcdtemphumidsensor_temphumidsensor":["TS0201","TY0201"],"switch_usb_dongle":["TS0002"]};
function composeDrivers() {
  const out = [];
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee;
    if (z) out.push({ id, mfr: z.manufacturerName || [], pid: z.productId || [] });
  }
  return out;
}
function appDrivers() {
  return (JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).drivers || [])
    .filter((d) => d.zigbee).map((d) => ({ id: d.id, mfr: d.zigbee.manufacturerName || [], pid: d.zigbee.productId || [] }));
}
// Homey-style candidate set: exact byte match on mfr+pid, plus empty-mfr drivers listing the pid.
function candidates(list, mfr, pid) {
  return list.filter((d) => d.pid.includes(pid) && (d.mfr.length === 0 || d.mfr.includes(mfr))).map((d) => d.id).sort();
}
describe('P3038 no generic Tuya pid wildcard on empty-manufacturer drivers', () => {
  for (const [label, list] of [['compose', composeDrivers()], ['app.json', appDrivers()]]) {
    it(label + ': no empty-mfr driver lists TS0601 (except frozen exemptions)', () => {
      const bad = list.filter((d) => d.mfr.length === 0 && d.pid.includes('TS0601') && !TS0601_EXEMPT[d.id]).map((d) => d.id);
      assert.deepStrictEqual(bad, []);
    });
    it(label + ': no new generic Tuya pid on an empty-mfr driver (ratchet)', () => {
      const added = [];
      for (const d of list) {
        if (d.mfr.length) continue;
        for (const p of d.pid) if (GENERIC.test(p) && p !== 'TS0601' && !(FROZEN_GENERIC[d.id] || []).includes(p)) added.push(d.id + ':' + p);
      }
      assert.deepStrictEqual(added, []);
    });
    it(label + ': #576 _TZE200_yenbr4om|TS0601 has curtain_motor as only candidate', () => {
      assert.deepStrictEqual(candidates(list, '_TZE200_yenbr4om', 'TS0601').filter((id) => !TS0601_EXEMPT[id] || id === 'curtain_motor'), ['curtain_motor']);
    });
    it(label + ': _TZ3000_bjawzodf|TY0201 only lands on sensor-class drivers', () => {
      const c = candidates(list, '_TZ3000_bjawzodf', 'TY0201');
      assert.ok(c.length > 0, 'still recognised');
      assert.ok(!c.some((id) => /plug|socket|switch|dimmer|outlet/.test(id)), c.join(','));
    });
  }
  it('#576 pin (P3037) kept: sacred keep couple points at curtain_motor when present', () => {
    const f = path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json');
    if (!fs.existsSync(f)) return;
    const pins = (JSON.parse(fs.readFileSync(f, 'utf8')).couples || []).filter((c) => c.mfr === '_TZE200_yenbr4om' && c.pid === 'TS0601');
    for (const p of pins) assert.strictEqual(p.driverId, 'curtain_motor');
  });
});
