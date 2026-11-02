#!/usr/bin/env node
'use strict';
// WHY(P3243, 02/11/2026 Paris): two heap/timing tests (P2914 memory leak, P3065 flow-storm soak) go red
// now and then on a busy runner while green alone (seen 02/11 20:48 on P3236 and P3230). Before this, one
// heap flake made the whole Node 22 run red and hid real verdicts. Rule: the full suite runs ONCE with
// --expose-gc after a clean of stale build folders; if and only if every failure belongs to the flaky
// allowlist, those files are re-run ISOLATED once. Any other failure fails at once. Every retry is reported
// (step summary + bounded learning ledger signature flaky:<file>) so a test that flakes often is visible.
// Usage: node tools/ci/mocha-flaky-retry.js [--timeout=20000] [--log=file] [--ledger] [glob...]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FLAKY = ['test/p2914-memory-leak.test.js', 'test/critical/p3065-flow-storm-soak.test.js'];
const STALE = ['.homeybuild', 'build', '.homeycompose/.cache'];

function cleanStale(root = ROOT) {
  const removed = [];
  for (const d of STALE) { const p = path.join(root, d); if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); removed.push(d); } }
  return removed;
}

/** Pure: failing top-level titles from a mocha spec log. */
function failingTitles(log) {
  const i = log.search(/^ +\d+ failing$/m);
  if (i < 0) {return [];}
  const out = new Set();
  for (const m of log.slice(i).matchAll(/^ {2}\d+\) (.+)$/gm)) {out.add(m[1].trim());}
  return [...out];
}

/** Pure: map failing titles to flaky files; null when one title is not from a flaky file. */
function flakyFilesFor(titles, describesByFile) {
  const files = new Set();
  for (const t of titles) {
    const f = Object.keys(describesByFile).find((k) => describesByFile[k].some((d) => t.startsWith(d)));
    if (!f) {return null;}
    files.add(f);
  }
  return [...files];
}

function describesOf(file) {
  try { return [...fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/describe\(\s*(['"`])(.+?)\1/g)].map((m) => m[2]); } catch (_) { return []; }
}

function mocha(args) {
  const bin = path.join(ROOT, 'node_modules', 'mocha', 'bin', 'mocha.js');
  const r = spawnSync(process.execPath, ['--expose-gc', bin, ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  process.stdout.write(out);
  return { code: r.status === null ? 1 : r.status, out };
}

function ledger(sig, ok) {
  try { const L = require(path.join(ROOT, 'scripts', 'ci', 'autonomy-learn.js')); const f = path.join(ROOT, 'config', 'autonomy-learned.json'); let l; try { l = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { l = { entries: {}, events: [] }; } L.record(l, sig, 'isolated retry once with --expose-gc', ok); fs.writeFileSync(f, `${JSON.stringify(l, null, 2)}\n`); } catch (_) { /* optional */ }
}

function main(argv) {
  const opt = (n, d) => { const a = argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
  const globs = argv.filter((x) => !x.startsWith('--'));
  const removed = cleanStale();
  if (removed.length) {console.log(`[flaky-retry] removed stale build folders: ${removed.join(', ')}`);}
  const timeout = opt('timeout', '20000');
  const first = mocha([...(globs.length ? globs : ['test/**/*.test.js']), '--timeout', timeout]);
  if (opt('log')) {fs.writeFileSync(opt('log'), first.out);}
  if (first.code === 0) {return 0;}
  const titles = failingTitles(first.out);
  const by = Object.fromEntries(FLAKY.map((f) => [f, describesOf(f)]));
  const files = titles.length ? flakyFilesFor(titles, by) : null;
  const sum = (s) => { if (process.env.GITHUB_STEP_SUMMARY) {fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${s}\n`);} };
  if (!files || !files.length) { console.error('[flaky-retry] real failure (not only the flaky allowlist): no retry'); return first.code; }
  console.log(`[flaky-retry] only flaky failures (${files.join(', ')}): one isolated retry`);
  const again = mocha([...files, '--timeout', String(Math.max(Number(timeout), 120000))]);
  const ok = again.code === 0;
  if (argv.includes('--ledger')) {for (const f of files) {ledger(`flaky:${path.basename(f)}`, ok);}}
  sum(`### Flaky retry (P3243)\n${files.map((f) => `- ${f}: isolated retry ${ok ? 'GREEN (flake, reported)' : 'RED (real)'}`).join('\n')}`);
  if (ok) {console.log('::warning::[flaky-retry] heap/timing flake green in isolation; reported, not hidden');}
  return ok ? 0 : again.code;
}

module.exports = { failingTitles, flakyFilesFor, cleanStale, FLAKY, STALE };
if (require.main === module) {process.exit(main(process.argv.slice(2)));}
