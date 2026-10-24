'use strict';

// P3016 — handle every unknown command differently: interpret (exact ZCL/Z2M/ZHA decoders first,
// per-family next, heuristics last), learn per device (bounded, persisted), expose Flow cards,
// never crash, export diag without personal data. See docs/knowledge/KB/UNKNOWN_COMMANDS.md.
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const I = require('../../lib/zigbee/UnknownCommandInterpreter');
const L = require('../../lib/zigbee/UnknownLearning');
const E = require('../../lib/zigbee/UnknownCommandEngine');
const Cards = require('../../lib/flow/UnknownCommandFlowCards');
const { parseTongouToqSysJztDp6 } = require('../../lib/tuya/DpByteArrayProfiles');

const CARD_IDS = { triggers: ['unknown_command_received', 'inferred_button_action'], conditions: ['last_inferred_action_is'], actions: ['unknown_commands_diag'] };

function manifest() {
  const flow = {};
  for (const [k, ids] of Object.entries(CARD_IDS)) { flow[k] = ids.map((id) => ({ id })); }
  return { flow };
}

function mkDevice({ id = 'dev-1', cls = 'button', driver = 'button_wireless_4', mfr = '_TZ3000_x', pid = 'TS0044', declared = true, store = {} } = {}) {
  const fired = [];
  const listeners = {};
  const card = (cid) => ({
    trigger: (tokens, state) => { fired.push({ id: cid, tokens, state }); return Promise.resolve(); },
    registerRunListener: (fn) => { listeners[cid] = fn; },
  });
  const homey = {
    manifest: declared ? manifest() : { flow: { triggers: [], conditions: [], actions: [] } },
    flow: { getTriggerCard: card, getConditionCard: card, getActionCard: card },
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); t.unref(); return t; },
    clearTimeout: (t) => clearTimeout(t),
  };
  const settings = { zb_manufacturer_name: mfr, zb_model_id: pid };
  return {
    id, homey, fired, listeners, logs: [],
    driver: { id: driver },
    getData: () => ({ id }),
    getName: () => 'Secret Living Room Remote',
    getClass: () => cls,
    getSetting: (k) => settings[k],
    getStoreValue: (k) => store[k],
    setStoreValue: (k, v) => { store[k] = v; return Promise.resolve(); },
    log(...a) { this.logs.push(a.join(' ')); },
  };
}

describe('P3016 interpreter — exact frame decoders', () => {
  it('Tuya 0xFD on genOnOff = single/double/hold (z2m tuyaAction)', () => {
    for (const [b, act] of [[0, 'single'], [1, 'double'], [2, 'long']]) {
      const r = I.interpretFrame({ clusterId: 6, cmdId: 0xFD, data: [b], endpoint: 3, endpointCount: 4 });
      assert.strictEqual(r.action, act);
      assert.strictEqual(r.button, 3);
      assert.ok(r.exact && r.confidence >= 0.9);
    }
  });
  it('Tuya 0xFC on genOnOff = rotate right/left', () => {
    assert.strictEqual(I.interpretFrame({ clusterId: 6, cmdId: 0xFC, data: [0] }).action, 'rotate_right');
    assert.strictEqual(I.interpretFrame({ clusterId: 6, cmdId: 0xFC, data: [1] }).action, 'rotate_left');
  });
  it('ZCL onOff off/on/toggle', () => {
    assert.strictEqual(I.interpretFrame({ clusterId: 6, cmdId: 0 }).action, 'off');
    assert.strictEqual(I.interpretFrame({ clusterId: 6, cmdId: 1 }).action, 'on');
    assert.strictEqual(I.interpretFrame({ clusterId: 6, cmdId: 2 }).action, 'toggle');
  });
  it('ZCL level: step → rotate, move → long, stop → release', () => {
    assert.match(I.interpretFrame({ clusterId: 8, cmdId: 2, data: [0, 20, 0, 5] }).action, /rotate_(left|right)/);
    assert.strictEqual(I.interpretFrame({ clusterId: 8, cmdId: 1, data: [0, 50] }).action, 'long');
    assert.strictEqual(I.interpretFrame({ clusterId: 8, cmdId: 3 }).action, 'release');
  });
  it('ZCL scenes recall carries group u16 LE + scene u8', () => {
    const r = I.interpretFrame({ clusterId: 5, cmdId: 5, data: [0x01, 0x00, 0x03] });
    assert.strictEqual(r.action, 'scene');
    assert.ok(r.exact);
  });
  it('ZCL color: stopMoveStep is a release, moveColorTemp is long', () => {
    assert.strictEqual(I.interpretFrame({ clusterId: 0x300, cmdId: 0x47, data: [] }).action, 'release');
    const r = I.interpretFrame({ clusterId: 0x300, cmdId: 0x4B, data: [1, 10, 0, 0, 0, 0, 0] });
    assert.ok(['long', 'rotate_right', 'rotate_left'].includes(r.action));
  });
  it('EF00 response commands are named, never guessed', () => {
    const r = I.interpretFrame({ clusterId: 0xEF00, cmdId: 0x24, data: [0, 1] });
    assert.strictEqual(r.action, 'time_request');
    assert.strictEqual(I.interpretFrame({ clusterId: 0xEF00, cmdId: 0x11, data: [0, 1, 0x40] }).action, 'version');
  });
  it('genBasic private report is ignored (z2m ignore_basic_report)', () => {
    assert.strictEqual(I.interpretFrame({ clusterId: 0, cmdId: 0x0A, data: [1, 2, 3] }).action, 'ignore');
  });
  it('E000 timing commands are config echoes', () => {
    assert.strictEqual(I.interpretFrame({ clusterId: 0xE000, cmdId: 0xFB, data: [0, 1] }).action, 'config_echo');
  });
  it('unknown clusters fall back to a low-confidence heuristic and never throw', () => {
    const r = I.interpretFrame({ clusterId: 0xFC57, cmdId: 0x99, data: [1, 2, 3, 4] });
    assert.ok(r && r.confidence < 0.6 && !r.exact);
    for (const bad of [undefined, null, {}, { clusterId: 'x', cmdId: NaN, data: 'zz' }, { data: { a: 1 } }]) {
      assert.doesNotThrow(() => I.interpretFrame(bad));
    }
  });
});

