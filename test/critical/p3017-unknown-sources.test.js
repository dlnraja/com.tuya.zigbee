'use strict';

// P3017 — sourced decoders harvested from issues/forums/other projects, per-couple DP name
// catalogue, ZHA-style TSN dedup, app-level teach/forget Flow actions, ZCL header description.
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const I = require('../../lib/zigbee/UnknownCommandInterpreter');
const L = require('../../lib/zigbee/UnknownLearning');
const E = require('../../lib/zigbee/UnknownCommandEngine');
const Cards = require('../../lib/flow/UnknownCommandFlowCards');
const H = require('../../lib/zigbee/ZclFrameHeader');
const { build } = require('../../scripts/data/build-unknown-dp-catalog');

function mkDevice(store = {}) {
  const settings = { zb_manufacturer_name: '_TZ3000_x', zb_model_id: 'TS0044' };
  return {
    id: 'd', homey: { manifest: { flow: {} }, flow: {}, setTimeout, clearTimeout },
    driver: { id: 'button_wireless_4' }, getData: () => ({ id: 'd' }), getName: () => 'x', getClass: () => 'button',
    getSetting: (k) => settings[k], getStoreValue: (k) => store[k], setStoreValue: (k, v) => { store[k] = v; return Promise.resolve(); }, log() {},
  };
}

describe('P3017 sourced decoders', () => {
  it('genOnOff 0xFC value 2 = release (ZHA TuyaSmartRemoteOnOffCluster rotate_type 2 = stop)', () => {
    const r = I.interpretFrame({ clusterId: 6, cmdId: 0xFC, data: [2] });
    assert.strictEqual(r.action, 'release');
    assert.ok(r.exact);
  });
  it('lightingColorCtrl 0xE1 decodes hue/sat/brightness u16 LE; 0xF0..0xFB private config', () => {
    const r = I.interpretFrame({ clusterId: 0x0300, cmdId: 0xE1, data: [0x10, 0, 0x20, 0, 0x30, 0] });
    assert.deepStrictEqual([r.decoded.hue, r.decoded.saturation, r.decoded.brightness], [16, 32, 48]);
    for (const c of [0xE0, 0xF0, 0xF9, 0xFA, 0xFB]) { assert.ok(I.COLOR_PRIVATE[c], c.toString(16)); }
  });
  it('genBasic 0xF0 (tuyaSetup) is ignored like Z2M; E001 setOptions are config echoes', () => {
    assert.strictEqual(I.interpretFrame({ clusterId: 0, cmdId: 0xF0, data: [] }).action, 'ignore');
    for (const c of [0xE5, 0xE6, 0xE7]) { assert.strictEqual(I.interpretFrame({ clusterId: 0xE001, cmdId: c, data: [1] }).action, 'config_echo'); }
  });
  it('JB #619 _TZ3210_cwamkvua TS0202: DP101 press, DP102 dark/bright', () => {
    const a = I.interpretDp({ dp: 101, value: 1, datatype: 4, mfr: '_TZ3210_cwamkvua', pid: 'TS0202' });
    assert.strictEqual(a.action, 'double');
    assert.strictEqual(a.button, 1);
    assert.ok(a.exact);
    const b = I.interpretDp({ dp: 102, value: 1, datatype: 4, mfr: '_TZ3210_cwamkvua', pid: 'TS0202' });
    assert.strictEqual(b.decoded.illuminance, 'bright');
  });
});

describe('P3017 per-couple DP name catalogue', () => {
  it('semanticOf classifies names (press / alarm / state / config / measure, with gang)', () => {
    const t = { action: 'press', smoke: 'alarm', presence_sensitivity: 'config', alarm_volume: 'config', state_l2: 'state', temperature: 'measure' };
    for (const [n, s] of Object.entries(t)) { assert.strictEqual(I.semanticOf(n).semantic, s, n); }
    assert.strictEqual(I.semanticOf('state_l2').gang, 2);
    assert.strictEqual(I.semanticOf('dp_12'), null);
  });
  it('build is deterministic and project research overrides Z2M names', () => {
    const z2m = { dp: { _tze200_a: { model: 'TS0601', dps: [{ d: 1, n: 'state' }, { d: 2, n: 'foo' }] } } };
    const knowledge = { couples: { '_TZE200_a|TS0601': { dps: { 2: { name: 'battery', capability: 'measure_battery' } } } } };
    const a = build({ z2m, knowledge });
    assert.deepStrictEqual(a, build({ z2m, knowledge }));
    const p = a.profiles[a.idx['_tze200_a|TS0601']];
    assert.strictEqual(a.names[p[3]], 'battery');
    assert.strictEqual(a.caps['_tze200_a|TS0601'].measure_battery, 2);
  });
  it('shipped catalog is small, under lib/ (ships) and resolves a known couple', () => {
    const f = path.join(ROOT, 'lib', 'zigbee', 'data', 'unknown-dp-catalog.json');
    // WHY(P3018): catalog v2 doubles couple coverage (604→1175, exact fingerprints) and adds converter tokens; still lazy-loaded and bounded.
    assert.ok(fs.statSync(f).size < 180000);
    const cat = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.ok(Object.keys(cat.idx).length > 300);
    const r = I.interpretDp({ dp: 1, value: 123, datatype: 2, mfr: '_TZE284_6ocnqlhn', pid: 'TS0601' });
    assert.strictEqual(r.family, 'catalog');
  });
});

