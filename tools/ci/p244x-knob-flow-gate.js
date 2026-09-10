#!/usr/bin/env node
'use strict';

/**
 * P244x — single entry: P2448 + P2449 gates then critical tests (one npm hop).
 * WHY: avoid nested `npm run` spawn cost on Windows PowerShell.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function run(label, args) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (r.status !== 0) {
    console.error(`\nP244x FAIL at ${label} (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}

run('P2448 gate', ['tools/ci/p2448-rotary-knob-gate.js']);
run('P2449 gate', ['tools/ci/p2449-declared-flow-wire-gate.js']);
run('P2448+P2449 tests', [
  '--test',
  'test/critical/p2448-rotary-knob-command-mode.test.js',
  'test/critical/p2449-declared-flow-wire.test.js',
]);

console.log('\nP244x PASS');
process.exit(0);
