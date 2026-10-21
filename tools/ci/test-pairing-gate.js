#!/usr/bin/env node
'use strict';
/**
 * P2940 — test pairing gate. Lists lib/ and drivers/ JS files added or changed against a base ref
 * that no test under test/ mentions (lib: module file name; drivers: driver folder name).
 *
 * Rollout (dlnraja 21/10/2026): report-only first; from BLOCK_NEW_FROM on, a NEW file without a
 * matching test fails the gate. Changed files stay report-only.
 *   node tools/ci/test-pairing-gate.js --base=origin/master [--mode=report|block-new] [--json]
 * Mode can also come from TEST_GATE_MODE. No network, read-only.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BLOCK_NEW_FROM = '2026-11-04';
const ROOT = path.join(__dirname, '..', '..');

function arg(name) {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : null;
}

function listTestText(root) {
  const out = [];
  const walk = (d) => {
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (_e) { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'fixtures') {walk(p);} } else if (/\.(test|spec)\.c?js$/.test(e.name)) { out.push(fs.readFileSync(p, 'utf8')); }
    }
  };
  walk(path.join(root, 'test'));
  walk(path.join(root, 'tests'));
  return out.join('\n');
}

/** Name a test must mention for this file, or null when the file is not gated. */
function subjectOf(file) {
  if (!/\.c?js$/.test(file)) {return null;}
  if (/(^|\/)(test|tests|__tests__)\//.test(file) || /\.test\.c?js$/.test(file)) {return null;}
  const m = /^drivers\/([^/]+)\//.exec(file);
  if (m) {return m[1];}
  if (file.startsWith('lib/')) {
    const base = path.basename(file).replace(/\.c?js$/, '');
    return base === 'index' ? path.basename(path.dirname(file)) : base;
  }
  return null;
}

function evaluate(changes, testText) {
  const rows = [];
  for (const { status, file } of changes) {
    const subject = subjectOf(file);
    if (!subject) {continue;}
    rows.push({ status, file, subject, tested: testText.includes(subject) });
  }
  return rows;
}

function resolveMode(cli, env, today) {
  const m = cli || env;
  if (m === 'report' || m === 'block-new') {return m;}
  return today >= BLOCK_NEW_FROM ? 'block-new' : 'report';
}

function gitChanges(base, root) {
  const out = execFileSync('git', ['diff', '--name-status', '--no-renames', `${base}...HEAD`, '--', 'lib', 'drivers'], { cwd: root, encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map((l) => { const [s, f] = l.split('\t'); return { status: s[0], file: f }; }).filter((c) => c.status === 'A' || c.status === 'M');
}

function main() {
  const base = arg('base') || process.env.TEST_GATE_BASE || 'origin/master';
  const mode = resolveMode(arg('mode'), process.env.TEST_GATE_MODE, new Date().toISOString().slice(0, 10));
  let changes;
  try { changes = gitChanges(base, ROOT); } catch (e) {
    console.log(`[test-pairing-gate] base ${base} not available (${e.message.split('\n')[0]}); skipping`);
    return 0;
  }
  const rows = evaluate(changes, listTestText(ROOT));
  const missing = rows.filter((r) => !r.tested);
  const blocking = mode === 'block-new' ? missing.filter((r) => r.status === 'A') : [];
  if (process.argv.includes('--json')) {console.log(JSON.stringify({ base, mode, checked: rows.length, missing, blocking }, null, 2));} else {
    console.log(`[test-pairing-gate] base=${base} mode=${mode} checked=${rows.length} without-test=${missing.length}`);
    for (const r of missing) {console.log(`  ${r.status === 'A' ? 'NEW    ' : 'CHANGED'} ${r.file}  (no test mentions "${r.subject}")`);}
    if (blocking.length) {console.log(`::error::${blocking.length} new lib/drivers file(s) ship without a test`);} else if (missing.length) {console.log('::notice::report-only: add tests for the files above');}
  }
  return blocking.length ? 1 : 0;
}

if (require.main === module) {process.exitCode = main();}
module.exports = { subjectOf, evaluate, resolveMode, BLOCK_NEW_FROM };
