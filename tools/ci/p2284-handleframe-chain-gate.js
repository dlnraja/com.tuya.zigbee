#!/usr/bin/env node
'use strict';

/**
 * P2284 gate — handleFrame chain must not blind-overwrite.
 * Soft in enrich; hard via npm run check:p2284 / unified-ci critical tests.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testFile = path.join(ROOT, 'test/critical/p2284-handleframe-chain.test.js');

const r = spawnSync(process.execPath, ['--test', testFile], {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: 'inherit',
});

process.exit(r.status == null ? 1 : r.status);
