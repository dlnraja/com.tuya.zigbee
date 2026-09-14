'use strict';

/**
 * P2495 — Contre quoi: publish CI/CD drifts from couple-native discoveries
 * (sacred-keep, soft-expect, family gates, prepare-publish preflight).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

describe('P2495 publish CI/CD path', () => {
  it('publish-ssot lists prePublish family + check:publish', () => {
    const ssot = readJson('config/architecture/publish-ssot.json');
    assert.ok(ssot.gates?.prePublish?.includes('npm run check:publish'));
    assert.ok(ssot.gates.prePublish.some((g) => g.includes('check:p249x')));
    assert.equal(ssot.sacredKeep.coupleSsot, 'config/architecture/sacred-couple-ssot.json');
    assert.equal(ssot.p139.doNotSpamRepublish, true);
    assert.ok(ssot.identity?.rule);
  });

  it('package.json exposes check:publish + check:p2495', () => {
    const pkg = readJson('package.json');
    assert.ok(pkg.scripts['check:publish']);
    assert.ok(pkg.scripts['check:p2495']);
    assert.match(pkg.scripts['check:p249x'], /check:p2495/);
  });

  it('prepare-publish preflights sacred-keep (P2495)', () => {
    const src = read('scripts/prepare-publish.js');
    assert.match(src, /validateSacredKeepPins/);
    assert.match(src, /sacred-couple-pair/);
    assert.match(src, /icka1clh/);
  });

  it('auto-publish + auto-fix hard-wire families and check:publish', () => {
    for (const f of [
      '.github/workflows/auto-publish-on-push.yml',
      '.github/workflows/auto-fix-and-publish.yml',
    ]) {
      const t = read(f);
      for (const g of ['check:p244x', 'check:p246x', 'check:p248x', 'check:p249x', 'check:publish']) {
        assert.ok(t.includes(g), `${f} missing ${g}`);
      }
      assert.match(t, /AI_FORCE_LOCAL/);
    }
  });

  it('continuous-flow soft-wires publish path', () => {
    const t = read('.github/workflows/continuous-flow.yml');
    assert.ok(t.includes('check:publish') || t.includes('check:p249x'));
  });

  it('p2495 gate script exits 0', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/p2495-publish-path-gate.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /PASS/);
  });
});