describe('P3016 interpreter — DPs', () => {
  it('Tongou TO-Q-SYS-JZT DP6 = phaseVariant2 (real diag samples)', () => {
    const r = I.interpretDp({ dp: 6, datatype: 0, value: Buffer.from([9, 138, 0, 7, 251, 0, 1, 161]), mfr: '_TZE284_6ocnqlhn', pid: 'TS0601' });
    assert.ok(r.exact);
    assert.deepStrictEqual([r.value.voltage, r.value.current, r.value.power], [244.2, 2.043, 417]);
  });
  it('button class DPn 0/1/2 = single/double/long on button n', () => {
    const r = I.interpretDp({ dp: 2, datatype: 4, value: 1, deviceClass: 'button', driverId: 'scene_switch_4' });
    assert.strictEqual(r.action, 'double');
    assert.strictEqual(r.button, 2);
  });
  it('thermostat DP36 = running_state family, radar DP113 = config echo', () => {
    assert.strictEqual(I.interpretDp({ dp: 36, datatype: 4, value: 1, deviceClass: 'thermostat', driverId: 'wall_thermostat' }).action, 'state');
    assert.strictEqual(I.interpretDp({ dp: 113, datatype: 4, value: 0, deviceClass: 'sensor', driverId: 'presence_sensor_radar' }).action, 'config_echo');
  });
  it('heuristics by wire type when nothing is known', () => {
    assert.strictEqual(I.interpretDp({ dp: 150, datatype: 1, value: true }).action, 'state');
    assert.ok(I.interpretDp({ dp: 150, datatype: 2, value: 1234 }).confidence <= 0.4);
    assert.doesNotThrow(() => I.interpretDp({ dp: 'x', datatype: 99, value: Symbol('s') }));
  });
  it('patterns are stable and contain no payload for long frames', () => {
    assert.strictEqual(I.framePattern({ endpoint: 2, clusterId: 6, cmdId: 253, data: [1] }), 'f:ep2:0x0006:253:01');
    assert.match(I.framePattern({ clusterId: 0xEF00, cmdId: 2, data: [1, 2, 3, 4, 5] }), /len5$/);
    assert.match(I.dpPattern({ dp: 6, datatype: 0, value: Buffer.alloc(8) }), /^dp:6:raw:len8$/);
  });
});

describe('P3016 Tongou DP6 parser fix (DpByteArrayProfiles)', () => {
  it('8-byte frames use phaseVariant2', () => {
    const a = parseTongouToqSysJztDp6([9, 138, 0, 7, 251, 0, 1, 161]);
    assert.ok(a.ok);
    assert.deepStrictEqual(a.decoded, { measure_voltage: 244.2, measure_current: 2.043, measure_power: 417 });
    const b = parseTongouToqSysJztDp6([9, 146, 0, 4, 178, 0, 0, 176]);
    assert.deepStrictEqual(b.decoded, { measure_voltage: 245, measure_current: 1.202, measure_power: 176 });
  });
  it('legacy 7-byte layout still works and short frames are rejected', () => {
    const buf = Buffer.alloc(7);
    buf.writeUInt16BE(2243, 1); buf.writeUInt16BE(4940, 3); buf.writeUInt16BE(10970, 5);
    assert.strictEqual(parseTongouToqSysJztDp6(buf).decoded.measure_voltage, 224.3);
    assert.strictEqual(parseTongouToqSysJztDp6([1, 2]).ok, false);
  });
});

