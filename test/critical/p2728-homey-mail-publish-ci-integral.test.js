'use strict';
/**
 * P2728 — Homey mail + Unified CI integral publish heal
 *
 * Contre quoi (Gmail 2026-09-24/25 + Unified CI #36077719250):
 *  1) fp-collision-check must heobian≡hobeian like prune (else 200+ false NEW)
 *  2) publish-ssot documents Bastien PF classes (socket / invalid_state / missing SVG)
 *  3) dual-app tipHealthy not stale vs Athom tip emails
 *
 * Dual-app: BOTH (CI path) + Bastien house tip-lag note in bastien-house-ssot
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2728 Homey mail + publish CI integral', () => {
  it('fp-collision-check.js applies heobian→hobeian and exits 0 vs baseline', () => {
    const src = fs.readFileSync(path.join(ROOT, '.github/scripts/fp-collision-check.js'), 'utf8');
    assert.ok(src.includes('P2728'), 'must document P2728');
    assert.ok(/function normMfr/.test(src), 'must define normMfr');
    assert.ok(/heobian/.test(src) && /hobeian/.test(src), 'must map heobian→hobeian');
    const r = spawnSync(
      process.execPath,
      [
        path.join(ROOT, '.github/scripts/fp-collision-check.js'),
        '--baseline',
        path.join(ROOT, '.github/fingerprint-collision-baseline.json'),
      ],
      { cwd: ROOT, encoding: 'utf8', timeout: 180000 },
    );
    assert.strictEqual(r.status, 0, `fp-collision-check failed:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout || '', /new:\s*0|,\s*0 new/i);
  });

  it('publish-ssot locks Bastien Athom PF classes from tip emails', () => {
    const ssot = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-ssot.json'), 'utf8'));
    const flood = ssot.p139?.gmailFlood2026_09_24_25;
    assert.ok(flood, 'must record 2026-09-24/25 Homey tip flood');
    assert.ok(
      (flood.bastienFailedClasses || []).includes('socket hang up')
      && (flood.bastienFailedClasses || []).includes('invalid_state')
      && (flood.bastienFailedClasses || []).some((c) => /distance\.svg|missing asset/i.test(c)),
      'must list Bastien PF classes from Homey mails #105–#107',
    );
    assert.ok(flood.recovered && flood.recovered.bastien, 'must record Bastien recovered tip');
    assert.ok(ssot.p2728?.fpCollisionHeobianNorm, 'must lock P2728 CI path');
  });

  it('dual-app tipHealthy matches recent Athom testing emails (floor)', () => {
    const tracks = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/dual-app-tracks.json'), 'utf8'));
    const u = tracks.tracks.master.tipHealthy;
    const b = tracks.tracks.bastien.tipHealthy;
    const s = tracks.tracks.stable.tipHealthy;
    // Floor only — tips may bump higher; Contre quoi stale 1.0.83 / 9.0.1215
    const um = String(u).match(/^9\.0\.(\d+)$/);
    const bm = String(b).match(/^1\.0\.(\d+)$/);
    const sm = String(s).match(/^5\.12\.(\d+)$/);
    assert.ok(um && Number(um[1]) >= 1242, `Universal tipHealthy stale: ${u}`);
    assert.ok(bm && Number(bm[1]) >= 99, `Bastien tipHealthy stale: ${b}`);
    assert.ok(sm && Number(sm[1]) >= 336, `Stable tipHealthy stale: ${s}`);
  });
});
