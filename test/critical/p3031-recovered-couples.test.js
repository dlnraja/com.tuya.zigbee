'use strict';

/**
 * P3031 — recovered historical exact couples (2026-10-25)
 *
 * Contre quoi:
 * - Exact mfr×pid couples attested by a noted source (Z2M/ZHA/deCONZ/Blakadder/Johan/history)
 *   silently lost from driver.compose.json by bulk rewrites
 * - Re-adding a couple into a second driver (one couple = one driver)
 * - Re-adding a couple that a curated removal deliberately took out
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const LEADS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/leads/p3031-recovered-couples.json'), 'utf8'));
const BRANCH = LEADS.branch;
const RESTORED = LEADS.branches[BRANCH].restored;

function asList(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
const lc = (s) => String(s).toLowerCase();

const drivers = {};
for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(f)) continue;
  const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
  drivers[d] = { m: new Set(asList(z.manufacturerName).map(lc)), p: new Set(asList(z.productId).map(lc)) };
}

describe(`P3031 recovered couples (${BRANCH})`, () => {
  it('has a non-empty restored list with a noted source per couple', () => {
    assert.ok(RESTORED.length > 0);
    for (const r of RESTORED) assert.ok(Array.isArray(r.sources) && r.sources.length > 0, `${r.mfr}/${r.pid} has no source`);
  });

  for (const r of RESTORED) {
    it(`${r.mfr} × ${r.pid} → ${r.driver} only`, () => {
      const own = drivers[r.driver];
      assert.ok(own, `driver ${r.driver} missing`);
      assert.ok(own.m.has(lc(r.mfr)), `${r.mfr} not in ${r.driver}`);
      assert.ok(own.p.has(lc(r.pid)), `${r.pid} not in ${r.driver}`);
      const others = Object.entries(drivers)
        .filter(([d, v]) => d !== r.driver && v.m.has(lc(r.mfr)) && v.p.has(lc(r.pid)))
        .map(([d]) => d);
      assert.deepEqual(others, [], `${r.mfr}/${r.pid} also owned by ${others.join(',')}`);
    });
  }

  it('no restored couple hits a curated removal', () => {
    const f = path.join(ROOT, 'config/architecture/curated-couple-removals.json');
    if (!fs.existsSync(f)) return;
    const cur = JSON.parse(fs.readFileSync(f, 'utf8')).removals || [];
    for (const r of RESTORED) {
      for (const x of cur) {
        const hit = x.driver === r.driver && asList(x.mfr).map(lc).includes(lc(r.mfr));
        assert.ok(!hit, `${r.mfr} re-added to ${r.driver} despite curated removal`);
      }
    }
  });

  it('kept-removed couples stay out of their pruned drivers', () => {
    for (const mfr of ['_tz3000_hktqahrq', '_tze200_bq5c8xfe']) {
      for (const [d, v] of Object.entries(drivers)) {
        if (v.m.has(mfr) && v.p.has('ts0202')) assert.fail(`${mfr}/TS0202 re-added to ${d}`);
      }
    }
  });
});

describe(`P3031 DP catalog enrichment (${BRANCH})`, () => {
  const keys = LEADS.dpEnriched || [];
  it('enriched couples are sourced in dp_couple_knowledge and present in the shipped catalog', () => {
    if (!keys.length) return;
    const know = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dp_couple_knowledge.json'), 'utf8')).couples;
    const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/zigbee/data/unknown-dp-catalog.json'), 'utf8'));
    for (const k of keys) {
      assert.ok(know[k] && know[k].sources && know[k].sources.length, `${k} missing sourced knowledge`);
      for (const info of Object.values(know[k].dps)) assert.equal(info.capability, null, `${k} must stay names-only`);
      const [m, p] = k.split('|');
      assert.ok(cat.idx[`${m.toLowerCase()}|${p.toUpperCase()}`] !== undefined, `${k} not in unknown-dp-catalog`);
    }
  });
});
