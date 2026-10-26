#!/usr/bin/env node
'use strict';
/**
 * P3057-3: run every node:test file under `node --test` and fail on failures.
 *
 * WHY: node22-tests.yml ran these files through mocha only. node:test reports failures by setting
 * process.exitCode, and mocha then exits with its own count, so node:test failures never failed CI.
 * This runner is the strict step: a failure fails the job unless its file::name is listed in the
 * branch's frozen baseline (test/node-test-known-failures.json). The baseline is for legacy failures
 * that cannot be fixed without a held behavior/data change; it may only shrink. An entry that passes
 * again is reported as stale, so it can be removed.
 *
 * Usage: node tools/ci/node-test-strict.js [--concurrency N] [--baseline file] [--out file] [files...]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const NODE_TEST_RE = /require\(\s*['"]node:test['"]\s*\)|from\s+['"]node:test['"]/;

function listTestFiles(dir = path.join(ROOT, 'test'), out = []) {
  if (!fs.existsSync(dir)) {return out;}
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) {continue;}
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {listTestFiles(p, out);}
    else if (e.isFile() && e.name.endsWith('.test.js')) {out.push(p);}
  }
  return out;
}

function nodeTestFiles(files) {
  return files.filter((f) => NODE_TEST_RE.test(fs.readFileSync(f, 'utf8'))).sort();
}

// A runner started from inside a node:test process inherits NODE_TEST_CONTEXT and would then ignore
// --test-reporter (child mode); the strict run must always be a top-level run.
function childEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

const keyOf = (f) => `${f.file}::${f.name}`;

function parseFailures(text) {
  const out = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    if (!t) {continue;}
    try { out.push(JSON.parse(t)); } catch { /* ignore partial line */ }
  }
  return out;
}

function loadBaseline(file) {
  if (!file || !fs.existsSync(file)) {return [];}
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(j.knownFailures) ? j.knownFailures.map(String) : [];
}

/** Pure decision: new failures fail the run; baselined ones are tolerated; passing baselined ones are stale. */
function evaluate(failures, baseline, ranFiles) {
  const known = new Set(baseline);
  const seen = new Set(failures.map(keyOf));
  const ran = new Set(ranFiles);
  const unexpected = [...seen].filter((k) => !known.has(k)).sort();
  const tolerated = [...seen].filter((k) => known.has(k)).sort();
  const stale = baseline.filter((k) => !seen.has(k) && ran.has(k.split('::')[0])).sort();
  return { ok: unexpected.length === 0, unexpected, tolerated, stale };
}

function main(argv) {
  const args = argv.slice(2);
  const opt = { concurrency: 4, baseline: path.join(ROOT, 'test', 'node-test-known-failures.json'), out: path.join(ROOT, '.node-test-failures.jsonl') };
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--concurrency') {opt.concurrency = Number(args[++i]) || 4;}
    else if (args[i] === '--baseline') {opt.baseline = path.resolve(args[++i]);}
    else if (args[i] === '--out') {opt.out = path.resolve(args[++i]);}
    else {files.push(path.resolve(args[i]));}
  }
  const targets = nodeTestFiles(files.length ? files : listTestFiles());
  if (!targets.length) { console.log('node-test-strict: no node:test files'); return 0; }
  if (fs.existsSync(opt.out)) {fs.unlinkSync(opt.out);}
  const reporter = path.join(__dirname, 'node-test-fail-reporter.mjs');
  const r = spawnSync(process.execPath, [
    '--test', `--test-concurrency=${opt.concurrency}`,
    '--test-reporter=dot', '--test-reporter-destination=stdout',
    `--test-reporter=${reporter}`, `--test-reporter-destination=${opt.out}`,
    ...targets,
  ], { cwd: ROOT, stdio: 'inherit', env: childEnv() });
  if (r.error) { console.error(`node-test-strict: spawn failed: ${r.error.message}`); return 2; }
  const failures = fs.existsSync(opt.out) ? parseFailures(fs.readFileSync(opt.out, 'utf8')) : [];
  if (r.status !== 0 && failures.length === 0) {
    console.error(`node-test-strict: node --test exited ${r.status} without a recorded failure (crash?) — failing closed`);
    return 1;
  }
  const rel = targets.map((f) => path.relative(ROOT, f).split(path.sep).join('/'));
  const res = evaluate(failures, loadBaseline(opt.baseline), rel);
  console.log(`\nnode-test-strict: files=${targets.length} failures=${failures.length} unexpected=${res.unexpected.length} tolerated(baseline)=${res.tolerated.length} stale-baseline=${res.stale.length}`);
  for (const k of res.tolerated) {console.log(`::warning::known node:test failure (baseline): ${k}`);}
  for (const k of res.stale) {console.log(`::notice::baseline entry now passes, remove it: ${k}`);}
  for (const k of res.unexpected) {
    const f = failures.find((x) => keyOf(x) === k);
    console.log(`::error::node:test failure: ${k}${f && f.msg ? ` — ${f.msg.split('\n')[0]}` : ''}`);
  }
  return res.ok ? 0 : 1;
}

module.exports = { childEnv, NODE_TEST_RE, listTestFiles, nodeTestFiles, parseFailures, evaluate, keyOf };
if (require.main === module) {process.exitCode = main(process.argv);}
