'use strict';
// P3380-P3383 (forum 21313 #296/#300/#291, t1013u/t1014u): universal escape hatches, dimmer scale, socket metering,
// triage suggestions. Pure tests, no Homey runtime.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const ROOT = path.join(__dirname, '..');

const core = require('../lib/altcontrol/AltControlCore');
const AltControlCards = require('../lib/altcontrol/AltControlCards');
const BS = require('../lib/dimmer/BrightnessScale');
const { socketMeteringFor } = require('../lib/altcontrol/SocketMeteringFallback');
const alt = require('../scripts/lib/alt-control-paths');

function fakeDevice(extra = {}) {
  const store = {}; const caps = {}; const added = [];
  return Object.assign({
    getData: () => ({ id: 'dev-1' }),
    getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; },
    hasCapability: (c) => Object.prototype.hasOwnProperty.call(caps, c),
    addCapability: async (c) => { caps[c] = null; added.push(c); },
    setCapabilityValue: async (c, v) => { caps[c] = v; },
    getCapabilityValue: (c) => caps[c], log() {}, _caps: caps, _added: added, _store: store,
  }, extra);
}

describe('P3380 AltControlCore', () => {
  it('parses typed DP values with bounds', () => {
    assert.deepStrictEqual(core.parseTypedDpValue('bool', 'on'), { ok: true, value: true });
    assert.strictEqual(core.parseTypedDpValue('value', '2147483648').ok, false);
    assert.strictEqual(core.parseTypedDpValue('enum', '256').ok, false);
    assert.ok(core.parseTypedDpValue('raw', '0a 0b').value.equals(Buffer.from([10, 11])));
    assert.strictEqual(core.parseTypedDpValue('raw', 'zz').ok, false);
    assert.strictEqual(core.parseTypedDpValue('string', 'x'.repeat(256)).ok, false);
    assert.strictEqual(core.parseTypedDpValue('object', '{}').ok, false);
  });

  it('builds ZCL frames (global, cluster, manufacturer specific)', () => {
    assert.strictEqual(core.buildZclFrame({ frameType: 'cluster', commandId: 1, payloadHex: '' , seq: 7 }).frame.toString('hex'), '110701');
    assert.strictEqual(core.buildZclFrame({ frameType: 'global', commandId: 2, payloadHex: '0000', manufacturerCode: 0x1002, seq: 1 }).frame.toString('hex'), '14021001020000');
    assert.strictEqual(core.buildZclFrame({ commandId: 300 }).ok, false);
    assert.strictEqual(core.buildZclFrame({ commandId: 1, payloadHex: 'abc' }).ok, false);
  });

  it('encodes write-attribute records little endian', () => {
    assert.strictEqual(core.buildWriteAttributePayload(0x8004, 'enum8', '1').payloadHex, '04803001');
    assert.strictEqual(core.buildWriteAttributePayload(0x0010, 'int16', '-2').payloadHex, '100029feff');
    assert.strictEqual(core.buildWriteAttributePayload(1, 'uint8', '256').ok, false);
    assert.strictEqual(core.buildWriteAttributePayload(1, 'float', '1').ok, false);
  });

  it('parses DP maps and only allows standard capabilities', () => {
    const r = core.parseDpMapSpec('101:measure_temperature:10; 102:alarm_contact, 5:evil_cap, 999:onoff, 7:dim:0');
    assert.deepStrictEqual(r.ok.map((e) => `${e.dp}:${e.capability}:${e.divisor}`), ['101:measure_temperature:10', '102:alarm_contact:1']);
    assert.strictEqual(r.errors.length, 3);
    assert.strictEqual(core.normaliseCapabilityId('measure_temperature.dp5'), 'measure_temperature.dp5');
    assert.strictEqual(core.convertMappedValue({ capability: 'measure_temperature', divisor: 10, offset: 0 }, 215), 21.5);
    assert.strictEqual(core.convertMappedValue({ capability: 'alarm_contact', divisor: 1, offset: 0 }, 1), true);
    assert.strictEqual(core.convertMappedValue({ capability: 'dim', divisor: 1000, offset: 0 }, 2000), 1);
  });

  it('rate limiter bounds sends', () => {
    let t = 0; const rl = new core.RateLimiter({ limit: 2, windowMs: 1000, now: () => t });
    assert.ok(rl.allow('a')); assert.ok(rl.allow('a')); assert.ok(!rl.allow('a'));
    t = 1500; assert.ok(rl.allow('a'));
  });
});

