'use strict';
// WHY(P2868, 2026-10-19 user decision): _TZ3000_abrsvsou + TS004F is the HOBEIAN ZG-101ZD / Tuya ERS-10TZBVK-AA
// rotary knob (Z2M hobeian.ts ZG-101ZD, ZHA zhaquirks/tuya/ts004f.py TuyaSmartRemote004FROK, deCONZ smart-knob DDF,
// JohanBendz smart_knob_switch), not a 4-button remote. It gets its own driver smart_knob_zg101zd: native ZCL only
// (onOff / levelControl / colorControl bound, powerConfiguration battery), Tuya event mode as an optional overlay.
// One couple, one driver: button_wireless_4 must no longer claim it (curated removal + pin).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const D = 'smart_knob_zg101zd';
const dir = path.join(ROOT, 'drivers', D);
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const compose = readJson(`drivers/${D}/driver.compose.json`);
const flow = readJson(`drivers/${D}/driver.flow.compose.json`);
const k = require(`../../drivers/${D}/knob-commands`);

// Load device.js with a stub ZigBeeDevice only (real zigbee-clusters), then restore the loader.
const cacheBefore = new Set(Object.keys(require.cache));
const originalLoad = Module._load;
Module._load = function loadWithStub(request, parent, isMain) {
  if (request === 'homey-zigbeedriver') {
    return { ZigBeeDevice: class { registerCapability() {} }, ZigBeeDriver: class {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const KnobDevice = require(`../../drivers/${D}/device`);
Module._load = originalLoad;
for (const key of Object.keys(require.cache)) { if (!cacheBefore.has(key) && /smart_knob_zg101zd[\\/]device/.test(key)) { delete require.cache[key]; } }
const { ZCLNode } = require('zigbee-clusters');

describe('P2868 smart_knob_zg101zd — exact couple, native pairing path', () => {
  it('claims only the ZG-101ZD / ERS-10TZBVK-AA makers (case forms) + TS004F, native clusters, battery', () => {
    assert.deepEqual(compose.zigbee.productId, ['TS004F']);
    // P2871 (2026-10-19): _TZ3000_4fjiwweb joined (same knob family, Z2M tuya.ts ERS-10TZBVK-AA)
    assert.deepEqual([...new Set(compose.zigbee.manufacturerName.map((m) => m.toLowerCase()))], ['_tz3000_abrsvsou', '_tz3000_4fjiwweb']);
    const ep = compose.zigbee.endpoints['1'];
    for (const c of [0, 1, 6]) { assert.ok(ep.clusters.includes(c), `cluster ${c}`); }
    for (const c of [5, 6, 8]) { assert.ok(ep.bindings.includes(c), `binding ${c}`); }
    assert.ok(!ep.clusters.includes(61184), 'no Tuya EF00 needed to pair');
    assert.deepEqual(compose.capabilities, ['measure_battery']);
    for (const f of ['assets/images/small.png', 'assets/images/large.png', 'assets/icon.svg']) { assert.ok(fs.existsSync(path.join(dir, f)), f); }
  });

  it('one couple, one driver: no other compose or app.json entry claims abrsvsou × TS004F', () => {
    const owners = [];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const p = path.join(ROOT, 'drivers', id, 'driver.compose.json');
      if (!fs.existsSync(p)) { continue; }
      const z = JSON.parse(fs.readFileSync(p, 'utf8')).zigbee || {};
      const mf = (z.manufacturerName || []).map((m) => String(m).toLowerCase());
      const pid = (z.productId || []).map((m) => String(m).toLowerCase());
      if (mf.includes('_tz3000_abrsvsou') && pid.includes('ts004f')) { owners.push(id); }
    }
    assert.deepEqual(owners, [D]);
    const app = readJson('app.json');
    const appOwners = app.drivers.filter((x) => (x.zigbee?.manufacturerName || []).some((m) => m.toLowerCase() === '_tz3000_abrsvsou')).map((x) => x.id);
    assert.deepEqual(appOwners, [D]);
    const entry = app.drivers.find((x) => x.id === D);
    assert.deepEqual(entry.zigbee.productId, ['TS004F']);
    assert.equal(entry.images.small, `/drivers/${D}/assets/images/small.png`);
  });

  it('curated removal + couple pin + fingerprint DB point at the new driver', () => {
    const rem = readJson('config/architecture/curated-couple-removals.json').removals;
    assert.ok(rem.some((r) => r.driver === 'button_wireless_4' && r.mfr.includes('_TZ3000_abrsvsou')));
    const pins = readJson('config/architecture/couple-driver-pins.json').pins;
    assert.ok(pins.some((p) => p.driver === D && p.pid === 'TS004F' && p.mfr.includes('_TZ3000_abrsvsou')));
    assert.equal(require('../../lib/DeviceFingerprintDB').lookup('_TZ3000_abrsvsou', 'TS004F').driver, D);
  });

  it('flow triggers: rotate left/right, press, double press, hold (+ press+rotate), 4 locales', () => {
    const ids = flow.triggers.map((c) => c.id);
    for (const ev of ['rotate_left', 'rotate_right', 'press', 'double_press', 'hold', 'press_rotate_left', 'press_rotate_right']) {
      assert.ok(ids.includes(`${D}_${ev}`), ev);
    }
    for (const c of flow.triggers) {
      for (const l of ['en', 'fr', 'nl', 'de']) { assert.ok(c.title[l], `${c.id} ${l}`); }
      const argNames = (c.args || []).map((a) => a.name);
      for (const t of c.tokens || []) { assert.ok(!argNames.includes(t.name), `${c.id}: token ${t.name} must not shadow an arg`); }
    }
  });
});

describe('P2868 decoder — both firmware modes (Z2M / ZHA mapping)', () => {
  const cases = [
    [[6, 2, []], 'press', 'command'],
    [[8, 2, [0, 13, 1, 0]], 'rotate_right', 'command'],
    [[8, 2, [1, 37, 1, 0]], 'rotate_left', 'command'],
    [[8, 6, [1, 13, 1, 0]], 'rotate_left', 'command'],
    [[768, 0x4C, [1, 13, 0, 1, 0, 0, 0, 0, 0]], 'press_rotate_right', 'command'],
    [[768, 0x4C, [3, 13, 0, 1, 0, 0, 0, 0, 0]], 'press_rotate_left', 'command'],
    [[768, 0x04, [1, 51]], 'hold', 'command'],
    [[768, 0x01, [1, 51]], 'hold', 'command'],
    [[768, 0x47, [0, 0, 0]], 'release', 'command'],
    [[6, 0xFD, [0]], 'press', 'event'],
    [[6, 0xFD, [1]], 'double_press', 'event'],
    [[6, 0xFD, [2]], 'hold', 'event'],
    [[6, 0xFC, [0]], 'rotate_right', 'event'],
    [[6, 0xFC, [1]], 'rotate_left', 'event'],
  ];
  for (const [[cl, cmd, data], action, mode] of cases) {
    it(`cluster ${cl} cmd 0x${cmd.toString(16)} [${data}] → ${action} (${mode})`, () => {
      const r = k.decodeKnobCommand(cl, cmd, Buffer.from(data));
      assert.equal(r.action, action);
      assert.equal(r.mode, mode);
    });
  }
  it('step size → speed token (ZHA: 13 slow, 37 fast)', () => {
    assert.equal(k.decodeKnobCommand(8, 2, Buffer.from([0, 13, 1, 0])).stepSize, 13);
    assert.equal(k.speedOf(13), 'slow');
    assert.equal(k.speedOf(37), 'fast');
    assert.equal(k.speedOf(0), 'normal');
  });
  it('ignores stop / unknown frames', () => {
    assert.equal(k.decodeKnobCommand(8, 3, Buffer.alloc(0)), null);
    assert.equal(k.decodeKnobCommand(6, 0xFD, Buffer.from([9])), null);
    assert.equal(k.decodeKnobCommand(4, 0, Buffer.alloc(0)), null);
  });
});

describe('P2868 device — real zigbee-clusters frame path end to end', () => {
  function build(settings = {}) {
    const sent = [];
    const node = { sendFrame: async (ep, cl, buf) => { sent.push({ cl, buf: Buffer.from(buf) }); }, endpointDescriptors: [{ endpointId: 1, inputClusters: [0, 1, 3, 4, 6, 4096], outputClusters: [3, 4, 5, 6, 8, 10, 25, 4096] }] };
    const zclNode = new ZCLNode(node);
    const fired = [];
    const dev = Object.create(KnobDevice.prototype);
    dev.log = () => {};
    dev.error = (...a) => { fired.push(['ERROR', a.join(' ')]); };
    dev.getSetting = (key) => settings[key];
    dev.setStoreValue = async () => {};
    dev.homey = { flow: { getDeviceTriggerCard: (id) => ({ trigger: async (_d, tokens) => { fired.push([id, tokens]); } }) }, setTimeout };
    return { dev, zclNode, node, fired, sent };
  }
  const zcl = (seq, cmd, data = []) => Buffer.from([0x01, seq, cmd, ...data]); // cluster-specific, client → server

  it('gestures reach the right flow cards, duplicates dropped, frames acknowledged', async () => {
    const { dev, zclNode, node, fired, sent } = build();
    await dev.onNodeInit({ zclNode });
    await node.handleFrame(1, 6, zcl(1, 0x02));
    await node.handleFrame(1, 8, zcl(2, 0x02, [0, 13, 1, 0]));
    await node.handleFrame(1, 8, zcl(2, 0x02, [0, 13, 1, 0])); // resent frame, same seq
    await node.handleFrame(1, 8, zcl(3, 0x02, [1, 37, 1, 0]));
    await node.handleFrame(1, 768, zcl(4, 0x4C, [3, 13, 0, 1, 0, 0, 0, 0, 0]));
    await node.handleFrame(1, 768, zcl(5, 0x04, [1, 51]));
    await node.handleFrame(1, 6, zcl(6, 0xFD, [1]));
    await node.handleFrame(1, 6, zcl(7, 0xFD, [2]));
    await node.handleFrame(1, 6, zcl(8, 0xFC, [1]));
    assert.deepEqual(fired.map((f) => f[0]), [
      `${D}_press`, `${D}_rotate_right`, `${D}_rotate_left`, `${D}_press_rotate_left`, `${D}_hold`,
      `${D}_double_press`, `${D}_hold`, `${D}_rotate_left`,
    ]);
    assert.deepEqual(fired[1][1], { step_size: 13, speed: 'slow' });
    assert.deepEqual(fired[2][1], { step_size: 37, speed: 'fast' });
    // every default response is SUCCESS (no "unknown command" errors back to the knob)
    const responses = sent.filter((s) => s.buf[2] === 0x0B);
    assert.ok(responses.length >= 8);
    for (const r of responses) { assert.equal(r.buf[4], 0x00, `status for cmd 0x${r.buf[3].toString(16)}`); }
  });

  it('default setting keeps the knob mode (no Tuya write); event setting writes 0x8004 on request', async () => {
    const { dev, zclNode } = build();
    const writes = [];
    zclNode.endpoints[1].clusters.onOff.writeAttributes = async (attrs) => { writes.push(attrs); };
    await dev.onNodeInit({ zclNode });
    assert.equal(writes.length, 0);
    await dev.onSettings({ newSettings: { operating_mode: 'event' }, changedKeys: ['operating_mode'] });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(writes.length, 1);
    assert.equal(Object.values(writes[0])[0], 1);
  });
});

describe('P2868 bare ZigBeeDevice gate (P102) knows the native-only knob', () => {
  it('smart_knob_zg101zd is on the documented allowlist and the gate passes', () => {
    const allow = readJson('tools/ci/bare-zigbee-allowlist.json');
    assert.ok((allow.drivers || []).includes(D));
    const r = require('child_process').spawnSync(process.execPath, ['tools/ci/bare-zigbee-device-gate.js'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});
