'use strict';
// P3025b: the payload uploaded to Athom must be byte-identical to the one validated at level publish.
const { describe, it } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { snapshot, verify } = require('../../scripts/ci/publish-payload-identity.cjs');

const SCRIPT = path.join(__dirname, '../../scripts/ci/publish-payload-identity.cjs');

function mkPayload() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p3025b-pid-'));
  const w = (r, c) => { fs.mkdirSync(path.dirname(path.join(d, r)), { recursive: true }); fs.writeFileSync(path.join(d, r), c); };
  w('app.json', '{"id":"x","version":"1.0.0"}');
  w('app.js', 'module.exports = 1;');
  w('drivers/a/device.js', '1');
  w('node_modules/dep/index.js', 'dep');
  w('.homeychangelog.json', '{}');
  // what `homey app validate` leaves behind (no node_modules for Node apps)
  w('.homeybuild/app.json', '{"id":"x","version":"1.0.0"}');
  w('.homeybuild/app.js', 'module.exports = 1;');
  w('.homeybuild/drivers/a/device.js', '1');
  return { d, w };
}

describe('P3025b publish payload identity gate', () => {
  it('pre: unchanged payload verifies OK, CLI exits 0', () => {
    const { d } = mkPayload();
    const snapFile = path.join(d, '..', `${path.basename(d)}.snap.json`);
    assert.strictEqual(spawnSync(process.execPath, [SCRIPT, 'snapshot', d, snapFile]).status, 0);
    const r = spawnSync(process.execPath, [SCRIPT, 'verify', d, snapFile, '--phase', 'pre'], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /identical to the validated package/);
  });

  it('pre: app.json rewritten after validation fails with exit 1 and names the file', () => {
    const { d, w } = mkPayload();
    const snapFile = path.join(d, '..', `${path.basename(d)}.snap.json`);
    spawnSync(process.execPath, [SCRIPT, 'snapshot', d, snapFile]);
    w('app.json', '{"id":"x","version":"1.0.0","flow":{}}');
    const r = spawnSync(process.execPath, [SCRIPT, 'verify', d, snapFile, '--phase', 'pre'], { encoding: 'utf8' });
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /::error::publish-payload-identity pre/);
    assert.match(r.stderr, /~ changed app\.json/);
  });

  it('pre: a pruned driver file or a dependency change is detected', () => {
    const { d, w } = mkPayload();
    const s = snapshot(d);
    fs.rmSync(path.join(d, 'drivers/a/device.js'));
    w('node_modules/dep/index.js', 'dep2');
    const r = verify(d, s, 'pre');
    assert.strictEqual(r.ok, false);
    assert.ok(r.problems.some((p) => p === '- removed drivers/a/device.js'));
    assert.ok(r.problems.some((p) => p === '~ changed node_modules/dep/index.js'));
  });

  it('post: CLI rebuild adding node_modules + archive is identical; a different manifest is not', () => {
    const { d, w } = mkPayload();
    const s = snapshot(d);
    w('.homeybuild/node_modules/dep/index.js', 'dep');
    w('.homeybuild/x.tar.gz', 'zz');
    assert.strictEqual(verify(d, s, 'post').ok, true);
    w('.homeybuild/app.json', '{"id":"x","version":"1.0.1"}');
    const r = verify(d, s, 'post');
    assert.strictEqual(r.ok, false);
    assert.ok(r.problems[0].startsWith('.homeybuild/app.json sha256'));
  });

  it('snapshot refuses when no validated .homeybuild exists', () => {
    const { d } = mkPayload();
    fs.rmSync(path.join(d, '.homeybuild'), { recursive: true });
    const r = spawnSync(process.execPath, [SCRIPT, 'snapshot', d, path.join(d, 's.json')], { encoding: 'utf8' });
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /no validated \.homeybuild\/app\.json/);
  });

  it('action.yml validates explicitly then verifies before the CLI upload and each direct-api fallback', () => {
    const y = fs.readFileSync(path.join(__dirname, '../../.github/actions/homey-app-publish/action.yml'), 'utf8');
    const iVal = y.indexOf('app validate --level publish --path "$PUBLISH_DIR"');
    const iSnap = y.indexOf('publish-payload-identity.cjs" snapshot');
    assert.ok(iVal > 0 && iSnap > iVal, 'validate then snapshot');
    const verifies = y.split('verify_payload_identity pre').length - 1;
    assert.ok(verifies >= 3, `expected verify before CLI + 2 direct-api paths, got ${verifies}`);
    const runs = [...y.matchAll(/verify_payload_identity pre && (run_homey_cli_publish|HOMEY_PAT=)/g)];
    assert.ok(runs.length >= 3, 'each upload is chained after a pre verify');
    assert.ok(y.includes('verify_payload_identity post'), 'post-upload identity check present');
  });
});