describe('P3380 AltControlCards runtime', () => {
  it('user DP map adds a standard capability and sets the scaled value', async () => {
    const d = fakeDevice();
    const homey = { flow: {}, settings: { get: () => undefined } };
    const cards = new AltControlCards(homey);
    d._store.lastDPValues = { 101: 215 };
    await cards.runMapSet({ device: d, mapping: '101:measure_temperature:10' });
    assert.deepStrictEqual(d._added, ['measure_temperature']);
    assert.strictEqual(d._caps.measure_temperature, 21.5);
    await cards.onDp(d, 101, 230, 'value');
    assert.strictEqual(d._caps.measure_temperature, 23);
  });

  it('DP send validates, routes and rate-limits', async () => {
    const sent = [];
    const d = fakeDevice({ sendTuyaDP: async (dp, v, t) => { sent.push([dp, v, t]); } });
    const cards = new AltControlCards({ flow: {}, settings: { get: () => undefined } });
    await cards.runDpSend({ device: d, dp: 5, dp_type: 'bool', value: 'true' });
    assert.deepStrictEqual(sent[0], [5, true, 'bool']);
    await assert.rejects(cards.runDpSend({ device: d, dp: 0, dp_type: 'bool', value: 'true' }));
    for (let i = 0; i < 4; i++) {await cards.runDpSend({ device: d, dp: 5, dp_type: 'value', value: '1' });}
    await assert.rejects(cards.runDpSend({ device: d, dp: 5, dp_type: 'value', value: '1' }), /Too many/);
  });

  it('cloud scene is opt-in and never sends when disabled', async () => {
    const cards = new AltControlCards({ flow: {}, settings: { get: () => undefined } });
    await assert.rejects(cards.runScene({ home_id: '1', scene_id: 'abc' }), /disabled/);
  });

  it('raw DP trigger fires only for watched devices with tokens', async () => {
    const fired = [];
    const trigger = { getArgumentValues: async () => [{ device: { getData: () => ({ id: 'dev-1' }) }, dp: 0 }],
      trigger: async (tokens, state) => { fired.push([tokens, state]); } };
    const cards = new AltControlCards({ flow: {}, settings: { get: () => undefined } });
    cards._trigger = trigger;
    await cards.onDp(fakeDevice(), 9, Buffer.from([0x01, 0x02]));
    await cards.onDp(fakeDevice({ getData: () => ({ id: 'other' }) }), 9, 1);
    assert.strictEqual(fired.length, 1);
    assert.deepStrictEqual(fired[0][0], { dp: 9, dp_type: 'raw', value: '0102', value_number: 258, hex: '0102' });
  });
});

describe('P3381 brightness scale (forum 21313 #300 replay)', () => {
  it('detects a 0-255 dimmer from the wrapped echo of a 0-1000 write', () => {
    // Homey slider 40% on the 10-1000 default -> 406; a uint8 dimmer echoes 406 % 256 = 150
    const sent = BS.fromDim(0.4, '10-1000');
    assert.strictEqual(sent, 406);
    assert.strictEqual(BS.scaleFromEcho(sent, sent % 256), '0-255');
    assert.strictEqual(BS.scaleFromEcho(sent, 255), '0-255');
    assert.strictEqual(BS.scaleFromEcho(sent, sent), null);
    const id = BS.resolveScale({ setting: 'auto', detected: '0-255' });
    assert.strictEqual(BS.fromDim(1, id), 255);
    assert.strictEqual(BS.toDim(255, id), 1);
  });

  it('setting override wins, reports above range upgrade, spec maps', () => {
    assert.strictEqual(BS.resolveScale({ setting: '0-100', detected: '0-255' }), '0-100');
    assert.strictEqual(BS.resolveScale({ setting: 'auto', fallback: '0-255', observedMax: 900 }), '10-1000');
    assert.strictEqual(BS.scaleFromSpec({ min: 25, max: 255 }), '0-255');
    assert.strictEqual(BS.scaleFromSpec({ min: 10, max: 1000 }), '10-1000');
    assert.strictEqual(BS.resolveScale({}), '10-1000');
  });

  it('wifi_dimmer exposes brightness_scale with auto default and keeps DP2 dim mapping', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/wifi_dimmer/driver.compose.json'), 'utf8'));
    const all = j.settings.flatMap((g) => g.children || [g]);
    const s = all.find((x) => x.id === 'brightness_scale');
    assert.ok(s && s.value === 'auto');
    assert.ok(j.capabilities.includes('dim'));
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wifi_dimmer/device.js'), 'utf8');
    assert.ok(/'2': \{ capability: 'dim'/.test(src));
  });
});

