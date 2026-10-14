'use strict';

/**
 * Contre quoi (P2815 / user: couple mfr+pid):
 * Soil identity is (manufacturerName, productId) — never mfr-only, never invent
 * cartesian phantoms (HOBEIAN+TS0601, AOYAN+TS0601, myd45weu+ZG-303Z).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SSOT = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'soil-sensor-couples-ssot.json'), 'utf8'),
);
const { normalizeSacredCouple } = require('../../tools/ci/sacred-couple-pair');

describe('P2815 soil couples SSOT (mfr+pid)', () => {
  it('normalizes QT-07S / AOYAN / HOBEIAN soil couples', () => {
    assert.ok(normalizeSacredCouple('_TZE284_myd45weu', 'TS0601'));
    assert.ok(normalizeSacredCouple('AOYAN', 'AY-303Z'));
    assert.ok(normalizeSacredCouple('HOBEIAN', 'ZG-303Z'));
    assert.ok(normalizeSacredCouple('COOLO', 'CS-201Z'));
  });

  it('SSOT lists verified couples and forbids phantoms', () => {
    const v = SSOT.verifiedCouples || [];
    assert.ok(v.some((c) => /myd45weu/i.test(c.mfr) && /^TS0601$/i.test(c.pid)));
    assert.ok(v.some((c) => /^AOYAN$/i.test(c.mfr) && /^AY-303Z$/i.test(c.pid)));
    assert.ok(v.some((c) => /^HOBEIAN$/i.test(c.mfr) && /^ZG-303Z$/i.test(c.pid)));
    const phantoms = SSOT.forbiddenPhantoms || [];
    assert.ok(phantoms.some((c) => /^HOBEIAN$/i.test(c.mfr) && /^TS0601$/i.test(c.pid)));
    assert.ok(phantoms.some((c) => /^AOYAN$/i.test(c.mfr) && /^TS0601$/i.test(c.pid)));
  });

  it('gate script exits 0', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'ci', 'p2815-soil-couple-ssot-gate.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});
