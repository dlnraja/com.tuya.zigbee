'use strict';
// P2962: KB leads that could not join a family driver without creating a cross-driver duplicate
// now live on small dedicated/variant drivers. One exact manufacturerName+productId couple, one driver.
// Each entry in the fixture records its single reliable source (Z2M / ZHA / deCONZ, commit-pinned).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const app = require('../../app.json');
const SPEC = require('../fixtures/p2962-dedicated-variants.json');
// Exact duplicate couples present before P2962 (documented legacy cases, shrink-only ratchet).
const DUP_BASELINE = 3629;

const couples = () => {
  const m = new Map();
  for (const d of app.drivers) {
    const z = d.zigbee || {};
    for (const f of z.manufacturerName || []) for (const p of z.productId || []) {
      const k = `${f.toLowerCase()}|${p.toLowerCase()}`;
      if (!m.has(k)) m.set(k, new Set());
      m.get(k).add(d.id);
    }
  }
  return m;
};

for (const [id, s] of Object.entries(SPEC)) {
  test(`${id}: exact couples only, sourced, base runtime reused`, () => {
    const d = app.drivers.find((x) => x.id === id);
    assert.ok(d, `${id} in app.json`);
    const want = [];
    for (const m of s.mfr) { want.push(m); if (m.toLowerCase() !== m) want.push(m.toLowerCase()); }
    assert.deepStrictEqual(d.zigbee.manufacturerName, want);
    assert.deepStrictEqual(d.zigbee.productId, s.pid);
    assert.match(s.url, /^https:\/\/github\.com\/.+\/blob\/[0-9a-f]{40}\//, 'commit-pinned source');
    const base = app.drivers.find((x) => x.id === s.base);
    assert.ok(base, `base ${s.base}`);
    assert.deepStrictEqual(d.zigbee.endpoints, base.zigbee.endpoints, 'native pairing clusters of the base');
    assert.deepStrictEqual(d.capabilities, base.capabilities);
    for (const k of Object.keys(d.capabilitiesOptions || {})) assert.ok(d.capabilities.includes(k), `capabilitiesOptions.${k} without capability`);
    const dev = fs.readFileSync(path.join(ROOT, 'drivers', id, 'device.js'), 'utf8');
    assert.match(dev, new RegExp(`require\\('\\.\\./${s.base}/device'\\)`));
    assert.ok(dev.includes(s.url), 'source credited in code');
    for (const img of ['small', 'large']) {
      assert.strictEqual(d.images[img], `/drivers/${id}/assets/images/${img}.png`);
      assert.ok(fs.existsSync(path.join(ROOT, d.images[img])), `${img} image exists`);
    }
    const flow = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.flow.compose.json'), 'utf8'));
    assert.ok(!/\{[a-z_]+\}/i.test(JSON.stringify(flow).replace(/\[\[[a-z_]+\]\]/gi, '')), 'no {arg} placeholders');
    assert.ok(fs.readFileSync(path.join(ROOT, 'CREDITS.md'), 'utf8').includes(id), 'CREDITS.md entry');
  });
}

test('specific driver wins: every P2962 couple (any case) is held by its dedicated driver only', () => {
  const m = couples();
  for (const [id, s] of Object.entries(SPEC)) for (const f of s.mfr) for (const p of s.pid) {
    assert.deepStrictEqual([...m.get(`${f.toLowerCase()}|${p.toLowerCase()}`)], [id], `${f}|${p}`);
  }
});

test('global: no new duplicate couple across drivers (ratchet)', () => {
  const exact = new Map();
  for (const d of app.drivers) {
    const z = d.zigbee || {};
    for (const f of z.manufacturerName || []) for (const p of z.productId || []) {
      const k = `${f}|${p}`;
      if (!exact.has(k)) exact.set(k, new Set());
      exact.get(k).add(d.id);
    }
  }
  const dups = [...exact.values()].filter((v) => v.size > 1).length;
  assert.ok(dups <= DUP_BASELINE, `duplicate couples grew: ${dups} > ${DUP_BASELINE}`);
});

test('driver/device modules are syntactically valid', () => {
  const { execFileSync } = require('child_process');
  for (const id of Object.keys(SPEC)) for (const f of ['driver.js', 'device.js']) {
    execFileSync(process.execPath, ['--check', path.join(ROOT, 'drivers', id, f)]);
  }
});
