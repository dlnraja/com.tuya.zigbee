'use strict';
// WHY(P2871, 2026-10-19): _TZ3000_4fjiwweb + TS004F is the Tuya ERS-10TZBVK-AA smart knob — Z2M tuya.ts
// (model ERS-10TZBVK-AA, "Smart knob": command_step/toggle/move_hue/step_color_temperature + multi_action),
// ZHA zhaquirks/tuya/ts004f.py TuyaSmartRemote004FROK MODELS_INFO, deCONZ _TZ3000_TS004F_smart_knob.json.
// Same knob family and protocol as abrsvsou (ZG-101ZD), so it joins smart_knob_zg101zd. One couple, one driver.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const D = 'smart_knob_zg101zd';
const M = '_TZ3000_4fjiwweb';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

describe('P2871 4fjiwweb (ERS-10TZBVK-AA knob) → smart_knob_zg101zd', () => {
  it('exactly one compose driver and one app.json driver claim 4fjiwweb, with pid TS004F only', () => {
    const owners = [];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const p = path.join(ROOT, 'drivers', id, 'driver.compose.json');
      if (!fs.existsSync(p)) { continue; }
      const z = JSON.parse(fs.readFileSync(p, 'utf8')).zigbee || {};
      if ((z.manufacturerName || []).some((m) => String(m).toLowerCase() === M.toLowerCase())) { owners.push(id); }
    }
    assert.deepEqual(owners, [D]);
    const app = readJson('app.json');
    const appOwners = app.drivers.filter((x) => (x.zigbee?.manufacturerName || []).some((m) => m.toLowerCase() === M.toLowerCase()));
    assert.deepEqual(appOwners.map((x) => x.id), [D]);
    assert.deepEqual(appOwners[0].zigbee.productId, ['TS004F']);
    const forms = readJson(`drivers/${D}/driver.compose.json`).zigbee.manufacturerName.filter((m) => m.toLowerCase() === M.toLowerCase());
    assert.equal(forms.length, 4, 'all four case forms');
  });

  it('curated removal from button_wireless_4, pin, fingerprint DB, SSOT and bot lists point at the knob driver', () => {
    const rem = readJson('config/architecture/curated-couple-removals.json').removals;
    assert.ok(rem.some((r) => r.driver === 'button_wireless_4' && r.mfr.includes(M)));
    const pins = readJson('config/architecture/couple-driver-pins.json').pins;
    assert.ok(pins.some((p) => p.driver === D && p.pid === 'TS004F' && p.mfr.includes(M)));
    assert.equal(require('../../lib/DeviceFingerprintDB').lookup(M, 'TS004F').driver, D);
    const ssot = readJson('config/architecture/rotary-knob-ssot.json');
    assert.ok(ssot.dedicatedKnobDrivers.some((c) => c.mfr === M && c.driver === D));
    assert.ok(!ssot.forbiddenOnKnobMfr.mfr.includes(M));
    const reinject = fs.readFileSync(path.join(ROOT, 'tools/ci/re-inject-manual-fixes.js'), 'utf8');
    const start = reinject.indexOf("id: 'p129-button-wireless-4-ts004f-mfrs'");
    assert.ok(start > 0);
    const block = reinject.slice(start, reinject.indexOf("source: 'p129-ts004f-routing'", start));
    assert.ok(!/'_TZ3000_4fjiwweb'/i.test(block), 're-inject must not add 4fjiwweb back to button_wireless_4');
  });

  it('the knob decoder covers what Z2M lists for ERS-10TZBVK-AA (toggle, step, step colour temp, move hue/sat, stop, multi_action)', () => {
    const k = require(`../../drivers/${D}/knob-commands`);
    assert.equal(k.decodeKnobCommand(6, 0x02, Buffer.alloc(0)).action, 'press');
    assert.equal(k.decodeKnobCommand(8, 0x02, Buffer.from([0, 13, 1, 0])).action, 'rotate_right');
    assert.equal(k.decodeKnobCommand(8, 0x02, Buffer.from([1, 13, 1, 0])).action, 'rotate_left');
    assert.ok(k.decodeKnobCommand(768, 0x4C, Buffer.from([1, 13, 0, 1, 0, 0, 0, 0, 0])));
    assert.ok(k.decodeKnobCommand(768, 0x01, Buffer.from([1, 51])));
    assert.ok(k.decodeKnobCommand(768, 0x47, Buffer.alloc(0)) !== undefined);
    assert.equal(k.decodeKnobCommand(6, 0xFD, Buffer.from([1])).action, 'double_press');
    assert.equal(k.decodeKnobCommand(6, 0xFC, Buffer.from([1])).action, 'rotate_left');
  });
});
