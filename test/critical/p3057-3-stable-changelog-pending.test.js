'use strict';
/**
 * P3057-3: stable keeps a pre-written 5.12.508 changelog entry (pending next patch) above the committed
 * 5.12.507; the publish-time helpers keep it instead of overwriting it, and no bump happens here.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const next = (v) => { const m = v.split('.').map(Number); return `${m[0]}.${m[1]}.${m[2] + 1}`; };

describe('P3057-3 stable pending changelog entry', () => {
  const app = readJson('app.json');
  const cl = readJson('.homeychangelog.json');

  it('the committed version and the next patch both have a non-empty en + fr entry', () => {
    for (const v of [app.version, next(app.version)]) {
      assert.ok(cl[v] && String(cl[v].en || '').trim(), `missing en for ${v}`);
    }
    assert.ok(String(cl[next(app.version)].fr || '').trim(), 'pending entry has fr');
  });

  it('nothing beyond the next patch is pre-written', () => {
    const [M, m, p] = app.version.split('.').map(Number);
    for (const k of Object.keys(cl)) {
      const x = k.split('.').map(Number);
      if (x.length === 3 && x[0] === M && x[1] === m) {assert.ok(x[2] <= p + 1, `${k} is too far ahead`);}
    }
  });

  it('ensure-next-changelog.js keeps the pre-written text (adds nothing)', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p3057-3c-'));
    fs.copyFileSync(path.join(ROOT, 'app.json'), path.join(d, 'app.json'));
    fs.copyFileSync(path.join(ROOT, '.homeychangelog.json'), path.join(d, '.homeychangelog.json'));
    const r = spawnSync(process.execPath, [path.join(ROOT, '.github/scripts/ensure-next-changelog.js')], { cwd: d, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: '' } });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /added=none/);
    const after = JSON.parse(fs.readFileSync(path.join(d, '.homeychangelog.json'), 'utf8'));
    assert.deepEqual(after[next(app.version)], cl[next(app.version)]);
  });

  it('the stable bump keeps a non-empty entry for the version it writes', () => {
    const src = fs.readFileSync(path.join(ROOT, '.github/scripts/stable-version-bump.js'), 'utf8');
    // P3075: the pending seed of the previous bump is also refilled from our commits.
    assert.match(src, /if \(!j\[v\] \|\| !String\(j\[v\]\.en \|\| ''\)\.trim\(\)( \|\| isPendingSeed\(j\[v\]\))?\)/);
  });
});
