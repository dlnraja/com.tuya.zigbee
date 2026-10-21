'use strict';

/**
 * P2936 cross-research: decision rules, provisional tier gates, promotion/demotion, and a
 * data-driven regression lock on every couple the cross-research placed (one couple = one driver).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const xr = require('../scripts/research/cross-research');
const prov = require('../scripts/research/lib/provisional');

const drv = (o) => new Map(Object.entries(o).map(([d, z]) => [d, { mfrs: new Set(z.m.map((x) => x.toLowerCase())), pids: new Set(z.p) }]));
const look = (couples) => {
  const byCouple = new Map(); const byMfr = new Map();
  for (const r of couples) { for (const m of r.mfrs) { const k = `${m}|${r.pids[0]}`.toLowerCase(); byCouple.set(k, [...(byCouple.get(k) || []), r]); byMfr.set(m.toLowerCase(), [r]); } }
  return { byCouple, byMfr };
};

describe('P2936 cross-research decisions', () => {
  const D = drv({ plug_smart: { m: ['_TZ3000_aaaaaaaa', '_TZ3000_bbbbbbbb'], p: ['TS011F'] }, switch_1gang: { m: ['_TZ3000_cccccccc'], p: ['TS0001', 'TS011F'] }, universal_zigbee: { m: [], p: ['TS011F', 'TS0001', 'TS0601'] } });
  const L = look([{ src: 'z2m', url: 'u', mfrs: ['_TZ3000_newnewne', '_TZ3000_aaaaaaaa', '_TZ3000_bbbbbbbb'], pids: ['TS011F'] }]);

  it('places an exact couple confirmed by a reference on the sibling majority driver', () => {
    const r = xr.decideItem(D, L, { couples: [['_TZ3000_newnewne', 'TS011F', 'forum-post']], mfrsOnly: [], pidsOnly: [] });
    assert.strictEqual(r.verdict, 'place');
    assert.strictEqual(r.couples[0].driver, 'plug_smart');
    assert.ok(r.couples[0].refs.length >= 1);
  });
  it('reports covered when a specific driver already matches the couple', () => {
    const r = xr.decideItem(D, L, { couples: [['_TZ3000_aaaaaaaa', 'TS011F', 'ocr']], mfrsOnly: [], pidsOnly: [] });
    assert.strictEqual(r.verdict, 'covered');
  });
  it('unconfirmed evidence ids go to the provisional tier, never invented', () => {
    const r = xr.decideItem(D, L, { couples: [['_TZ3000_zzzzzzzz', 'TS0001', 'ocr']], mfrsOnly: [], pidsOnly: [] });
    assert.strictEqual(r.verdict, 'provisional');
    assert.ok(r.couples[0].conf < 0.7);
  });
  it('no ids and no candidates is no-action', () => {
    assert.strictEqual(xr.decideItem(D, L, { couples: [], mfrsOnly: [], pidsOnly: [], candidates: [] }).verdict, 'no-action');
  });
  it('keywords pick model tokens, not Tuya productIds', () => {
    const k = xr.keywords('My Moes ZM-104B-M TS0601 thermostat');
    assert.ok(k.models.includes('ZM-104B-M')); assert.ok(!k.models.some((m) => /^TS/.test(m)));
    assert.ok(k.brands.includes('moes')); assert.ok(k.kinds.includes('thermostat'));
  });
  it('provisional gate refuses an mfr already owned by a specific driver (no dual of a sacred couple)', () => {
    assert.match(prov.canProvision(D, '_TZ3000_cccccccc', 'TS0001'), /already on switch_1gang/);
    assert.strictEqual(prov.canProvision(D, '_TZ3000_zzzzzzzz', 'TS0001'), null);
    assert.match(prov.canProvision(D, '_TZ3000_zzzzzzzz', 'TS9999'), /not a native productId/);
    assert.match(prov.canProvision(D, 'garbage', 'TS0001'), /valid/);
  });
  it('place gate refuses a target without the productId or a duplicate couple', () => {
    assert.match(prov.canPlace(D, '_TZ3000_zzzzzzzz', 'TS0001', 'plug_smart'), /has no TS0001/);
    assert.match(prov.canPlace(D, '_TZ3000_cccccccc', 'TS011F', 'plug_smart'), /duplicate/);
    assert.strictEqual(prov.canPlace(D, '_TZ3000_zzzzzzzz', 'TS011F', 'plug_smart'), null);
  });
});

describe('P2936 provisional promotion / demotion', () => {
  function fixture(entries, drivers) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xr-'));
    fs.mkdirSync(path.join(root, 'data/leads'), { recursive: true });
    const app = { drivers: [] };
    for (const [d, z] of Object.entries(drivers)) {
      fs.mkdirSync(path.join(root, 'drivers', d), { recursive: true });
      fs.writeFileSync(path.join(root, 'drivers', d, 'driver.compose.json'), `${JSON.stringify({ zigbee: { manufacturerName: z.m, productId: z.p } }, null, 2)}\n`);
      app.drivers.push({ id: d, zigbee: { manufacturerName: [...z.m], productId: z.p } });
    }
    fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify(app));
    fs.writeFileSync(path.join(root, 'data/leads/provisional-couples.json'), `${JSON.stringify({ entries }, null, 1)}\n`);
    return root;
  }
  const rd = (root, d) => JSON.parse(fs.readFileSync(path.join(root, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee.manufacturerName;
  it('promotes a provisional couple once a reference confirms it, moving it off the generic host', () => {
    const root = fixture([{ mfr: '_TZ3000_newnewne', pid: 'TS011F', status: 'provisional' }],
      { plug_smart: { m: ['_TZ3000_aaaaaaaa'], p: ['TS011F'] }, universal_zigbee: { m: ['_TZ3000_newnewne'], p: ['TS011F'] } });
    const L = look([{ src: 'z2m', url: 'u', mfrs: ['_TZ3000_newnewne', '_TZ3000_aaaaaaaa'], pids: ['TS011F'] }]);
    assert.deepStrictEqual(prov.promoteDemote(root, L, true), { promoted: 1, demoted: 0 });
    assert.ok(rd(root, 'plug_smart').includes('_TZ3000_newnewne'));
    assert.ok(!rd(root, 'universal_zigbee').includes('_TZ3000_newnewne'));
  });
  it('demotes (keeps the record) when a specific driver now owns the manufacturerName', () => {
    const root = fixture([{ mfr: '_TZ3000_newnewne', pid: 'TS011F', status: 'provisional' }],
      { plug_smart: { m: ['_TZ3000_newnewne'], p: ['TS011F'] }, universal_zigbee: { m: ['_TZ3000_newnewne'], p: ['TS011F'] } });
    assert.deepStrictEqual(prov.promoteDemote(root, look([]), true), { promoted: 0, demoted: 1 });
    const p = JSON.parse(fs.readFileSync(path.join(root, 'data/leads/provisional-couples.json'), 'utf8'));
    assert.strictEqual(p.entries[0].status, 'demoted'); assert.ok(p.entries[0].reason);
    assert.ok(!rd(root, 'universal_zigbee').includes('_TZ3000_newnewne'));
  });
});

describe('P2936 regression lock on placed and provisional couples', () => {
  const ROOT = path.join(__dirname, '..');
  const D = xr.driverIndex();
  const AF = path.join(ROOT, 'data/leads/auto-applied.json');
  const applied = ((fs.existsSync(AF) ? JSON.parse(fs.readFileSync(AF, 'utf8')) : {}).applied || []).filter((a) => a.via === 'cross-research');
  it('every cross-research couple lives on its target driver and on no other specific driver', () => {
    for (const a of applied) {
      const owners = xr.coveredBy(D, a.mfr, a.pid).filter((d) => !prov.HOSTS.includes(d));
      assert.ok(owners.includes(a.driver), `${a.mfr}|${a.pid} missing on ${a.driver}`);
      assert.strictEqual(owners.length, 1, `${a.mfr}|${a.pid} on ${owners.join(', ')}`);
      assert.ok(a.refs && a.refs.length, `${a.mfr} has no source`);
    }
  });
  it('every active provisional couple is hosted only by the generic driver', () => {
    const f = path.join(ROOT, 'data/leads/provisional-couples.json');
    const P = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).entries : [];
    for (const e of P.filter((x) => x.status === 'provisional')) {
      const owners = [...D.entries()].filter(([, z]) => z.mfrs.has(e.mfr.toLowerCase())).map(([d]) => d);
      assert.deepStrictEqual(owners, [e.host], `${e.mfr} owners ${owners}`);
      assert.ok(e.evidence, `${e.mfr} has no evidence`);
    }
  });
});
