'use strict';

/**
 * P3027 — Tuya case forms that no device sends are left out of the publish manifest.
 *
 * WHY: Homey matches manufacturerName/productId byte-exact and Athom counts every
 * exact string in the mfr x pid cartesian. Exact sources (Z2M 2399 Tuya ids matched
 * with ===, ZHA 530, deCONZ 407, Johan 595, 96 ids from Homey interviews/diags) only
 * show the wire shape "_TZ3000_abcd" / "TS0601". The all-lower / all-upper spellings
 * were minted by scripts (TuyaNormalizer.pairingCaseVariants). They are dropped from
 * the generated manifest when the wire-shaped sibling is there; exact pins, evidence
 * outliers, brands and padded strings stay. Sources and runtime lookup are unchanged.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const ev = require('../../scripts/maintenance/case-variant-evidence.cjs');
const { compactZigbeeIdentifiers } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
const { normalize } = require('../../lib/utils/TuyaNormalizer');
const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');

const ROOT = path.join(__dirname, '..', '..');
const caseless = (m) => {
  const out = new Set();
  for (const d of m.drivers || []) {
    const z = d.zigbee || {};
    for (const a of z.manufacturerName || []) for (const b of z.productId || []) out.add(`${d.id}|${a.trim().toLowerCase()}|${b.trim().toUpperCase()}`);
  }
  return out;
};
const NO_DB = { byMfr: new Map(), byDriver: new Map() };
const drv = (id, m, p) => ({ id, zigbee: { manufacturerName: m, productId: p } });
const run = (drivers, extra = {}) => {
  const manifest = { id: 'com.dlnraja.tuya.zigbee', drivers };
  const r = compactZigbeeIdentifiers(manifest, {
    mfsDb: NO_DB, sacredKeep: [], baseline: null, wireEvidence: [],
    maxTotalCombos: 100000, maxDriverCombos: 100000, maxCaseForms: 3, ...extra,
  });
  return { manifest, r };
};

describe('P3027 never-emitted case forms', () => {
  it('wire shape: upper prefix, suffix as sent (lower or genuine mixed)', () => {
    assert.ok(ev.isWireShapedMfr('_TZ3000_abcd1234'));
    assert.ok(ev.isWireShapedMfr('_TZE284_ogx8u5z6'));
    assert.ok(ev.isWireShapedMfr('_TZ3000_nPGIPl5D'));
    assert.ok(ev.isWireShapedMfr('_TZ3000_12345678'));
    assert.ok(!ev.isWireShapedMfr('_tz3000_abcd1234'));
    assert.ok(!ev.isWireShapedMfr('_TZ3000_ABCD1234'));
    assert.ok(!ev.isWireShapedMfr('_tz3000_ABCD1234'));
    assert.ok(!ev.isTuyaMfr('AOYAN  '));
    assert.ok(!ev.isTuyaMfr('_TZ3000_abcd1234 '));
    assert.ok(ev.isWireShapedPid('TS0601') && ev.isWireShapedPid('TS004F'));
    assert.ok(!ev.isWireShapedPid('ts0601') && !ev.isWireShapedPid('Ts0203'));
  });

  it('drops lower/UPPER spellings only beside the wire-shaped sibling', () => {
    const { kept, dropped } = ev.dropNeverEmittedCaseForms(
      ['_TZ3000_abcd1234', '_tz3000_abcd1234', '_TZ3000_ABCD1234', '_tz3000_only0001', 'HOBEIAN', 'hobeian'],
      'mfr',
    );
    assert.deepStrictEqual(dropped, ['_tz3000_abcd1234', '_TZ3000_ABCD1234']);
    // no wire sibling -> uncertain, kept; brands untouched
    assert.deepStrictEqual(kept, ['_TZ3000_abcd1234', '_tz3000_only0001', 'HOBEIAN', 'hobeian']);
  });

  it('never drops an exact pin or an evidence outlier', () => {
    const keep = new Set(['_TZ3000_ABCD1234', 'ts0601']);
    const m = ev.dropNeverEmittedCaseForms(['_TZ3000_abcd1234', '_TZ3000_ABCD1234', '_tz3000_abcd1234'], 'mfr', keep);
    assert.deepStrictEqual(m.kept, ['_TZ3000_abcd1234', '_TZ3000_ABCD1234']);
    const p = ev.dropNeverEmittedCaseForms(['TS0601', 'ts0601', 'Ts0601'], 'pid', keep);
    assert.deepStrictEqual(p.kept, ['TS0601', 'ts0601']);
    const file = ev.loadWireEvidence();
    assert.ok(file.has('_TZ3000_TS004F') && file.has('_Tz3000_0Zfrhq4I'));
  });

  it('compactor: publish manifest loses the minted forms, counts drop, wire form stays', () => {
    const { manifest, r } = run([
      drv('plug', ['_tz3000_abcd1234', '_TZ3000_ABCD1234', '_TZ3000_abcd1234', 'AOYAN  ', 'AOYAN'], ['ts0601', 'TS0601', 'Ts0601']),
    ]);
    const z = manifest.drivers[0].zigbee;
    assert.deepStrictEqual(z.manufacturerName.filter((v) => v.startsWith('_')), ['_TZ3000_abcd1234']);
    assert.ok(z.manufacturerName.includes('AOYAN  '), 'padded wire form kept (P2941)');
    assert.deepStrictEqual(z.productId, ['TS0601']);
    assert.strictEqual(r.neverEmittedDropped, 4);
  });

  it('compactor: opt-out keeps the old lists', () => {
    const { manifest } = run([drv('plug', ['_tz3000_abcd1234', '_TZ3000_abcd1234'], ['TS0601'])], { dropNeverEmitted: false });
    assert.strictEqual(manifest.drivers[0].zigbee.manufacturerName.length, 2);
  });

  it('compactor: baseline-pinned minted forms stay (P3024b gate)', () => {
    const baseline = { version: 't', drivers: { plug: { m: ['_tz3000_abcd1234'], p: ['TS0601'] } }, exemptions: [] };
    const { manifest, r } = run([drv('plug', ['_tz3000_abcd1234', '_TZ3000_abcd1234', '_TZ3000_ABCD1234'], ['TS0601'])], { baseline });
    const m = manifest.drivers[0].zigbee.manufacturerName;
    assert.ok(m.includes('_tz3000_abcd1234') && m.includes('_TZ3000_abcd1234'));
    assert.ok(!m.includes('_TZ3000_ABCD1234'));
    assert.strictEqual(r.sacredMissing.length, 0);
  });

  it('case cap keeps the wire form first (no lower+UPPER-only group)', () => {
    const { manifest } = run(
      [drv('plug', ['_tz3000_zzzz0001', '_TZ3000_ZZZZ0001', '_TZ3000_zzzz0001'], ['TS0601'])],
      { maxCaseForms: 1, dropNeverEmitted: false },
    );
    assert.deepStrictEqual(manifest.drivers[0].zigbee.manufacturerName, ['_TZ3000_zzzz0001']);
  });

  it('runtime stays caseless: an omitted spelling still resolves', () => {
    const hit = DeviceFingerprintDB.lookup('_tze28c1000000_RZDKN5RX', 'ts0601');
    assert.ok(hit && hit.driver === 'boiler_switch_energy');
  });

  it('read-time normalization: padding, NBSP, invisible chars, fullwidth, variation selectors', () => {
    const want = '_tz3000_abcd1234';
    assert.strictEqual(normalize('  _TZ3000_ABCD1234\u00A0 '), want);
    assert.strictEqual(normalize('_TZ3000_\u200Babcd1234\uFEFF'), want);
    assert.strictEqual(normalize('\uFF3FTZ3000_abcd1234'), want);
    assert.strictEqual(normalize('_TZ3000_abcd1234\uFE0F'), want);
    assert.strictEqual(normalize('PAR16S\u00A0 \tRGBW'), normalize('PAR16S RGBW'));
    assert.strictEqual(normalize('AOYAN  '), 'aoyan');
  });

  it('no-loss guard: a tight cap never costs a caseless couple the old logic kept', () => {
    const drivers = () => [
      drv('a', ['_TZ3000_aaaa0001', '_tz3000_aaaa0001', '_TZ3000_AAAA0001', '_TZ3000_aaaa0002', '_tz3000_aaaa0002'], ['TS0601', 'ts0601', 'TS0001']),
      drv('b', ['_TZE200_bbbb0001', '_TZE200_BBBB0001', 'HOBEIAN', 'hobeian'], ['TS0601', 'ZG-204Z']),
    ];
    const tight = { maxTotalCombos: 8, maxCaseForms: 2 };
    const legacy = run(drivers(), { ...tight, dropNeverEmitted: false, legacyCaseOrder: true, _legacyRun: true });
    const now = run(drivers(), tight);
    const have = caseless(now.manifest);
    for (const k of caseless(legacy.manifest)) assert.ok(have.has(k), `lost ${k}`);
    assert.strictEqual(now.r.noLossLost, 0);
  });

  it('real manifest: omission keeps every caseless couple of the pre-P3027 result, fits the cap', function () {
    if (this && this.timeout) this.timeout(180000);
    const y = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'auto-publish-on-push.yml'), 'utf8');
    const cap = Number(y.match(/HOMEY_ZIGBEE_MAX_TOTAL_COMBOS:\s*"(\d+)"/)[1]);
    const opts = { repoRoot: ROOT, maxTotalCombos: cap, maxDriverCombos: 1500, maxCaseForms: 2 };
    const read = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const oldM = read();
    compactZigbeeIdentifiers(oldM, { ...opts, dropNeverEmitted: false, legacyCaseOrder: true, _legacyRun: true });
    const newM = read();
    const r = compactZigbeeIdentifiers(newM, opts);
    assert.strictEqual(r.noLossFallback, false, 'guard fell back to the old result');
    assert.strictEqual(r.noLossLost, 0);
    assert.ok(r.neverEmittedDropped > 0);
    assert.ok(r.afterTotal <= cap, `combos ${r.afterTotal} > ${cap}`);
    assert.deepStrictEqual(r.sacredMissing, []);
    const have = caseless(newM);
    const lost = [...caseless(oldM)].filter((k) => !have.has(k));
    assert.deepStrictEqual(lost, []);
  });
});