describe('P3016 learning', () => {
  it('bounded LRU, persisted debounced, no personal data', () => {
    const store = {};
    const d = mkDevice({ store });
    for (let i = 0; i < L.MAX_KEYS + 15; i++) { L.learn(d, `k${i}`, { action: 'raw', confidence: 0.1 }, 1000 + i); }
    const snap = L.snapshot(d, 999);
    assert.strictEqual(snap.length, L.MAX_KEYS);
    assert.ok(!snap.some((e) => e.key === 'k0'), 'oldest evicted');
    L.dispose(d);
    assert.ok(!JSON.stringify(snap).includes('Secret'));
  });
  it('reinforcement raises confidence, capped at 0.99', () => {
    assert.ok(L.reinforced(0.5, 8) > L.reinforced(0.5, 1));
    assert.strictEqual(L.reinforced(0.98, 1 << 20), 0.99);
  });
  it('exact evidence replaces a heuristic; teach pins a user action', () => {
    const d = mkDevice();
    L.learn(d, 'p', { action: 'raw', confidence: 0.2 }, 1);
    L.learn(d, 'p', { action: 'double', confidence: 0.95, exact: true }, 2);
    assert.strictEqual(L.lookup(d, 'p').a, 'double');
    L.teach(d, 'q', 'long', 2, 3);
    const r = L.learn(d, 'q', { action: 'raw', confidence: 0.1 }, 4);
    assert.strictEqual(r.action, 'long');
    assert.ok(r.learned);
    L.dispose(d);
  });
  it('restores from store', () => {
    const d = mkDevice({ store: { [L.STORE_KEY]: { z: { a: 'single', c: 0.7, n: 3, t: 1 } } } });
    assert.strictEqual(L.lookup(d, 'z').a, 'single');
  });
});

describe('P3016 engine + flows', () => {
  beforeEach(() => E._resetForTests());

  it('fires both triggers for a 0xFD press, with device filter state', () => {
    const d = mkDevice();
    const r = E.handleFrame(d, { clusterId: 6, cmdId: 0xFD, data: [1], endpoint: 1 }, 10000);
    assert.strictEqual(r.action, 'double');
    const ids = d.fired.map((f) => f.id);
    assert.deepStrictEqual(ids, ['unknown_command_received', 'inferred_button_action']);
    assert.strictEqual(d.fired[0].tokens.cluster, '0x0006');
    assert.strictEqual(d.fired[0].tokens.command, 253);
    assert.strictEqual(d.fired[1].state.deviceId, 'dev-1');
    assert.ok(E.lastActionIs('dev-1', 'double', 1, 10000 + 30000));
    assert.ok(!E.lastActionIs('dev-1', 'double', 1, 10000 + 120000));
    L.dispose(d);
  });
  it('rate-limits per device+pattern', () => {
    const d = mkDevice();
    E.handleFrame(d, { clusterId: 6, cmdId: 0xFD, data: [0] }, 50000);
    E.handleFrame(d, { clusterId: 6, cmdId: 0xFD, data: [0] }, 50000 + 10);
    assert.strictEqual(d.fired.filter((f) => f.id === 'inferred_button_action').length, 1);
    E.handleFrame(d, { clusterId: 6, cmdId: 0xFD, data: [0] }, 50000 + E.FLOW_MIN_INTERVAL_MS + 1);
    assert.strictEqual(d.fired.filter((f) => f.id === 'inferred_button_action').length, 2);
    L.dispose(d);
  });
  it('does not fire undeclared cards (pruned manifests)', () => {
    const d = mkDevice({ declared: false });
    E.handleFrame(d, { clusterId: 6, cmdId: 0xFD, data: [2] }, 1);
    assert.strictEqual(d.fired.length, 0);
    L.dispose(d);
  });
  it('periodic DP echoes notify only on change', () => {
    const d = mkDevice({ cls: 'sensor', driver: 'presence_sensor_radar' });
    E.handleDp(d, { dp: 113, value: 1, datatype: 4 }, 1000);
    E.handleDp(d, { dp: 113, value: 1, datatype: 4 }, 70000);
    E.handleDp(d, { dp: 113, value: 0, datatype: 4 }, 140000);
    assert.strictEqual(d.fired.filter((f) => f.id === 'unknown_command_received').length, 2);
    L.dispose(d);
  });
  it('logs once per pattern per interval', () => {
    const d = mkDevice();
    for (let i = 0; i < 5; i++) { E.handleFrame(d, { clusterId: 6, cmdId: 0xFD, data: [0] }, 1000 + (i * 2000)); }
    assert.strictEqual(d.logs.filter((l) => l.includes('[UNKNOWN-INTERP]')).length, 1);
    L.dispose(d);
  });
  it('diag export has patterns and counters but no name or id', () => {
    const d = mkDevice({ id: 'ieee-00:11:22' });
    E.handleFrame(d, { clusterId: 6, cmdId: 0xFD, data: [1] }, 1);
    const s = JSON.stringify(E.diagExport(d));
    assert.ok(s.includes('f:ep1:0x0006:253:01'));
    assert.ok(!s.includes('Secret') && !s.includes('ieee-00'));
    L.dispose(d);
  });
  it('never throws on hostile devices', () => {
    const bad = { getData() { throw new Error('x'); }, getName() { throw new Error('y'); }, log() { throw new Error('z'); }, homey: { flow: { getTriggerCard() { throw new Error('w'); } } } };
    assert.doesNotThrow(() => E.handleFrame(bad, { clusterId: 6, cmdId: 0xFD, data: [0] }));
    assert.doesNotThrow(() => E.handleDp(bad, { dp: 1, value: 0, datatype: 4 }));
    assert.strictEqual(E.handleFrame(null, {}), null);
    assert.doesNotThrow(() => E.diagExport(null));
  });
});

