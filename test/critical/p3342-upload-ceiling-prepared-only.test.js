'use strict';
// P3342 follow-up: the ceiling check must measure only a finished upload package.
// Platform Budget 43858375750 (16/11/2026 12:30 Paris) measured a mid-prepare leftover
// (4,704,563 B) after prepare-publish failed and was swallowed; source app.json is ~3.12 MB.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(ROOT, 'scripts/ci/upload-manifest-ceiling.cjs');
const PP = path.join(ROOT, 'scripts/prepare-publish.js');
const WF = path.join(ROOT, '.github/workflows/platform-budget.yml');

function runCli(appJson, env) {
  return spawnSync(process.execPath, [CLI, appJson].filter((a) => a !== undefined), {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function makePublishDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  // isPreparedPublishPath accepts a directory whose name is homey-publish-temp
  const prepared = path.join(dir, 'homey-publish-temp');
  fs.mkdirSync(prepared);
  return { root: dir, prepared, appJson: path.join(prepared, 'app.json'), marker: `${prepared}.upload-package-ready` };
}

test('fail-before: a missing upload app.json must FAIL, never skip or pass', () => {
  const missing = path.join(os.tmpdir(), `p3342-missing-${process.pid}-homey-publish-temp`, 'app.json');
  const r = runCli(missing);
  assert.notStrictEqual(r.status, 0, `missing file must not exit 0 (got ${r.status}, stdout=${r.stdout}, stderr=${r.stderr})`);
  assert.match(`${r.stderr}\n${r.stdout}`, /missing|not ready|absent|did not finish/i);
  assert.doesNotMatch(`${r.stderr}\n${r.stdout}`, /skipped/i);
});

test('CLI refuses to measure the source-tree app.json (never a silent fallback)', () => {
  const source = path.join(ROOT, 'app.json');
  assert.ok(fs.existsSync(source), 'source app.json present');
  const r = runCli(source);
  assert.notStrictEqual(r.status, 0);
  assert.match(`${r.stderr}\n${r.stdout}`, /source|prepared publish|upload package|refusing/i);
});

test('an incomplete leftover in the publish temp dir (no ready marker) must FAIL', () => {
  const d = makePublishDir('p3342-leftover-');
  try {
    fs.writeFileSync(d.appJson, 'x'.repeat(100)); // under ceiling, would pass if measured
    assert.ok(!fs.existsSync(d.marker));
    const r = runCli(d.appJson);
    assert.notStrictEqual(r.status, 0, `leftover must not be measured as the upload package (status=${r.status}, out=${r.stdout}, err=${r.stderr})`);
    assert.match(`${r.stderr}\n${r.stdout}`, /not ready|incomplete|leftover|did not finish|ready marker/i);
  } finally {
    fs.rmSync(d.root, { recursive: true, force: true });
  }
});

test('pass-after: a finished upload package under the ceiling passes', () => {
  const d = makePublishDir('p3342-ready-');
  try {
    fs.writeFileSync(d.appJson, 'x'.repeat(100));
    fs.writeFileSync(d.marker, JSON.stringify({ bytes: 100 }) + '\n');
    const r = runCli(d.appJson);
    assert.strictEqual(r.status, 0, `expected pass, got ${r.status} stdout=${r.stdout} stderr=${r.stderr}`);
    assert.match(r.stdout, /under by/);
  } finally {
    fs.rmSync(d.root, { recursive: true, force: true });
    fs.rmSync(d.marker, { force: true });
  }
});

test('pass-after: a finished upload package over the ceiling still fails the size check', () => {
  const d = makePublishDir('p3342-over-');
  try {
    const pol = require('../../scripts/ci/upload-manifest-ceiling.cjs').policy();
    fs.writeFileSync(d.appJson, 'x'.repeat(pol.ceilingBytes + 1));
    fs.writeFileSync(d.marker, JSON.stringify({ bytes: pol.ceilingBytes + 1 }) + '\n');
    const r = runCli(d.appJson);
    assert.notStrictEqual(r.status, 0);
    assert.match(`${r.stderr}\n${r.stdout}`, /OVER by/);
  } finally {
    fs.rmSync(d.root, { recursive: true, force: true });
    fs.rmSync(d.marker, { force: true });
  }
});

test('prepare-publish writes the ready marker only after a finished payload, and clears a stale marker at start', () => {
  const pp = fs.readFileSync(PP, 'utf8');
  const ceil = fs.readFileSync(CLI, 'utf8');
  assert.match(ceil, /READY_SUFFIX = '\.upload-package-ready'/);
  assert.match(pp, /upload-manifest-ceiling\.cjs'\)\.clearReadyMarker\(destDir\)/);
  assert.match(pp, /upload-manifest-ceiling\.cjs'\)\.writeReadyMarker\(destAppJson\)/);
  const clearAt = pp.indexOf('clearReadyMarker(destDir)');
  const writeAt = pp.lastIndexOf('writeReadyMarker(destAppJson)');
  const ceilingAt = pp.lastIndexOf('checkUploadManifest(destAppJson)');
  assert.ok(clearAt !== -1 && clearAt < pp.indexOf('Cleared destination directory'), 'stale marker cleared when dest is reset');
  assert.ok(ceilingAt !== -1 && writeAt > ceilingAt, 'ready marker must be written after the ceiling check');
  assert.ok(pp.indexOf('Publish directory ready:') > writeAt, 'marker before ready log');
});

test('Platform Budget must not swallow prepare-publish failure, and the ceiling step stays blocking', () => {
  const wf = fs.readFileSync(WF, 'utf8');
  assert.match(wf, /run: node scripts\/ci\/upload-manifest-ceiling\.cjs /);
  assert.ok(!/upload-manifest-ceiling[^\n]*\|\|/.test(wf), 'ceiling step must block');
  // The 12:30 Paris failure was a leftover measured after: node scripts/prepare-publish.js || echo warning
  assert.ok(
    !/prepare-publish\.js\s*\|\|/.test(wf),
    'prepare-publish failure must not be swallowed; without a finished upload package the ceiling check cannot run honestly',
  );
});
