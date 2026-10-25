'use strict';
/**
 * P2830f — version alignment gate (user 2026-10-19).
 * Every publish needs a version strictly above every build ever uploaded (floor script does that in CI);
 * here we pin what must be true in the committed tree so a bump can never leave the files disagreeing:
 *   app.json == .homeycompose/app.json == package.json == package-lock (root + packages[""]),
 *   strict x.y.z, floor file never above the version, the in-app version comes from the manifest
 *   (no hard-coded constant), and the retry machinery never re-sends or double-bumps a version.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const parse = (v) => { const m = String(v || '').match(/^(\d+)\.(\d+)\.(\d+)$/); return m ? m.slice(1).map(Number) : null; };
const cmp = (a, b) => { const x = parse(a); const y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

// P3042b: a changelog key may be at most one patch above the committed version (the curated
// notes for the next publish, kept by bump-homey-version.js); anything further is refused.
const changelogKeyAllowed = (k, version) => { const [a, b, c] = parse(version); return cmp(k, `${a}.${b}.${c + 1}`) <= 0; };

describe('P2830f version alignment', () => {
  const app = readJson('app.json');

  it('app.json version is strict x.y.z', () => {
    assert.ok(parse(app.version), `bad version ${app.version}`);
  });

  it('app.json, .homeycompose/app.json and package.json agree', () => {
    assert.equal(readJson('.homeycompose/app.json').version, app.version, '.homeycompose/app.json');
    assert.equal(readJson('package.json').version, app.version, 'package.json');
  });

  it('package-lock root version agrees (when a lockfile is committed)', () => {
    if (!fs.existsSync(path.join(ROOT, 'package-lock.json'))) return;
    const lock = readJson('package-lock.json');
    assert.equal(lock.version, app.version, 'package-lock.json version');
    if (lock.packages && lock.packages['']) assert.equal(lock.packages[''].version, app.version, 'package-lock packages[""]');
  });

  it('homey-version-floor never exceeds the committed version', () => {
    const f = path.join(ROOT, '.github', 'homey-version-floor');
    if (!fs.existsSync(f)) return;
    const floor = fs.readFileSync(f, 'utf8').trim();
    if (!parse(floor)) return;
    assert.ok(cmp(floor, app.version) <= 0, `floor ${floor} is above app.json ${app.version}`);
  });

  it('changelog never advertises a version above the committed one', () => {
    const f = path.join(ROOT, '.homeychangelog.json');
    if (!fs.existsSync(f)) return;
    const major = parse(app.version)[0];
    const [ma, mi, pa] = parse(app.version);
    const nextPatch = `${ma}.${mi}.${pa + 1}`;
    for (const k of Object.keys(readJson('.homeychangelog.json'))) {
      // legacy keys from another line (e.g. 9.0.x kept in a 5.x changelog) are not comparable
      // P3042b: bump-homey-version.js keeps a curated entry already written for the next patch
      // (release notes prepared before the publish bump), so exactly version+1 patch is allowed.
      if (parse(k) && parse(k)[0] === major) assert.ok(changelogKeyAllowed(k, app.version), `changelog key ${k} > ${nextPatch} (next of ${app.version})`);
    }
  });

  it('P3042b: a changelog key two patches ahead is still refused', () => {
    assert.equal(changelogKeyAllowed('9.0.1602', '9.0.1601'), true);
    assert.equal(changelogKeyAllowed('9.0.1601', '9.0.1601'), true);
    assert.equal(changelogKeyAllowed('9.0.1603', '9.0.1601'), false);
    assert.equal(changelogKeyAllowed('9.1.0', '9.0.1601'), false);
  });

  it('the in-app version is read from the manifest, never a hard-coded constant', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.match(src, /homey\.manifest\.version/);
    assert.ok(!new RegExp(`['"\`]v?${app.version.replace(/\./g, '\\.')}['"\`]`).test(src), 'app.js hard-codes the current version');
  });

  it('retries never re-send an uploaded version and bump exactly once per run', () => {
    const wf = path.join(ROOT, '.github', 'workflows');
    const files = ['auto-publish-on-push.yml', 'publish-stable.yml', 'bastien-publish.yml'].filter((f) => fs.existsSync(path.join(wf, f)));
    assert.ok(files.length >= 1);
    for (const f of files) {
      const y = fs.readFileSync(path.join(wf, f), 'utf8');
      const bumps = (y.match(/node\s+\S*bump-homey-version\.js/g) || []).length;
      assert.ok(bumps <= 1, `${f}: bump-homey-version.js invoked ${bumps}x in one workflow (double bump risk)`);
    }
    const direct = fs.readFileSync(path.join(ROOT, 'scripts', 'direct-api-publish.js'), 'utf8');
    assert.match(direct, /already|uploaded|exists/i);
  });

  it('final Athom gate and retry decision judge the uploaded version (HOMEY_EXPECTED_VERSION)', () => {
    const wf = path.join(ROOT, '.github', 'workflows', 'auto-publish-on-push.yml');
    if (fs.existsSync(wf)) {
      const y = fs.readFileSync(wf, 'utf8');
      const i = y.indexOf('Athom final state gate');
      if (i >= 0) assert.match(y.slice(i, i + 1200), /HOMEY_EXPECTED_VERSION: \$\{\{ steps\.info\.outputs\.version \}\}/);
    }
    const r = path.join(ROOT, '.github', 'scripts', 'transient-publish-retry.js');
    if (fs.existsSync(r)) assert.match(fs.readFileSync(r, 'utf8'), /process\.env\.HOMEY_EXPECTED_VERSION \|\|/);
    const g = path.join(ROOT, '.github', 'scripts', 'assert-athom-final.js');
    if (fs.existsSync(g)) assert.match(fs.readFileSync(g, 'utf8'), /process\.env\.HOMEY_EXPECTED_VERSION \|\| app\.version/);
  });
});
