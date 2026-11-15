'use strict';
// P3293 (15/11/2026 Paris): stable run 43710885652, build #425 v5.12.549. `homey app publish` created the
// build, then failed with "Submitting... Timeout after 10000ms": no files were sent and Athom left the
// build in waiting_for_files. The resubmit step waited 7 minutes, saw no processing_failed and treated
// the orphan as ready, so no bumped version was ever uploaded (first time: 31/10, #404, v5.12.521).
// Rule: an orphan waiting_for_files is a transient failure, never "ready"; exactly ONE bump + ONE
// re-upload; the same-version guard stays; any other unknown state still blocks.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const WAIT = path.join(ROOT, '.github', 'scripts', 'wait-athom-draft-ready.js');

// Runs the real wait script with a stubbed Athom client that always lists `builds`.
function runWait(builds, extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3293-'));
  const stub = path.join(dir, 'stub.js');
  fs.writeFileSync(stub, `
const Module = require('module');
const orig = Module.prototype.require;
Module.prototype.require = function (id) {
  if (/homey-apps-api-client$/.test(id)) {
    return { createClient: async () => ({}), getBuilds: async () => JSON.parse(process.env.P3293_BUILDS) };
  }
  return orig.apply(this, arguments);
};`);
  const out = path.join(dir, 'out.txt');
  fs.writeFileSync(out, '');
  const r = spawnSync(process.execPath, ['-r', stub, WAIT], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 30000,
    env: {
      PATH: process.env.PATH,
      HOMEY_PAT: 'stub',
      APP_ID: 'com.dlnraja.tuya.zigbee.stable',
      HOMEY_EXPECTED_VERSION: '5.12.549',
      HOMEY_DRAFT_SOFT_EXPECT: '1',
      HOMEY_DRAFT_WAIT_MS: '300',
      HOMEY_DRAFT_POLL_MS: '50',
      HOMEY_DRAFT_EARLY_FAIL_MS: '120000',
      GITHUB_OUTPUT: out,
      P3293_BUILDS: JSON.stringify(builds),
      ...extraEnv,
    },
  });
  const outputs = fs.readFileSync(out, 'utf8');
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, stdout: `${r.stdout || ''}${r.stderr || ''}`, outputs };
}

const SIX_MIN_AGO = () => new Date(Date.now() - 6 * 60 * 1000).toISOString();
const ORPHAN = () => [
  { id: 425, version: '5.12.549', state: 'waiting_for_files', createdAt: SIX_MIN_AGO() },
  { id: 424, version: '5.12.548', state: 'test', createdAt: '2026-11-08T11:19:33.742Z' },
];

// The stable resubmit step's "ready" test, unchanged: no degraded flag and no orphan flag = ready.
function resubmitSeesReady(outputs) {
  return !/^processing_failed_degraded=true$/m.test(outputs) && !/^orphan_waiting_for_files=true$/m.test(outputs);
}

describe('P3293 orphan waiting_for_files after a CLI submit timeout', () => {
  it('the wait script never reports the #425 orphan as ready', () => {
    const r = runWait(ORPHAN());
    assert.equal(resubmitSeesReady(r.outputs), false, `orphan considered ready:\n${r.stdout}\n${r.outputs}`);
    assert.match(r.outputs, /^orphan_waiting_for_files=true$/m);
    assert.match(r.outputs, /^orphan_build_id=425$/m);
    assert.notEqual(r.status, 0, 'orphan must not exit 0');
  });

  it('a fresh waiting_for_files (upload still running) is not an orphan mid-window, but is after a full window', () => {
    const { classifyDraftWait, normalizeBuild, findOrphan } = require(WAIT);
    const fresh = [{ id: 426, version: '5.12.549', state: 'waiting_for_files', createdAt: new Date().toISOString() }];
    const c = classifyDraftWait(fresh.map(normalizeBuild), '5.12.549');
    assert.equal(findOrphan(c, { waitedMs: 20000 }), null);
    assert.equal(findOrphan(c, { waitedMs: 420000, confirmed: true }).id, 426);
    // A real processing build or a failed one is never re-labelled as an orphan.
    const busy = classifyDraftWait([{ id: 426, version: '5.12.549', state: 'processing', createdAt: SIX_MIN_AGO() }], '5.12.549');
    assert.equal(findOrphan(busy, { confirmed: true }), null);
  });

  it('a ready draft is still ready (no regression)', () => {
    const r = runWait([{ id: 427, version: '5.12.549', state: 'draft', createdAt: SIX_MIN_AGO() }]);
    assert.equal(r.status, 0);
    assert.equal(resubmitSeesReady(r.outputs), true);
  });

  it('shared decision: exactly one re-upload, then block; non-orphans are not touched', () => {
    const orphan = require(path.join(ROOT, '.github', 'scripts', 'athom-orphan-build.js'));
    const b = { id: 425, version: '5.12.549', state: 'waiting_for_files', createdAt: SIX_MIN_AGO() };
    assert.equal(orphan.isOrphanWaitingForFiles(b), true);
    assert.equal(orphan.isOrphanWaitingForFiles({ ...b, createdAt: new Date().toISOString() }), false);
    assert.equal(orphan.isOrphanWaitingForFiles({ ...b, createdAt: new Date().toISOString() }, { confirmed: true }), true);
    assert.equal(orphan.isOrphanWaitingForFiles({ ...b, state: 'processing' }), false);
    assert.equal(orphan.isOrphanWaitingForFiles({ ...b, state: 'processing_failed' }), false);
    assert.equal(orphan.decideOrphanReupload({ orphan: true, reuploadsDone: 0 }).action, 'reupload');
    assert.equal(orphan.decideOrphanReupload({ orphan: true, reuploadsDone: 1 }).action, 'block');
    assert.equal(orphan.decideOrphanReupload({ orphan: false, reuploadsDone: 0 }).action, 'none');
    assert.equal(orphan.MAX_ORPHAN_REUPLOADS, 1);
  });

  it('a written-back version whose only build is an orphan is not an "identical payload" (stable 20b92cb90f)', () => {
    const orphan = require(path.join(ROOT, '.github', 'scripts', 'athom-orphan-build.js'));
    const rows = [
      'HOMEY_PAT valid',
      JSON.stringify({ id: 425, version: '5.12.549', state: 'waiting_for_files', at: SIX_MIN_AGO() }),
      JSON.stringify({ id: 424, version: '5.12.548', state: 'test', at: '2026-11-08T11:19:33.742Z' }),
    ].join('\n');
    assert.equal(orphan.recordedVersionOrphan(rows, '5.12.549').id, 425);
    assert.equal(orphan.recordedVersionOrphan(rows, '5.12.548'), null);
    assert.equal(orphan.recordedVersionOrphan(rows, '5.12.550'), null, 'unknown version: no override');
    const retried = `${rows}\n${JSON.stringify({ id: 426, version: '5.12.549', state: 'processing_failed' })}`;
    assert.equal(orphan.recordedVersionOrphan(retried, '5.12.549'), null, 'other states keep their own handling');
  });

  it('the shared helper is byte-identical on the three branches (same sha as recorded here)', () => {
    const src = fs.readFileSync(path.join(ROOT, '.github', 'scripts', 'athom-orphan-build.js'), 'utf8');
    assert.match(src, /byte-identical on master, stable-v5 and bastien-home/);
  });
});
