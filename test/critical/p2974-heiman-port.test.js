'use strict';
// P2974: HEIMAN keyfob / siren / smoke couples on their dedicated drivers (port of master
// P2919/P2921/P2923/P2925 to stable-v5 and bastien-home; guard on master too).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const rj = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

// WHY: other suites install their own homey-zigbeedriver mock; install ours only around our require.
function loadDevice(rel) {
  const prev = Module._load;
  Module._load = function (req, ...rest) {
    if (req === 'homey-zigbeedriver') {return { ZigBeeDevice: class {}, ZigBeeDriver: class {} };}
    return prev.call(this, req, ...rest);
  };
  try {
    const f = require.resolve(path.join(ROOT, rel));
    delete require.cache[f];
    return require(f);
  } finally { Module._load = prev; }
}

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

test('P2974 exact HEIMAN couples sit on one dedicated driver each', () => {
  const c = couples();
  assert.deepStrictEqual(c.get('HEIMAN|RC-EF-3.0'), ['heiman_keyfob']);
  for (const m of ['HEIMAN', 'Heiman']) {
    for (const pid of ['WarningDevice', 'WarningDevice-EF-3.0']) {
      assert.deepStrictEqual(c.get(`${m}|${pid}`), ['heiman_siren'], `${m}|${pid}`);
    }
  }
  assert.deepStrictEqual(c.get('HEIMAN|SmokeSensor-EF-3.0'), ['smoke_detector_advanced']);
});

test('P2974 SOS driver no longer owns HEIMAN; universal_zigbee keeps the catch-all', () => {
  const sos = rj('drivers/button_emergency_sos/driver.compose.json').zigbee;
  assert.ok(!sos.manufacturerName.some((m) => m.toLowerCase() === 'heiman'));
  assert.ok(!sos.productId.includes('RC-EF-3.0'));
  const uz = rj('drivers/universal_zigbee/driver.compose.json').zigbee;
  assert.ok(uz.manufacturerName.includes('HEIMAN'));
});

test('P2974 app.json carries both drivers and mirrors the compose edits', () => {
  const app = rj('app.json');
  const by = Object.fromEntries(app.drivers.map((d) => [d.id, d]));
  for (const id of ['heiman_keyfob', 'heiman_siren']) {
    assert.ok(by[id], id);
    for (const img of Object.values(by[id].images || {})) {
      assert.ok(fs.existsSync(path.join(ROOT, img)), img);
    }
  }
  assert.ok(by.heiman_keyfob.zigbee.productId.includes('RC-EF-3.0'));
  assert.ok(!by.button_emergency_sos.zigbee.productId.includes('RC-EF-3.0'));
  assert.ok(by.smoke_detector_advanced.zigbee.productId.includes('SmokeSensor-EF-3.0'));
});

test('P2974 pins, sacred-keep and curated removals agree (bots cannot move it back)', () => {
  const pins = rj('config/architecture/couple-driver-pins.json').pins;
  const pin = (pid) => pins.filter((p) => p.pid === pid && [].concat(p.mfr).includes('HEIMAN')).map((p) => p.driver);
  assert.deepStrictEqual([...new Set(pin('RC-EF-3.0'))], ['heiman_keyfob']);
  assert.deepStrictEqual([...new Set(pin('WarningDevice'))], ['heiman_siren']);
  const keep = rj('config/architecture/publish-sacred-keep-couples.json').couples;
  const k = keep.filter((r) => r.mfr === 'HEIMAN' && r.pid === 'RC-EF-3.0');
  assert.ok(k.length >= 1 && k.every((r) => r.driverId === 'heiman_keyfob'));
  const rm = rj('config/architecture/curated-couple-removals.json').removals;
  assert.ok(rm.some((r) => r.driver === 'button_emergency_sos' && (r.mfr || []).includes('HEIMAN')));
});

test('P2974 keyfob arm modes map to declared flow triggers', () => {
  const { armModeOf, ARM_TRIGGER } = loadDevice('drivers/heiman_keyfob/device.js');
  const flow = rj('drivers/heiman_keyfob/driver.flow.compose.json');
  const ids = new Set(flow.triggers.map((t) => t.id));
  for (const id of Object.values(ARM_TRIGGER)) {assert.ok(ids.has(id), id);}
  assert.ok(ids.has('heiman_keyfob_emergency'));
  assert.strictEqual(armModeOf({ armMode: 'armAllZones' }), 3);
  assert.strictEqual(armModeOf({ armMode: 0 }), 0);
  assert.strictEqual(armModeOf({}), null);
});

test('P2974 IAS ACE bound cluster dispatches arm/emergency (no early return for cmd 0-9)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/clusters/IasAceCluster.js'), 'utf8');
  assert.ok(/super\.handleFrame\(/.test(src), 'handleFrame must call super.handleFrame');
  assert.ok(!/\[0,\s*1,\s*2,\s*3,\s*4,\s*5,\s*6,\s*7,\s*8,\s*9\]\.includes\(c\)\)\s*\{\s*return;/.test(src));
  assert.ok(/commandEmergency\s*\(/.test(src));
});

test('P2974 port script is idempotent and credits are present', () => {
  execFileSync(process.execPath, [path.join(ROOT, 'tools/ci/p2974-heiman-port.js'), '--check'], { cwd: ROOT, stdio: 'pipe' });
  const credits = fs.readFileSync(path.join(ROOT, 'CREDITS.md'), 'utf8');
  assert.ok(/arnaud-gouder/.test(credits) && /BabaIsYou/.test(credits));
  assert.ok(/P2974/.test(credits));
});
