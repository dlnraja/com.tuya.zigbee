#!/usr/bin/env node
'use strict';

/**
 * harden-mfs-db.js (P2368)
 * Full mfs_db maintenance pipeline.
 *
 * Usage:
 *   node tools/ci/harden-mfs-db.js
 *   node tools/ci/harden-mfs-db.js --apply
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const OUT = path.join(ROOT, 'reports', 'mfs-harden-latest.json');

function run(rel, args = []) {
  const isNodeTest = rel === '--test';
  const argv = isNodeTest
    ? ['--test', ...args]
    : [path.join(ROOT, rel), ...args];
  const r = spawnSync(process.execPath, argv, { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  return { ok: r.status === 0, exit: r.status, tail: `${r.stdout || ''}${r.stderr || ''}`.slice(-600) };
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function main() {
  const applyArg = APPLY ? ['--apply'] : [];
  const phases = [
    { name: 'mfs-db-dedupe', ...run('tools/ci/mfs-db-dedupe.js', applyArg) },
    { name: 'sync-compose-to-mfs-db', ...run('tools/ci/sync-compose-to-mfs-db.js', applyArg) },
  ];
  if (APPLY) sleep(500);
  phases.push(
    { name: 'enrich-mfs-p2295', ...run('tools/ci/enrich-mfs-p2295-multi-identity.js', applyArg) },
    { name: 'align-mfs-db-intelligent', ...run('tools/ci/align-mfs-db-intelligent.js', applyArg) },
    { name: 'compose-mfsdb-class-guard', ...run('tools/ci/compose-mfsdb-class-guard.js', APPLY ? [] : ['--check']) },
    { name: 'p2138-sacred-couple-gate', ...run('tools/ci/p2138-sacred-couple-matrix-gate.js') },
    { name: 'p2368-mfs-test', ...run('--test', ['test/critical/p2368-mfs-db-harden.test.js']) },
  );

  const report = { generatedAt: new Date().toISOString(), mode: APPLY ? 'APPLY' : 'DRY-RUN', phases };
  report.pass = phases.every((p) => p.ok !== false);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('=== harden-mfs-db (P2368) ===');
  for (const p of phases) {
    console.log(p.ok ? `  ✓ ${p.name}` : `  ✗ ${p.name} (exit ${p.exit})`);
  }
  console.log(`Report: ${OUT}`);
  process.exit(report.pass ? 0 : 1);
}

main();
