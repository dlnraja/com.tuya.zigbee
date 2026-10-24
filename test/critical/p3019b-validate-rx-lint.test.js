'use strict';

// P3019b: (1) every Flow card titleFormatted follows the homey-lib publish rule (all args except the
// first driver-filtered device arg must appear exactly once) — the inferred_button_action trigger
// now carries [[device]]; (2) TS0049 0xE001 countdown report decoded by a chained RX listener
// (master only, skipped elsewhere); (3) the pre-existing soil_sensor / water_valve_garden lint errors stay fixed.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Mirror of homey-lib App._validateFlowCard titleFormatted check. Returns error strings. */
function titleFormattedErrors(card, where) {
  const errs = [];
  const args = Array.isArray(card.args) ? card.args : [];
  const firstDev = args.find((a) => {
    const f = new URLSearchParams(a.filter || '');
    return a.type === 'device' && (f.has('driver_id') || f.has('driverId'));
  });
  const names = args.filter((a) => a !== firstDev).map((a) => a.name);
  if (card.droptoken) { names.push('droptoken'); }
  if (!names.length || card.titleFormatted === undefined) { return errs; }
  const tf = typeof card.titleFormatted === 'string' ? { _: card.titleFormatted } : card.titleFormatted;
  for (const [lang, t] of Object.entries(tf)) {
    const found = (String(t).match(/\[\[(.*?)\]\]/g) || []).map((m) => m.slice(2, -2));
    for (const n of names) {
      const c = found.filter((x) => x === n).length;
      if (c !== 1) { errs.push(`${where}.${lang}: [[${n}]] x${c}`); }
    }
    for (const x of found) { if (!names.includes(x)) { errs.push(`${where}.${lang}: invalid [[${x}]]`); } }
  }
  return errs;
}

describe('P3019b flow cards titleFormatted (publish rule)', () => {
  it('rule mirror: device arg without driver filter must be in titleFormatted', () => {
    const card = { args: [{ type: 'device', name: 'device' }, { type: 'dropdown', name: 'action' }], titleFormatted: { en: 'x [[action]]' } };
    assert.deepStrictEqual(titleFormattedErrors(card, 'c'), ['c.en: [[device]] x0']);
    card.args[0].filter = 'driver_id=foo';
    assert.deepStrictEqual(titleFormattedErrors(card, 'c'), []);
  });
  it('inferred_button_action compose card carries [[device]] and [[action]] in every language', () => {
    const j = JSON.parse(read('.homeycompose/flow/triggers/inferred_button_action.json'));
    for (const t of Object.values(j.titleFormatted)) { assert.match(t, /\[\[device\]\]/); assert.match(t, /\[\[action\]\]/); }
    assert.deepStrictEqual(titleFormattedErrors(j, 'inferred_button_action'), []);
  });
  it('every app-level compose flow card passes the rule', () => {
    const errs = [];
    for (const kind of ['triggers', 'conditions', 'actions']) {
      const dir = path.join(ROOT, '.homeycompose', 'flow', kind);
      if (!fs.existsSync(dir)) { continue; }
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
        errs.push(...titleFormattedErrors(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), `${kind}/${f}`));
      }
    }
    assert.deepStrictEqual(errs, []);
  });
  it('app.json mirrors the fix and every app.json flow card passes the rule', () => {
    const app = JSON.parse(read('app.json'));
    const errs = [];
    for (const kind of ['triggers', 'conditions', 'actions']) {
      for (const c of (app.flow && app.flow[kind]) || []) { errs.push(...titleFormattedErrors(c, `${kind}/${c.id}`)); }
    }
    assert.deepStrictEqual(errs, []);
    const t = app.flow.triggers.find((c) => c.id === 'inferred_button_action');
    assert.ok(t, 'trigger present in app.json');
    for (const s of Object.values(t.titleFormatted)) { assert.match(s, /\[\[device\]\]/); }
  });
});

const HAS_TS0049 = fs.existsSync(path.join(ROOT, 'lib/tuya/Ts0049Countdown.js'));

