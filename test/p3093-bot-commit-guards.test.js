'use strict';
/* eslint-env mocha */
// P3093: #557 auto-enrich re-added a curated removal (_TZE200_vrcfo4i0 off contact_sensor, P2759) and its commit
// was refused; every committing bot now runs scripts/ci/bot-commit-guard.sh (P3086 drift + P3089 moves).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = global.describe ? global : require('node:test');

const ROOT = path.join(__dirname, '..');

describe('P3093 bot commit guards', () => {
  it('the incomplete-enrich placer refuses curated removals, case-insensitive', () => {
    const { isForbiddenPlacement } = require('../tools/ci/infer-enrich-from-incomplete');
    assert.strictEqual(isForbiddenPlacement('_tze200_vrcfo4i0', 'contact_sensor'), true);
    assert.strictEqual(isForbiddenPlacement('_TZ3000_p3093none', 'contact_sensor'), false);
  });
  it('every workflow line that runs git commit is preceded by the bot commit guard', () => {
    const dir = path.join(ROOT, '.github/workflows');
    const missing = [];
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.yml'))) {
      const L = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
      L.forEach((l, i) => {
        if (/^\s*(git (-c \S+ )*commit\b|git checkout -b "\$b" && git commit)/.test(l) && !/bot-commit-guard/.test(L[i - 1] || '')) missing.push(`${f}:${i + 1}`);
      });
    }
    assert.deepStrictEqual(missing, []);
    assert.ok(fs.existsSync(path.join(ROOT, 'scripts/ci/bot-commit-guard.sh')));
  });
  it('homey-validate-safe.sh restores app.json and keeps validate exit code', () => {
    const os = require('os');
    const { spawnSync } = require('child_process');
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p3093v-'));
    fs.mkdirSync(path.join(d, 'bin'));
    fs.writeFileSync(path.join(d, 'bin', 'npx'), '#!/bin/sh\necho changed > app.json\nmkdir -p .homeybuild\nexit 3\n', { mode: 0o755 });
    fs.writeFileSync(path.join(d, 'app.json'), '{"v":1}');
    const r = spawnSync('bash', [path.join(ROOT, 'scripts/ci/homey-validate-safe.sh'), '--level', 'publish'],
      { cwd: d, env: { ...process.env, PATH: `${path.join(d, 'bin')}:${process.env.PATH}` } });
    assert.strictEqual(r.status, 3);
    assert.strictEqual(fs.readFileSync(path.join(d, 'app.json'), 'utf8'), '{"v":1}');
    assert.strictEqual(fs.existsSync(path.join(d, '.homeybuild')), false);
  });
});
