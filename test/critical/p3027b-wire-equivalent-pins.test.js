'use strict';

/**
 * P3027b — opt-in: a pinned minted case form of the 9.0.1574 fixture may be
 * pinned through its wire spelling (HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT=1).
 *
 * WHY: the P3024b fixture pins 13998 exact couples, many of them on minted
 * spellings (_tz3000_x / ts0601) that no device sends; they block the P3027
 * omission. The fixture keeps every pinned string (additive); wireEquivalents
 * only records the wire spelling already present in the same driver. Default
 * off: output must be identical to P3027 until the soak upload enables it.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const ev = require('../../scripts/maintenance/case-variant-evidence.cjs');
const { buildWireEquivalents, wireEquivalentEnabled } = require('../../scripts/maintenance/build-wire-equivalents.cjs');
const { compactZigbeeIdentifiers, loadPublishBaseline } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
const { checkBaseline } = require('../../scripts/maintenance/publish-baseline-gate.cjs');

const ROOT = path.join(__dirname, '..', '..');
const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'athom-last-test-package-couples.json');
const NO_DB = { byMfr: new Map(), byDriver: new Map() };
const caseless = (m) => {
  const out = new Set();
  for (const d of m.drivers || []) {
    const z = d.zigbee || {};
    for (const a of z.manufacturerName || []) for (const b of z.productId || []) out.add(`${d.id}|${a.trim().toLowerCase()}|${b.trim().toUpperCase()}`);
  }
  return out;
};
const synthetic = () => ({
  id: 'com.dlnraja.tuya.zigbee',
  drivers: [{ id: 'plug', zigbee: { manufacturerName: ['_TZ3000_abcd1234', '_tz3000_abcd1234'], productId: ['TS011F', 'ts011f'] } }],
});
const synthBaseline = () => ({
  version: 't', drivers: { plug: { m: ['_tz3000_abcd1234'], p: ['ts011f'] } }, exemptions: [],
  wireEquivalents: { drivers: { plug: { m: { _tz3000_abcd1234: '_TZ3000_abcd1234' }, p: { ts011f: 'TS011F' } } } },
});
const runSynth = (extra) => {
  const m = synthetic();
  const b = synthBaseline();
  const r = compactZigbeeIdentifiers(m, {
    mfsDb: NO_DB, sacredKeep: [], baseline: b, wireEvidence: [],
    maxTotalCombos: 1000, maxDriverCombos: 1000, maxCaseForms: 3, ...extra,
  });
  return { m, b, r };
};

describe('P3027b wire-equivalent pins (opt-in, default off)', () => {
  it('flag is off by default and only "1" turns it on', () => {
    const prev = process.env.HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT;
    try {
      delete process.env.HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT;
      assert.strictEqual(wireEquivalentEnabled({}), false);
      process.env.HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT = 'true';
      assert.strictEqual(wireEquivalentEnabled({}), false);
      process.env.HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT = '1';
      assert.strictEqual(wireEquivalentEnabled({}), true);
      assert.strictEqual(wireEquivalentEnabled({ pinWireEquivalent: false }), false);
    } finally {
      if (prev === undefined) delete process.env.HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT;
      else process.env.HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT = prev;
    }
  });

  it('no workflow enables it yet (soak upload decides)', () => {
    const dir = path.join(ROOT, '.github', 'workflows');
    for (const f of fs.readdirSync(dir)) {
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      assert.ok(!/HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT\s*[:=]\s*['"]?1/.test(t), `${f} enables P3027b`);
    }
  });

  it('fixture is additive: pinned strings unchanged, every equivalent is real and wire-shaped', () => {
    const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const src = new Map(app.drivers.filter((d) => d.zigbee).map((d) => [d.id, d.zigbee]));
    const outliers = ev.loadWireEvidence(ROOT);
    assert.ok(fx.wireEquivalents && fx.wireEquivalents.drivers, 'wireEquivalents missing');
    let n = 0;
    for (const [id, e] of Object.entries(fx.wireEquivalents.drivers)) {
      const pinned = fx.drivers[id];
      assert.ok(pinned, `${id} not in fixture`);
      const z = src.get(id) || {};
      for (const [minted, wire] of Object.entries(e.m || {})) {
        n += 1;
        assert.ok(pinned.m.includes(minted), `${id}: ${minted} not pinned`);
        assert.ok(!ev.isWireShapedMfr(minted) && ev.isWireShapedMfr(wire), `${id}: ${minted}->${wire}`);
        assert.strictEqual(minted.toLowerCase(), wire.toLowerCase());
        assert.ok(!outliers.has(minted), `${minted} is an evidence outlier`);
        assert.ok(pinned.m.includes(wire) || (z.manufacturerName || []).includes(wire), `${id}: ${wire} invented`);
      }
      for (const [minted, wire] of Object.entries(e.p || {})) {
        n += 1;
        assert.ok(pinned.p.includes(minted), `${id}: ${minted} not pinned`);
        assert.ok(!ev.isWireShapedPid(minted) && ev.isWireShapedPid(wire), `${id}: ${minted}->${wire}`);
        assert.strictEqual(minted.toUpperCase(), wire);
        assert.ok(pinned.p.includes(wire) || (z.productId || []).includes(wire), `${id}: ${wire} invented`);
      }
    }
    assert.ok(n > 0);
    assert.strictEqual(fx.wireEquivalents.mfr + fx.wireEquivalents.pid, n);
    assert.deepStrictEqual(buildWireEquivalents(fx, app, outliers), fx.wireEquivalents,
      'stale: run node scripts/maintenance/build-wire-equivalents.cjs');
  });

  it('builder skips ambiguous keys and outliers', () => {
    const fx = { drivers: { d: { m: ['_tz3000_aaaa1111', '_tz3000_bbbb2222', '_tz3000_cccc3333'], p: ['TS0601'] } } };
    const app = { drivers: [{ id: 'd', zigbee: { manufacturerName: ['_TZ3000_aaaa1111', '_TZ3000_bbbb2222', '_TZ3000_BBbb2222', '_TZ3000_cccc3333'], productId: ['TS0601'] } }] };
    const r = buildWireEquivalents(fx, app, new Set(['_tz3000_cccc3333']));
    assert.deepStrictEqual(r.drivers, { d: { m: { _tz3000_aaaa1111: '_TZ3000_aaaa1111' } } });
  });

  it('off: minted pin kept, gate exact; on: wire pin, minted omitted, gate passes only with the flag', () => {
    const off = runSynth({ pinWireEquivalent: false });
    const z0 = off.m.drivers[0].zigbee;
    assert.ok(z0.manufacturerName.includes('_tz3000_abcd1234'));
    assert.ok(z0.productId.includes('ts011f'));
    assert.deepStrictEqual(checkBaseline(off.m, off.b, { pinWireEquivalent: false }).missing, []);

    const on = runSynth({ pinWireEquivalent: true });
    const z1 = on.m.drivers[0].zigbee;
    assert.deepStrictEqual(z1.manufacturerName, ['_TZ3000_abcd1234']);
    assert.deepStrictEqual(z1.productId, ['TS011F']);
    assert.deepStrictEqual(on.r.sacredMissing, []);
    assert.strictEqual(checkBaseline(on.m, on.b, { pinWireEquivalent: false }).missing.length, 1);
    const g = checkBaseline(on.m, on.b, { pinWireEquivalent: true });
    assert.deepStrictEqual(g.missing, []);
    assert.strictEqual(g.viaEquivalent, 1);
  });

  it('gate: equivalence follows the P3024b rule (a couple may move driver) but never another pid or an unrecorded spelling', () => {
    const b = synthBaseline();
    const moved = { drivers: [{ id: 'bulb', zigbee: { manufacturerName: ['_TZ3000_abcd1234'], productId: ['TS011F'] } }] };
    assert.deepStrictEqual(checkBaseline(moved, b, { pinWireEquivalent: true }).missing, []);
    const pid = { drivers: [{ id: 'plug', zigbee: { manufacturerName: ['_TZ3000_abcd1234'], productId: ['TS0001'] } }] };
    assert.strictEqual(checkBaseline(pid, b, { pinWireEquivalent: true }).missing.length, 1);
    const spelling = { drivers: [{ id: 'plug', zigbee: { manufacturerName: ['_TZ3000_ABCD1234'], productId: ['TS011F'] } }] };
    assert.strictEqual(checkBaseline(spelling, b, { pinWireEquivalent: true }).missing.length, 1);
  });

  it('real tree, flag on: fits the cap, no pin missing, no caseless loss vs flag off, gate passes with equivalence', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'auto-publish-on-push.yml'), 'utf8');
    const cap = Number((wf.match(/HOMEY_ZIGBEE_MAX_TOTAL_COMBOS:\s*"(\d+)"/) || [])[1]);
    const read = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const mOff = read();
    const rOff = compactZigbeeIdentifiers(mOff, { maxTotalCombos: cap, pinWireEquivalent: false, verbose: false });
    const mOn = read();
    const rOn = compactZigbeeIdentifiers(mOn, { maxTotalCombos: cap, pinWireEquivalent: true, verbose: false });
    assert.strictEqual(rOn.pinWireEquivalent, true);
    assert.strictEqual(rOn.noLossFallback, false);
    assert.strictEqual(rOn.noLossLost, 0);
    assert.deepStrictEqual(rOn.sacredMissing, []);
    assert.ok(rOn.afterTotal <= cap, `${rOn.afterTotal} > ${cap}`);
    const kOff = caseless(mOff);
    const kOn = caseless(mOn);
    const lost = [...kOff].filter((k) => !kOn.has(k));
    assert.deepStrictEqual(lost.slice(0, 10), []);
    assert.ok(kOn.size > kOff.size, `${kOn.size} <= ${kOff.size}`);
    const b = loadPublishBaseline(ROOT);
    assert.deepStrictEqual(checkBaseline(mOn, b, { pinWireEquivalent: true }).missing.slice(0, 10), []);
    assert.deepStrictEqual(checkBaseline(mOff, b, { pinWireEquivalent: false }).missing.slice(0, 10), []);
  });
});
