'use strict';
// P3208: user diag Log IDs resolve from the Homey diagnostics mail index (no Athom token), not found:false.
const { describe, it } = global.describe ? global : require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadLogIndex } = require('../tools/ci/inbox-diag-uuid-harvest');

describe('P3208 diag Log ID resolves from Gmail index', () => {
  it('loads a bounded logIndex and ignores non-uuid keys', () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'p3208-')), 'diagnostics-state.json');
    fs.writeFileSync(f, JSON.stringify({ processed: [], logIndex: { 'C05DB40D-0000-4000-8000-000000000000': { appVersion: 'v9.0.1' }, junk: { a: 1 } } }));
    const idx = loadLogIndex(f);
    assert.deepStrictEqual(Object.keys(idx), ['c05db40d-0000-4000-8000-000000000000']);
    assert.strictEqual(idx['c05db40d-0000-4000-8000-000000000000'].appVersion, 'v9.0.1');
  });
  it('missing state gives an empty index', () => { assert.deepStrictEqual(loadLogIndex('/nonexistent/x.json'), {}); });
  it('fetch-gmail-diagnostics persists logIndex in the cached state', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '.github', 'scripts', 'fetch-gmail-diagnostics.js'), 'utf8');
    assert.ok(/st\.logIndex\[/.test(src) && /length>300/.test(src));
  });
});