describe('P3382 socket metering fallback (forum 21313 #291/#292)', () => {
  const sock = (extra = {}) => ({ getClass: () => 'socket', ...extra });
  it('maps standard plug DPs 18/19/20 on sockets only when unmapped and plausible', () => {
    assert.deepStrictEqual(socketMeteringFor(sock(), 19, 1234), { capability: 'measure_power', value: 123.4 });
    assert.deepStrictEqual(socketMeteringFor(sock(), 20, 2301), { capability: 'measure_voltage', value: 230.1 });
    assert.deepStrictEqual(socketMeteringFor(sock(), 18, 532), { capability: 'measure_current', value: 0.53 });
    assert.strictEqual(socketMeteringFor(sock(), 20, 50), null);
    assert.strictEqual(socketMeteringFor({ getClass: () => 'sensor' }, 19, 100), null);
    assert.strictEqual(socketMeteringFor(sock({ dpMappings: { 19: { capability: 'x' } } }), 19, 100), null);
  });
});

describe('P3383 manifest + triage suggestions', () => {
  it('declares the alt cards without a device filter and with titleFormatted', () => {
    for (const [k, id] of [['actions', 'alt_tuya_dp_send'], ['actions', 'alt_zcl_frame_send'], ['actions', 'alt_zcl_attribute_write'],
      ['actions', 'alt_dp_map_set'], ['actions', 'alt_dp_map_clear'], ['actions', 'alt_tuya_scene_trigger'],
      ['triggers', 'alt_tuya_dp_received'], ['conditions', 'alt_tuya_dp_is']]) {
      const f = path.join(ROOT, '.homeycompose/flow', k, `${id}.json`);
      const raw = fs.readFileSync(f, 'utf8');
      assert.ok(!/[^\t\n\r\u0020-\u00ff]/.test(raw), `${id} has chars above U+00FF`);
      const j = JSON.parse(raw);
      assert.strictEqual(j.id, id);
      const dev = (j.args || []).find((a) => a.type === 'device');
      if (dev) {assert.strictEqual(dev.filter, undefined, `${id} must reach every device`);}
      if ((j.args || []).length) {assert.ok(j.titleFormatted && j.titleFormatted.en, `${id} titleFormatted`);}
    }
  });

  it('existing tuya_dp_* cards are untouched (no published id removed)', () => {
    for (const id of ['tuya_dp_send', 'tuya_dp_send_typed']) {assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/actions', `${id}.json`)));}
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/triggers/tuya_dp_received.json')));
  });

  it('triage proposes the alternative paths for an unknown DP / unsupported device', () => {
    const p = alt.suggestAltPaths({ text: 'My Tuya soil sensor sends unknown DP 107, not exposed in Homey' }, { status: 'already_supported' });
    const ids = p.map((x) => x.id);
    assert.ok(['raw_dp', 'dp_map', 'raw_zcl', 'cloud_scene'].every((x) => ids.includes(x)));
    assert.ok(p.find((x) => x.id === 'dp_map').cards.some((c) => c.startsWith('alt_dp_map_set')));
    assert.ok(p.find((x) => x.id === 'cloud_scene').settings.some((s) => s.startsWith('alt_tuya_scenes_enabled')));
    assert.ok(alt.replyText(p).includes('Send Tuya DP (any device)'));
    assert.strictEqual(alt.suggestAltPaths({ text: 'works great, thanks' }, { status: 'already_supported' }).length, 0);
    assert.ok(alt.suggestAltPaths({ text: 'nothing' }, { status: 'missing' }).length >= 4);
    assert.ok(alt.suggestAltPaths({ text: 'dimming range only goes to 33% then repeats' }, {}).some((x) => x.id === 'brightness_scale'));
  });
});