describe('P3017 ZHA-style TSN dedup', () => {
  beforeEach(() => E._resetForTests());
  it('same pattern + same tsn within 2 s counts once; a new tsn counts again', () => {
    const d = mkDevice();
    const f = { clusterId: 6, cmdId: 0xFD, data: [0], endpoint: 1, tsn: 17 };
    assert.ok(!E.handleFrame(d, f, 1000).duplicate);
    assert.strictEqual(E.handleFrame(d, f, 1500).duplicate, true);
    assert.ok(!E.handleFrame(d, Object.assign({}, f, { tsn: 18 }), 1600).duplicate);
    assert.ok(!E.handleFrame(d, Object.assign({}, f, { tsn: 18 }), 4000).duplicate, 'after window');
  });
  it('no tsn (null/undefined) → never deduped', () => {
    const d = mkDevice();
    const f = { clusterId: 6, cmdId: 0xFD, data: [0], endpoint: 1, tsn: null };
    E.handleFrame(d, f, 1000);
    assert.ok(!E.handleFrame(d, f, 1001).duplicate);
  });
});

describe('P3017 teach / forget app Flow actions', () => {
  it('normalizePattern canonicalises and rejects garbage', () => {
    assert.strictEqual(Cards.normalizePattern(' f:ep1:0x00e0:253:AB '), 'f:ep1:0x00E0:253:ab');
    assert.strictEqual(Cards.normalizePattern('DP:101:ENUM:1'), 'dp:101:enum:1');
    assert.strictEqual(Cards.normalizePattern('rm -rf'), null);
  });
  it('teach validates, stores a user mapping that wins over guesses; forget removes it', async () => {
    const d = mkDevice();
    await assert.rejects(Cards.teachRun({ device: d, pattern: 'bad', action: 'single' }));
    await assert.rejects(Cards.teachRun({ device: d, pattern: 'dp:101:enum:1', action: 'explode' }));
    assert.strictEqual(await Cards.teachRun({ device: d, pattern: 'dp:101:enum:1', action: { id: 'long' }, button: 3 }), true);
    const e = L.lookup(d, 'dp:101:enum:1');
    assert.strictEqual(e.a, 'long');
    assert.strictEqual(e.b, 3);
    const r = L.learn(d, 'dp:101:enum:1', { action: 'single', confidence: 0.99, exact: true }, Date.now());
    assert.strictEqual(r.action, 'long', 'user mapping wins');
    await Cards.forgetRun({ device: d, pattern: 'dp:101:enum:1' });
    assert.strictEqual(L.lookup(d, 'dp:101:enum:1'), null);
  });
  it('both cards are declared in compose and app.json with en/fr/nl/de', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    for (const id of ['unknown_command_teach', 'unknown_command_forget']) {
      const c = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose', 'flow', 'actions', `${id}.json`), 'utf8'));
      for (const lang of ['en', 'fr', 'nl', 'de']) { assert.ok(c.title[lang], `${id} ${lang}`); }
      const a = app.flow.actions.find((x) => x.id === id);
      assert.ok(a, `${id} in app.json`);
      assert.deepStrictEqual(Object.keys(a.title).sort(), ['de', 'en', 'fr', 'nl']);
    }
  });
});

describe('P3017 ZCL header description (#560 "unknown cmd" logs)', () => {
  it('parses manufacturer-specific header and describes EF00 forwarding', () => {
    const h = H.parseZclHeader(Buffer.from([0x05, 0x02, 0x10, 0x11, 0x02]));
    assert.strictEqual(h.manufacturerSpecific, true);
    assert.strictEqual(h.manufacturerCode, 0x1002);
    assert.strictEqual(h.tsn, 0x11);
    assert.strictEqual(h.cmdId, 0x02);
    assert.match(H.describeFrame({ cmdId: 2, trxSequenceNumber: 17 }, 0xEF00), /not an error/);
    assert.doesNotThrow(() => H.describeFrame(null, 0));
  });
});
