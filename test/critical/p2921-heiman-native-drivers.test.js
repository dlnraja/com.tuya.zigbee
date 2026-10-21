'use strict';
// P2921: HEIMAN keyfob (RC-EF-3.0) and siren (WarningDevice*) dedicated native drivers,
// plus the conflict resolver no longer strips whole manufacturer names.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === 'homey-zigbeedriver') {return { ZigBeeDevice: class {}, ZigBeeDriver: class {} };}
  return origLoad.call(this, req, ...rest);
};
test.after(() => { Module._load = origLoad; });

function couples() {
  const out = new Map();
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(p)) {continue;}
    const z = JSON.parse(fs.readFileSync(p, 'utf8')).zigbee || {};
    for (const m of z.manufacturerName || []) {
      for (const pid of z.productId || []) {
        const k = `${m}|${pid}`;
        if (!out.has(k)) {out.set(k, []);}
        out.get(k).push(d);
      }
    }
  }
  return out;
}

test('HEIMAN couples are exact, each on exactly one driver', () => {
  const c = couples();
  assert.deepStrictEqual(c.get('HEIMAN|RC-EF-3.0'), ['heiman_keyfob']);
  for (const m of ['HEIMAN', 'Heiman']) {
    for (const pid of ['WarningDevice', 'WarningDevice-EF-3.0']) {
      assert.deepStrictEqual(c.get(`${m}|${pid}`), ['heiman_siren'], `${m}|${pid}`);
    }
  }
});

test('native clusters only: IAS WD on the siren, IAS ACE binding on the keyfob', () => {
  const s = require(path.join(ROOT, 'drivers/heiman_siren/driver.compose.json'));
  const k = require(path.join(ROOT, 'drivers/heiman_keyfob/driver.compose.json'));
  assert.ok(s.zigbee.endpoints['1'].clusters.includes(1282));
  assert.ok(k.zigbee.endpoints['1'].bindings.includes(1281));
  for (const z of [s.zigbee, k.zigbee]) {
    assert.ok(!z.endpoints['1'].clusters.includes(61184) && !z.endpoints['1'].clusters.includes(57344));
  }
});

test('siren startWarning payload follows ZCL IAS WD layout', () => {
  const { warningPayload } = require(path.join(ROOT, 'drivers/heiman_siren/device.js'));
  const on = warningPayload(30);
  assert.strictEqual(on.length, 5);
  assert.strictEqual(on[0] & 0x0f, 1);
  assert.strictEqual(on.readUInt16LE(1), 30);
  assert.deepStrictEqual([...warningPayload(0)], [0, 0, 0, 0, 0]);
  assert.strictEqual(warningPayload(99999).readUInt16LE(1), 1800);
});

test('keyfob maps every IAS ACE arm mode to a declared trigger', () => {
  const { armModeOf, ARM_TRIGGER } = require(path.join(ROOT, 'drivers/heiman_keyfob/device.js'));
  const flow = require(path.join(ROOT, 'drivers/heiman_keyfob/driver.flow.compose.json'));
  const ids = new Set(flow.triggers.map((t) => t.id));
  for (const id of Object.values(ARM_TRIGGER)) {assert.ok(ids.has(id), id);}
  assert.ok(ids.has('heiman_keyfob_emergency'));
  assert.strictEqual(armModeOf({ armMode: 'armAllZones' }), 3);
  assert.strictEqual(armModeOf({ armMode: 0 }), 0);
  assert.strictEqual(armModeOf({}), null);
});

test('conflict resolver keeps manufacturer names unless explicitly allowed', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/automation/fix-fingerprint-conflicts.js'), 'utf8');
  assert.match(src, /--allow-mfr-removal/);
  assert.match(src, /!DRY_RUN && ALLOW_MFR_REMOVAL/);
  for (const wf of ['auto-publish-on-push.yml', 'auto-fix-and-publish.yml']) {
    const y = fs.readFileSync(path.join(ROOT, '.github/workflows', wf), 'utf8');
    assert.ok(!/fix-fingerprint-conflicts\.js[^\n]*--allow-mfr-removal/.test(y), wf);
  }
  const uz = require(path.join(ROOT, 'drivers/universal_zigbee/driver.compose.json'));
  assert.ok(uz.zigbee.manufacturerName.includes('Heiman') && uz.zigbee.manufacturerName.includes('heiman'));
});
