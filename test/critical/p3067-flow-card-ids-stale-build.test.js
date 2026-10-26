'use strict';
// P3067: a stale .homeybuild/app.json (other branch / older build) must never replace the source manifest
// in test/flow-card-ids.test.js — root cause of the bastien-home local-only "45 missing flow card ids".
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const { isFreshBuild, collectManifestIds } = require('../flow-card-ids.test.js');
const rootApp = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));

describe('P3067 flow-card-ids ignores a stale build manifest', () => {
  it('rejects a build copy with another version or app id', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3067-'));
    const f = path.join(dir, 'app.json');
    fs.writeFileSync(f, JSON.stringify({ id: rootApp.id, version: '0.0.1', flow: {} }));
    assert.strictEqual(isFreshBuild(f, rootApp), false);
    fs.writeFileSync(f, JSON.stringify({ id: 'other.app', version: rootApp.version, flow: {} }));
    assert.strictEqual(isFreshBuild(f, rootApp), false);
    assert.strictEqual(isFreshBuild(path.join(dir, 'nope.json'), rootApp), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('always includes root app.json and driver.flow.compose.json card ids', () => {
    const ids = collectManifestIds();
    for (const c of (rootApp.flow && rootApp.flow.triggers) || []) { assert.ok(ids.has(c.id), c.id); }
    assert.ok(ids.size > 1000, `ids ${ids.size}`);
  });
});
