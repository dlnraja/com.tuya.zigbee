'use strict';
// P3096: disk/inode guard verdicts + real statfs read.
const test = require('node:test');
const assert = require('node:assert');
const { usage, verdict } = require('../../scripts/ci/disk-inode-guard');

test('P3096 verdict uses the worst of bytes and inodes', () => {
  assert.strictEqual(verdict({ bytesPct: 10, inodesPct: 10 }), 'ok');
  assert.strictEqual(verdict({ bytesPct: 10, inodesPct: 90 }), 'warn');
  assert.strictEqual(verdict({ bytesPct: 99, inodesPct: 10 }), 'fail');
  assert.strictEqual(verdict({ bytesPct: 10, inodesPct: 100 }), 'fail');
});

test('P3096 usage reads real numbers', () => {
  const u = usage('.');
  assert.ok(Number.isFinite(u.bytesPct) && Number.isFinite(u.inodesPct));
});
