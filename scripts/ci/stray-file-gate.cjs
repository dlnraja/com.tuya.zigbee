#!/usr/bin/env node
/**
 * P3081 — stray / pasted file guard.
 *
 * Rejects tracked files that look like a pasted web page or a scratch note rather than source:
 *   - any path segment starting with "#" (saved forum/page titles, e.g. "# [APP][Pro] … .txt");
 *   - any .txt file under drivers/ (drivers ship code, compose JSON and assets only).
 * WHY: 7b64ef71f1 committed a saved Homey Community forum post (third-party text) into two driver folders.
 *
 * Usage: node scripts/ci/stray-file-gate.cjs [--root=DIR]   Exit: 0 clean, 1 stray files found.
 */
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');

function strayFiles(files) {
  return files.filter((f) => {
    const p = f.split(path.sep).join('/');
    if (p.split('/').some((seg) => seg.startsWith('#'))) { return true; }
    return /^drivers\/.*\.txt$/i.test(p);
  });
}

function trackedFiles(root) {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8').split('\0').filter(Boolean);
}

module.exports = { strayFiles, trackedFiles };

if (require.main === module) {
  const arg = process.argv.find((x) => x.startsWith('--root='));
  const root = path.resolve(arg ? arg.slice(7) : process.cwd());
  const bad = strayFiles(trackedFiles(root));
  if (bad.length) {
    for (const f of bad) { console.log(`::error file=${f},title=stray file::looks pasted or scratch (name starts with # or .txt under drivers/): remove it`); }
    console.log(`stray-file-gate: ${bad.length} stray file(s)`);
    process.exit(1);
  }
  console.log('stray-file-gate: OK (no #-named files, no .txt under drivers/)');
}
