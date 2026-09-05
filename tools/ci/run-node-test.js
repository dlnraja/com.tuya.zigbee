'use strict';
/** Thin PhaseRunner wrapper: node --test <file> */
const { spawnSync } = require('child_process');
const path = require('path');
const file = process.argv[2];
if (!file) {
  console.error('usage: run-node-test.js <test-file>');
  process.exit(1);
}
const abs = path.isAbsolute(file) ? file : path.join(__dirname, '..', '..', file);
const res = spawnSync(process.execPath, ['--test', abs], { stdio: 'inherit' });
process.exit(res.status == null ? 1 : res.status);
