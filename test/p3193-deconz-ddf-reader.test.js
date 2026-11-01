'use strict';
// P3193: deCONZ DDF reader in upstream-thread-miner (per-path cursor, ETag via gh(), bounded).
const assert = require('assert');
const m = require('../scripts/scanners/upstream-thread-miner');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'scanners', 'upstream-thread-miner.js'), 'utf8');

describe('P3193 deCONZ DDF reader', () => {
  it('targets devices/tuya of deconz-rest-plugin', () => {
    assert.strictEqual(m.DDF_REPO, 'dresden-elektronik/deconz-rest-plugin');
    assert.strictEqual(m.DDF_PATH, 'devices/tuya');
    assert.ok(m.REPOS.includes(m.DDF_REPO));
    assert.strictEqual(typeof m.ddfThreads, 'function');
  });
  it('keeps its own cursor key and uses since=', () => {
    assert.ok(src.includes('`ddf:${DDF_REPO}:${DDF_PATH}`'));
    assert.ok(/&since=\$\{encodeURIComponent\(cur\)\}/.test(src));
    assert.ok(src.includes('state.cursors[ddf.ck] = dmax'));
  });
});
