'use strict';
const { describe, it, beforeEach, afterEach } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const idx = require('../../scripts/ci/homey-app-diag-index');

const ROOT = path.join(__dirname, '..', '..');
const uuid = (i) => `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`;

describe('P3088 homey-app-diag folder + bounded index', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3088-')); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('creates the folder, .gitkeep and an empty index when nothing was fetched', () => {
    const d = path.join(dir, 'homey-app-diag');
    idx.run(d);
    assert.ok(fs.existsSync(path.join(d, '.gitkeep')));
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(d, 'index.json'), 'utf8')).count, 0);
  });

  it('prunes to MAX_FILES reports and keeps no stack or payload in the index', () => {
    for (let i = 0; i < idx.MAX_FILES + 7; i++) {
      const p = path.join(dir, `${uuid(i)}.sanitized.json`);
      fs.writeFileSync(p, JSON.stringify({ found: true, version: '9.0.1604', fetchedAt: new Date(1e12 + i * 1000).toISOString(), stack: 'SECRET', payload: { x: 1 } }));
      fs.writeFileSync(path.join(dir, `${uuid(i)}.json`), '{}');
      fs.utimesSync(p, 1e9 + i, 1e9 + i);
      fs.utimesSync(path.join(dir, `${uuid(i)}.json`), 1e9 + i, 1e9 + i);
    }
    const r = idx.run(dir);
    assert.strictEqual(r.pruned, 7);
    const left = fs.readdirSync(dir).filter((f) => f.endsWith('.sanitized.json'));
    assert.strictEqual(left.length, idx.MAX_FILES);
    assert.ok(!left.includes(`${uuid(0)}.sanitized.json`), 'oldest pruned');
    const raw = fs.readFileSync(path.join(dir, 'index.json'), 'utf8');
    assert.ok(Buffer.byteLength(raw) <= idx.MAX_INDEX_BYTES);
    assert.ok(!/SECRET|payload/.test(raw));
  });

  it('ignores non-uuid files and does not rewrite an unchanged index', () => {
    fs.writeFileSync(path.join(dir, 'evil.json'), '{}');
    idx.run(dir);
    const p = path.join(dir, 'index.json');
    fs.utimesSync(p, 1, 1);
    idx.run(dir);
    assert.strictEqual(fs.statSync(p).mtimeMs, 1000);
    assert.strictEqual(JSON.parse(fs.readFileSync(p, 'utf8')).count, 0);
  });

  it('the folder stays untracked (security scanner: no .github/state in git)', () => {
    const ci = (f) => { try { execFileSync('git', ['check-ignore', '-q', f], { cwd: ROOT }); return true; } catch { return false; } };
    assert.strictEqual(ci('.github/state/homey-app-diag/index.json'), true);
    assert.strictEqual(ci(`.github/state/homey-app-diag/${uuid(1)}.sanitized.json`), true);
  });

  it('fetch-diags passes HOMEY_REFRESH_TOKEN, runs the index and persists it via cache + artifact', () => {
    const y = fs.readFileSync(path.join(ROOT, '.github/workflows/fetch-diags.yml'), 'utf8');
    assert.match(y, /HOMEY_REFRESH_TOKEN: \$\{\{ secrets\.HOMEY_REFRESH_TOKEN \}\}[\s\S]*inbox-diag-uuid-harvest/);
    assert.match(y, /HOMEY_PAT:-\}\$\{HOMEY_REFRESH_TOKEN:-\}/);
    assert.match(y, /homey-app-diag-index\.js/);
    assert.match(y, /cache\/restore@[^\n]*\n\s+with:\n\s+path: \.github\/state\/homey-app-diag\n/);
    assert.match(y, /cache\/save@[^\n]*\n\s+with:\n\s+path: \.github\/state\/homey-app-diag\n/);
    assert.match(y, /\.github\/state\/homey-app-diag\/index\.json\n\s+if-no-files-found/);
  });
});
