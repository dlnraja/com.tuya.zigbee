'use strict';

/**
 * P2692 — Contre quoi for publish heal + energy safety after Bastien pile / diags treat
 * - heobian≡hobeian collision keys (OCR typo must not block Auto-Publish)
 * - no invent brand-as-productId
 * - energy.approximation never coexists with measure_power/meter_power
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2692 publish heal + energy safety', () => {
  it('prune collectCollisions normalizes heobian→hobeian', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/prune-fp-collision-bleed.js'), 'utf8');
    assert.match(src, /norm\(mfr\)/);
    assert.match(src, /heobian≡hobeian|heobian.*hobeian/i);
  });

  it('no driver invents productId HOBEIAN/heobian brand-as-pid', () => {
    const driversDir = path.join(ROOT, 'drivers');
    const bad = [];
    for (const d of fs.readdirSync(driversDir)) {
      const p = path.join(driversDir, d, 'driver.compose.json');
      if (!fs.existsSync(p)) continue;
      let j;
      try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
      const pids = j.zigbee?.productId || [];
      if (pids.some((pid) => /^(hobeian|heobian)$/i.test(String(pid)))) bad.push(d);
    }
    assert.deepStrictEqual(bad, [], `invent brand-as-pid in: ${bad.join(',')}`);
  });

  it('no energy.approximation with measure_power/meter_power', () => {
    const driversDir = path.join(ROOT, 'drivers');
    const bad = [];
    for (const d of fs.readdirSync(driversDir)) {
      const p = path.join(driversDir, d, 'driver.compose.json');
      if (!fs.existsSync(p)) continue;
      let j;
      try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
      const caps = j.capabilities || [];
      const hasPower = caps.includes('measure_power') || caps.includes('meter_power');
      if (hasPower && j.energy?.approximation) bad.push(d);
    }
    assert.deepStrictEqual(bad, [], `energy approx conflict: ${bad.join(',')}`);
  });

  it('curtain_motor must not claim ZG-301Z (switch couple)', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    assert.ok(!(j.zigbee.productId || []).some((p) => String(p).toUpperCase() === 'ZG-301Z'));
    assert.ok((j.zigbee.productId || []).some((p) => /ZG-301Z-MOTO/i.test(String(p))));
  });

  it('prune-fp-collision-bleed --check exits 0', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/prune-fp-collision-bleed.js'), '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
    });
    assert.strictEqual(r.status, 0, r.stderr || r.stdout);
  });
});