describe('P3019b TS0049 countdown report RX (master)', { skip: !HAS_TS0049 }, () => {
  const T = HAS_TS0049 ? require('../../lib/tuya/Ts0049Countdown') : null;
  const report = (secs, type = 0x05) => {
    const b = Buffer.from([0x09, 0x07, 0x0A, 0x00, 0x00, 0x00, type, 0x0B, 0, 0, 0, 0]);
    b.writeUInt32BE(secs, 8);
    return b;
  };
  it('chained listener decodes 0xE001 cmd 0x0A and always calls the next layer', async () => {
    const rootCalls = [];
    const node = { handleFrame: (...a) => { rootCalls.push(a[1]); return 'root'; } };
    const got = [];
    assert.strictEqual(T.attachReportListener(node, (m) => got.push(m)), true);
    assert.strictEqual(await node.handleFrame(1, 0xE001, report(600)), 'root');
    await node.handleFrame(1, 0xE001, { toJSON: () => ({ data: [...report(5400, 0x06)] }) });
    await node.handleFrame(1, 0x0006, report(600));
    await node.handleFrame(1, 0xE001, Buffer.from([1, 2, 3]));
    await node.handleFrame(1, 0xE001, null);
    assert.deepStrictEqual(got, [10, 90]);
    assert.deepStrictEqual(rootCalls, [0xE001, 0xE001, 0x0006, 0xE001, 0xE001]);
  });
  it('re-arming keeps a single listener (tagged chain)', async () => {
    const node = { handleFrame: () => undefined };
    const got = [];
    T.attachReportListener(node, (m) => got.push(['a', m]));
    T.attachReportListener(node, (m) => got.push(['b', m]));
    await node.handleFrame(1, 0xE001, report(60));
    assert.deepStrictEqual(got, [['b', 1]]);
    assert.strictEqual(T.attachReportListener(null, () => {}), false);
  });

  const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
(async () => {
  const V = require('./drivers/water_valve_garden/device.js');
  const mk = (mfr, pid) => { const store = {}; const ev = []; const d = Object.create(V.prototype);
    Object.assign(d, { _store: store, _ev: ev, log() {}, error() {}, getSetting: (k) => ({ zb_manufacturer_name: mfr, zb_model_id: pid })[k],
      getData: () => ({ productId: pid }), getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; }, emit: (n, v) => ev.push([n, v]) });
    return d; };
  const b = Buffer.from([0x09, 1, 0x0A, 0, 0, 0, 0x05, 0x0B, 0, 0, 0, 0]); b.writeUInt32BE(1800, 8);
  const out = {};
  for (const [k, mfr, pid] of [['hz', '_TZ3000_kz1anoi8', 'TS0049'], ['other', '_TZE200_81isopgh', 'TS0601']]) {
    const d = mk(mfr, pid); const sent = []; const node = { handleFrame: () => undefined, sendFrame: async (...a) => sent.push(a) };
    out[k] = { armed: d._armTs0049CountdownReport(node) };
    await node.handleFrame(1, 0xE001, b);
    Object.assign(out[k], { store: d._store, ev: d._ev, sent: sent.length });
  }
  console.log('@@' + JSON.stringify(out)); process.exit(0);
})().catch((e) => { console.log('@@ERR ' + e.stack); process.exit(1); });
`;
  const r = HAS_TS0049 ? spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 60000 }) : { stdout: '' };
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('@@')) || '@@ERR no output ' + (r.stderr || '');
  it('water_valve_garden arms the listener only for the exact couple and never transmits', () => {
    assert.ok(!line.startsWith('@@ERR'), line);
    const out = JSON.parse(line.slice(2));
    assert.strictEqual(out.hz.armed, true);
    assert.strictEqual(out.hz.store.ts0049_countdown_min, 30);
    assert.deepStrictEqual(out.hz.ev, [['irrigation_countdown', 1800]]);
    assert.strictEqual(out.hz.sent, 0);
    assert.strictEqual(out.other.armed, false);
    assert.deepStrictEqual(out.other.store, {});
  });
});

describe('P3019b lint fixes (soil_sensor, water_valve_garden)', () => {
  it('no unused imports / unused debug param / empty catch left', () => {
    const soil = read('drivers/soil_sensor/device.js');
    assert.ok(!/safeParse\s*}/.test(soil.split('\n').slice(0, 12).join('\n')), 'safeParse import removed');
    assert.ok(!/BatteryInference\s*}/.test(soil.split('\n').slice(0, 12).join('\n')), 'BatteryInference import removed');
    assert.ok(!soil.includes('catch (_) {} }'), 'no empty catch');
    const valve = read('drivers/water_valve_garden/device.js');
    assert.match(valve, /_safeTriggerFlow\(triggerId, tokens = \{\}\) \{/);
  });
  it('eslint reports no errors on the touched files', () => {
    let ESLint;
    try { ({ ESLint } = require('eslint')); } catch (_e) { return; }
    const files = ['drivers/soil_sensor/device.js', 'drivers/water_valve_garden/device.js'];
    if (HAS_TS0049) { files.push('lib/tuya/Ts0049Countdown.js'); }
    return new ESLint({ cwd: ROOT }).lintFiles(files.map((f) => path.join(ROOT, f))).then((res) => {
      const errs = res.flatMap((x) => x.messages.filter((m) => m.severity === 2).map((m) => `${path.basename(x.filePath)}:${m.line} ${m.ruleId}`));
      assert.deepStrictEqual(errs, []);
    });
  });
});