describe('P3016 flow card registration', () => {
  it('registers all four declared cards and filters by device/action', async () => {
    const d = mkDevice();
    const done = Cards.register(d.homey);
    assert.deepStrictEqual(done.sort(), ['inferred_button_action', 'last_inferred_action_is', 'unknown_command_received', 'unknown_commands_diag']);
    const trig = d.listeners.inferred_button_action;
    assert.strictEqual(await trig({ device: d, action: 'double' }, { deviceId: 'dev-1', action: 'double' }), true);
    assert.strictEqual(await trig({ device: d, action: 'single' }, { deviceId: 'dev-1', action: 'double' }), false);
    assert.strictEqual(await trig({ device: mkDevice({ id: 'other' }) }, { deviceId: 'dev-1', action: 'double' }), false);
    assert.strictEqual(await trig({ action: { id: 'any' } }, { deviceId: 'dev-1', action: 'long' }), true);
    const out = await d.listeners.unknown_commands_diag({ device: d });
    assert.strictEqual(typeof out.json, 'string');
    assert.strictEqual(typeof out.count, 'number');
  });
  it('skips undeclared cards', () => {
    assert.deepStrictEqual(Cards.register(mkDevice({ declared: false }).homey), []);
    assert.deepStrictEqual(Cards.register(null), []);
  });
});

describe('P3016 manifest + hooks', () => {
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  for (const [kind, ids] of Object.entries(CARD_IDS)) {
    for (const id of ids) {
      it(`${kind}/${id} in compose and app.json`, () => {
        assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose', 'flow', kind, `${id}.json`)));
        assert.ok(app.flow[kind].some((c) => c.id === id));
      });
    }
  }
  it('sink, DP logger and app.js call the engine/cards', () => {
    assert.match(fs.readFileSync(path.join(ROOT, 'lib/zigbee/UnknownCommandSink.js'), 'utf8'), /UnknownCommandEngine'\)\.handleFrame/);
    assert.match(fs.readFileSync(path.join(ROOT, 'lib/utils/UnknownDPLogger.js'), 'utf8'), /UnknownCommandEngine'\)\.handleDp/);
    assert.match(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), /UnknownCommandFlowCards'\)\.register/);
  });
  it('UnknownCommandSink.record still works and feeds the engine', () => {
    const Sink = require('../../lib/zigbee/UnknownCommandSink');
    const d = mkDevice();
    Sink.record(d, { clusterId: 6, cmdId: 0xFD, data: Buffer.from([2]), endpoint: 1 });
    assert.ok(d._unknownEngine && d._unknownEngine.stats.frames === 1);
    L.dispose(d);
  });
});

describe('P3016 learning persistence is timer-free and throttled', () => {
  it('first sighting written, burst throttled, dispose flushes', () => {
    const store = {};
    let writes = 0;
    const d = mkDevice({ store });
    const orig = d.setStoreValue;
    d.setStoreValue = (k, v) => { writes++; return orig(k, v); };
    L.learn(d, 'a', { action: 'single', confidence: 0.7 }, 100000);
    assert.strictEqual(writes, 1);
    L.learn(d, 'b', { action: 'double', confidence: 0.7 }, 100500);
    assert.strictEqual(writes, 1);
    L.dispose(d);
    assert.strictEqual(writes, 2);
    assert.ok(store[L.STORE_KEY].b);
  });
});
