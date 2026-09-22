'use strict';

/**
 * P2675 — Max curated fingerprint coverage under P2674 pressure boot
 *
 * Contre quoi:
 * - Curated data/fingerprints.json stays thin (only ~82 keys) after OOM harden
 * - Sacred-keep couples absent from curated → Unknown under heap critical
 * - Enrich script missing / would exceed 200KB pressure budget
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const CURATED = path.join(ROOT, 'data', 'fingerprints.json');
const KEEP = path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json');
const SCRIPT = path.join(ROOT, 'tools', 'ci', 'p2675-curated-fingerprint-sacred-enrich.js');

describe('P2675 curated sacred-keep coverage (max variants under pressure)', () => {
  it('curated fingerprints cover 100+ mfrs and stay under pressure budget', () => {
    const st = fs.statSync(CURATED);
    assert.ok(st.size < 200 * 1024, `curated ${st.size} must stay <200KB`);
    const curated = JSON.parse(fs.readFileSync(CURATED, 'utf8'));
    assert.ok(Object.keys(curated).length >= 200, 'deep coverage after sacred-keep union');
  });

  it('high-value sacred couples present in curated (case-insensitive)', () => {
    const curated = JSON.parse(fs.readFileSync(CURATED, 'utf8'));
    const keys = Object.keys(curated).map((k) => k.toLowerCase());
    const must = [
      ['_tze284_m1cvyneb', 'wall_dimmer_tuya'],
      ['_tze204_gkfbdvyx', 'presence_sensor_radar'],
      ['_tz3000_famkxci2', 'button_wireless_3'],
      ['_tz3000_mrpevh8p', 'button_wireless_1'],
      ['_tze200_icka1clh', 'curtain_motor'],
    ];
    for (const [mfr, driver] of must) {
      assert.ok(keys.includes(mfr), `missing curated ${mfr}`);
      const entry = curated[Object.keys(curated).find((k) => k.toLowerCase() === mfr)];
      assert.equal(entry.driverId, driver, `${mfr} → ${driver}`);
    }
  });

  it('p2675 enrich --check exits 0', () => {
    const r = spawnSync(process.execPath, [SCRIPT, '--check'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  });

  it('package.json wires check:p2675', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2675']);
  });

  it('presence ceiling config lists TZE284 sibling variants (P2675)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers', 'presence_sensor_radar', 'configs.js'),
      'utf8',
    );
    assert.ok(src.includes("_TZE284_ya4ft0w4"));
    assert.ok(src.includes("_TZE284_laokfqwu"));
  });
});
