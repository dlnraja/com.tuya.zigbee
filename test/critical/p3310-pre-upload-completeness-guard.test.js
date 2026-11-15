'use strict';
/**
 * P3310 — pre-upload completeness guard (user 15/11/2026: never upload an empty or incomplete app).
 * A valid fake package passes; empty, truncated, stale-version, missing-module, zero-byte and
 * sudden-drop packages are blocked. Every publish path calls the guard on the exact upload dir.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const GUARD = path.join(ROOT, '.github', 'scripts', 'pre-upload-completeness-guard.js');
const { check, buildManifest, diffManifests } = require(GUARD);

const tmp = [];
function w(root, rel, data) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); }
// Random bytes do not compress, so the fake reaches the absolute size floors with few files.
function blob(n) { return crypto.randomBytes(n); }
function makeValid({ drivers = ['d_one', 'd_two', 'd_three'], version = '1.2.3' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3310-'));
  tmp.push(root);
  const app = { id: 'com.example.fake', version, images: { small: '/assets/images/small.png' }, drivers: drivers.map((id) => ({ id, images: { small: `/drivers/${id}/assets/images/small.png`, large: `/drivers/${id}/assets/images/large.png` } })) };
  w(root, 'app.json', JSON.stringify(app));
  w(root, 'app.js', "'use strict';\nconst Homey = require('homey');\nconst path = require('path');\nconst lib = require('./lib/util');\nconst dep = require('fake-dep');\nmodule.exports = class extends Homey.App {};\n");
  w(root, 'lib/util.js', "module.exports = require('./inner');\n");
  w(root, 'lib/inner.js', 'module.exports = 1;\n');
  w(root, 'lib/blob.bin', blob(1600 * 1024));
  w(root, 'node_modules/fake-dep/package.json', '{"name":"fake-dep","version":"1.0.0"}');
  w(root, 'node_modules/fake-dep/index.js', 'module.exports = 2;\n');
  w(root, 'assets/images/small.png', blob(64));
  for (const id of drivers) {
    w(root, `drivers/${id}/driver.js`, "module.exports = require('../../lib/util');\n");
    w(root, `drivers/${id}/device.js`, "module.exports = require('fake-dep');\n");
    w(root, `drivers/${id}/assets/images/small.png`, blob(64));
    w(root, `drivers/${id}/assets/images/large.png`, blob(64));
  }
  return root;
}
const errs = (root, opts = {}) => check(root, { appId: 'com.example.fake', ...opts }).errors;

describe('P3310 pre-upload completeness guard', () => {
  after(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });

  it('a complete package passes (CLI exit 0) with the expected version and a matching baseline', () => {
    const root = makeValid();
    assert.deepEqual(errs(root, { expectedVersion: '1.2.3', baseline: { version: '1.2.2', payload_files: 16, drivers: 3 } }), []);
    const out = execFileSync(process.execPath, [GUARD, root, 'com.example.fake'], { env: { ...process.env, HOMEY_EXPECTED_VERSION: '1.2.3', PUBLISH_BASELINE_FILE: path.join(root, 'none.json'), PUBLISH_SOURCE_DIR: root, PUBLISH_MANIFEST_OUT: path.join(root, '..', `p3310-ok-${process.pid}.json`), GH_TOKEN: '', GITHUB_TOKEN: '' }, encoding: 'utf8' });
    assert.match(out, /OK: package complete/);
  });

  it('an empty or missing directory is blocked (CLI exit 1)', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'p3310-empty-')); tmp.push(empty);
    assert.match(errs(empty).join('\n'), /EMPTY/);
    assert.match(errs(path.join(empty, 'nope')).join('\n'), /publish directory missing/);
    let code = 0;
    try { execFileSync(process.execPath, [GUARD, empty], { stdio: 'pipe' }); } catch (e) { code = e.status; }
    assert.equal(code, 1);
  });

  it('a truncated package (driver folder lost, app.js missing, app.json broken) is blocked', () => {
    const a = makeValid(); fs.rmSync(path.join(a, 'drivers', 'd_two'), { recursive: true });
    const ea = errs(a).join('\n');
    assert.match(ea, /lists 3 drivers but 2 driver folders/);
    assert.match(ea, /drivers\/d_two not packaged/);
    const b = makeValid(); fs.rmSync(path.join(b, 'app.js'));
    assert.match(errs(b).join('\n'), /app\.js missing/);
    const c = makeValid(); fs.writeFileSync(path.join(c, 'app.json'), '{"id":"com.example.fake","drivers":[');
    assert.match(errs(c).join('\n'), /app\.json does not parse/);
    const d = makeValid(); fs.rmSync(path.join(d, 'app.json'));
    assert.match(errs(d).join('\n'), /app\.json missing/);
  });

  it('no drivers, a driver without driver.js, or a missing / 0-byte image is blocked', () => {
    const a = makeValid({ drivers: [] });
    assert.match(errs(a).join('\n'), /NO drivers/);
    const b = makeValid(); fs.rmSync(path.join(b, 'drivers', 'd_one', 'driver.js'));
    assert.match(errs(b).join('\n'), /d_one: neither driver\.js nor driver\.compose\.json/);
    const c = makeValid(); fs.rmSync(path.join(c, 'drivers', 'd_one', 'assets', 'images', 'large.png'));
    assert.match(errs(c).join('\n'), /d_one: image large .* not packaged/);
    const d = makeValid(); fs.writeFileSync(path.join(d, 'drivers', 'd_two', 'assets', 'images', 'small.png'), '');
    assert.match(errs(d).join('\n'), /d_two: image small .* is 0 bytes/);
  });

  it('unresolvable lib / node_modules requires and zero-byte JS/JSON are blocked', () => {
    const a = makeValid(); fs.rmSync(path.join(a, 'lib', 'inner.js'));
    assert.match(errs(a).join('\n'), /require\('\.\/inner'\) in lib\/util\.js does not resolve/);
    const b = makeValid(); fs.rmSync(path.join(b, 'node_modules'), { recursive: true });
    assert.match(errs(b).join('\n'), /module 'fake-dep' required by app\.js is not packed/);
    const c = makeValid(); fs.writeFileSync(path.join(c, 'lib', 'extra.json'), '');
    assert.match(errs(c).join('\n'), /zero-byte JS\/JSON file\(s\): lib\/extra\.json/);
  });

  it('a version that differs from HOMEY_EXPECTED_VERSION is blocked (stale package)', () => {
    const a = makeValid({ version: '1.2.2' });
    assert.match(errs(a, { expectedVersion: '1.2.3' }).join('\n'), /1\.2\.2 != HOMEY_EXPECTED_VERSION 1\.2\.3/);
  });

  it('a payload below the sane minimum or far below the last accepted build is blocked', () => {
    const a = makeValid(); fs.rmSync(path.join(a, 'lib', 'blob.bin'));
    const ea = errs(a).join('\n');
    assert.match(ea, /payload \d+ bytes < sane minimum/);
    assert.match(ea, /archive ~\d+ gz bytes < sane minimum/);
    const b = makeValid();
    const eb = errs(b, { baseline: { version: '1.2.2', payload_files: 4018, drivers: 347, payload_bytes: 31356317 } }).join('\n');
    assert.match(eb, /file count \d+ is \d+ % below the last accepted build v1\.2\.2/);
    assert.match(eb, /driver count 3 is 99 % below/);
  });

  it('the RIGHT files: stray repo dirs, unlisted/stale driver folders and drivers absent from the source are blocked', () => {
    const a = makeValid(); w(a, '.homeycompose/app.json', '{}'); w(a, 'test/x.test.js', '1;'); w(a, 'docs/a.md', 'x');
    assert.match(errs(a).join('\n'), /stray repo-only dir\(s\) in the package: \.homeycompose, docs, test/);
    const src = makeValid(); w(src, '.homeyignore', 'specs\n# c\n*.log\n'); w(src, 'specs/s.md', 'x');
    const b = makeValid(); w(b, 'specs/s.md', 'x');
    assert.match(errs(b, { sourceDir: src }).join('\n'), /stray repo-only dir\(s\) in the package: specs/);
    const c = makeValid(); w(c, 'drivers/d_stale/driver.js', '1;');
    const ec = errs(c).join('\n');
    assert.match(ec, /lists 3 drivers but 4 driver folders/);
    assert.match(ec, /1 packaged driver folder\(s\) not in app\.json \(stale\/unfiltered tree\): d_stale/);
    const srcSmall = makeValid({ drivers: ['d_one', 'd_two'] });
    assert.match(errs(makeValid(), { sourceDir: srcSmall }).join('\n'), /1 packaged driver\(s\) absent from the source tree.*d_three/);
    assert.deepEqual(errs(makeValid(), { sourceDir: makeValid({ drivers: ['d_one', 'd_two', 'd_three', 'd_held'] }) }), []);
  });

  it('manifest: sha256 per file; diff vs the last accepted build reports added/removed and blocks truncated drivers', () => {
    const base = makeValid({ drivers: ['d_one', 'd_two', 'd_three', 'd_gone'] });
    const baseM = check(base, { appId: 'com.example.fake' }).manifest;
    assert.equal(baseM.files['app.js'].sha256.length, 64);
    const cur = makeValid({ drivers: ['d_one', 'd_two', 'd_three', 'd_new'] });
    const r = check(cur, { appId: 'com.example.fake', baselineManifest: { ...baseM, version: '1.2.2' } });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.diff.driversAdded, ['d_new']);
    assert.deepEqual(r.diff.driversRemoved, ['d_gone']);
    assert.ok(r.diff.added.includes('drivers/d_new/driver.js') && r.diff.removed.includes('drivers/d_gone/driver.js'));
    const trunc = makeValid({ drivers: ['d_one', 'd_two', 'd_three', 'd_gone'] }); fs.rmSync(path.join(trunc, 'drivers', 'd_two', 'device.js'));
    assert.match(check(trunc, { appId: 'com.example.fake', baselineManifest: baseM }).errors.join('\n'), /vanished from drivers kept since the last accepted build.*drivers\/d_two\/device\.js/);
    const d = diffManifests(buildManifest(cur, []), baseM);
    assert.match(d.errors.join('\n'), /files of the last accepted build .* are gone/);
  });

  it('the CLI writes the manifest artifact even when it blocks', () => {
    const a = makeValid(); fs.rmSync(path.join(a, 'app.js'));
    const out = path.join(a, '..', `p3310-manifest-${process.pid}.json`); tmp.push(out);
    let code = 0;
    try { execFileSync(process.execPath, [GUARD, a, 'com.example.fake'], { stdio: 'pipe', env: { ...process.env, PUBLISH_MANIFEST_OUT: out, PUBLISH_SOURCE_DIR: a, GH_TOKEN: '', GITHUB_TOKEN: '' } }); } catch (e) { code = e.status; }
    assert.equal(code, 1);
    const m = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(m.blocked, true);
    assert.ok(m.files['app.json'] && m.fileCount > 10);
  });

  it('this branch source never makes the guard block: images exist, repo-only dirs are .homeyignored', () => {
    // stable-v5 run 43735981586 (v5.12.550): 152 compose files referenced xlarge.png files that never
    // existed and specs/ shipped because .homeyignore missed it. Pin both on the committed tree.
    const { ignoredTopDirs, STRAY_TOP } = require(GUARD);
    const exists = (p) => fs.existsSync(path.join(ROOT, String(p).replace(/^\/+/, '')));
    const missing = [];
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    for (const [k, p] of Object.entries(app.images || {})) if (!exists(p)) missing.push(`app.json images.${k} ${p}`);
    for (const d of app.drivers || []) for (const [k, p] of Object.entries((d && d.images) || {})) if (!exists(p)) missing.push(`app.json ${d.id} ${k} ${p}`);
    const dd = path.join(ROOT, 'drivers');
    for (const id of fs.readdirSync(dd)) {
      const f = path.join(dd, id, 'driver.compose.json');
      if (!fs.existsSync(f)) continue;
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      for (const [k, p] of Object.entries(j.images || {})) if (typeof p === 'string' && !exists(p.replace('{{driverAssetsPath}}', `/drivers/${id}/assets`))) missing.push(`${id}/driver.compose.json ${k} ${p}`);
    }
    assert.deepEqual(missing.slice(0, 10), [], `${missing.length} image reference(s) to missing files`);
    const ignored = new Set(ignoredTopDirs(ROOT));
    const shipped = STRAY_TOP.filter((t) => !t.startsWith('.') && fs.existsSync(path.join(ROOT, t)) && fs.statSync(path.join(ROOT, t)).isDirectory() && !ignored.has(t));
    assert.deepEqual(shipped, [], `repo-only dirs not in .homeyignore: ${shipped.join(', ')}`);
  });

  it('the committed baseline holds a real accepted/complete build for each of the three apps', () => {
    const b = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'publish-payload-baseline.json'), 'utf8'));
    for (const id of ['com.dlnraja.tuya.zigbee', 'com.dlnraja.tuya.zigbee.stable', 'com.dlnraja.tuya.zigbee.bastien']) {
      const r = b.apps[id];
      assert.ok(r && /^\d+\.\d+\.\d+$/.test(r.version) && r.payload_files > 1000 && r.drivers > 0 && /^\d+$/.test(String(r.run)), id);
    }
  });

  it('every upload path runs the guard on the exact publish dir before uploading (never bypassable)', () => {
    const blocking = /node "\$GITHUB_WORKSPACE\/\.github\/scripts\/pre-upload-completeness-guard\.js" "\$PUBLISH_DIR"[^\n]*\|\| \{ echo "::error::[^"]*"; exit 1; \}/;
    const up = /app publish --path|direct-api-publish\.js"? --path/;
    const paths = ['.github/actions/homey-app-publish/action.yml', '.github/actions/homey-publish/action.yml',
      '.github/workflows/publish-stable.yml', '.github/workflows/bastien-publish.yml', '.github/workflows/auto-fix-and-publish.yml']
      .map((rel) => [rel, up]);
    let seen = 0;
    for (const [rel, upload] of paths) {
      const f = path.join(ROOT, rel);
      if (!fs.existsSync(f)) continue;
      const y = fs.readFileSync(f, 'utf8');
      const g = y.search(blocking);
      if (g < 0 && !upload.test(y)) continue;
      assert.ok(g >= 0, `${rel} must run the blocking pre-upload guard`);
      // the first non-comment upload command of the file comes after the guard
      const firstUpload = y.split('\n').findIndex((l) => upload.test(l) && !/^\s*#/.test(l));
      const guardLine = y.slice(0, g).split('\n').length - 1;
      assert.ok(firstUpload > guardLine, `${rel}: the guard (line ${guardLine + 1}) must precede the first upload (line ${firstUpload + 1})`);
      seen++;
    }
    assert.ok(seen >= 3, `guard wired in ${seen} upload file(s)`);
    // direct-api-publish.js (every direct path, incl. retries and orphan re-uploads) refuses an incomplete dir itself.
    const d = fs.readFileSync(path.join(ROOT, 'scripts', 'direct-api-publish.js'), 'utf8');
    assert.match(d, /pre-upload-completeness-guard/);
  });
});
