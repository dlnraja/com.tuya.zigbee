#!/usr/bin/env node
'use strict';
// P3138 (t736u): fail-closed privacy gate on every GENERATED digest / ledger before commit.
// Usage: node scripts/ci/digest-guard.js [files...]  (default: digests, ledgers, candidates). Exit 1 on any leak.
const fs = require('fs');
const path = require('path');
const { assertClean } = require('../lib/source-digest');
const ROOT = path.join(__dirname, '..', '..');
const DEFAULTS = ['data/ssot/couple-sources.json', 'data/ssot/thread-digests.json', 'data/leads/digest-candidates.json', 'data/ssot/curated-facts.json'];
function targets(argv) {
  if (argv.length) return argv;
  const kd = path.join(ROOT, 'docs/knowledge/upstream');
  const md = fs.existsSync(kd) ? fs.readdirSync(kd).filter((f) => f.endsWith('.md')).map((f) => `docs/knowledge/upstream/${f}`) : [];
  return [...DEFAULTS, ...md];
}
// P3152 (t735u): --delta mode for existing readers (forum, gmail/diag, triage, upstream-watch, johan, kb,
// crash-triage). Checks only lines ADDED vs HEAD (plus untracked files) so legacy ledgers do not block,
// but every NEW generated line must be clean. Machine ISO-8601 run stamps (YYYY-MM-DDThh:mm...) are
// bot metadata, not user routines, and are stripped before the check. Fail closed.
const ISO_RE = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?\b/g;
function addedLines(p) {
  const { execFileSync } = require('child_process');
  const sh = (a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20 }); } catch (_e) { return ''; } };
  const out = [];
  for (const l of sh(['diff', '-U0', 'HEAD', '--', p]).split('\n')) {if (l.startsWith('+') && !l.startsWith('+++')) {out.push(l.slice(1));}}
  for (const f of sh(['ls-files', '--others', '--exclude-standard', '--', p]).split('\n').filter(Boolean)) {
    try { out.push(...fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')); } catch (_e) { /* gone */ }
  }
  return out;
}
function runDelta(paths) {
  const bad = [];
  for (const p of paths) {
    for (const line of addedLines(p)) {
      try { assertClean(line.replace(ISO_RE, '[ts]').replace(/<!-- d:[^>]+-->/g, '')); } catch (e) { bad.push(`${p}: ${e.message}`); break; }
    }
  }
  return bad;
}
function run(argv = []) {
  if (argv[0] === '--delta') {return runDelta(argv.slice(1).flatMap((a) => a.split(/\s+/)).filter(Boolean));}
  const bad = [];
  for (const f of targets(argv)) {
    const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    try { assertClean(fs.readFileSync(p, 'utf8').replace(/<!-- d:[^>]+-->/g, '')); } catch (e) { bad.push(`${f}: ${e.message}`); }
  }
  return bad;
}
if (require.main === module) {
  const bad = run(process.argv.slice(2));
  if (bad.length) { console.error('[digest-guard] FAIL (fail closed)\n' + bad.join('\n')); process.exit(1); }
  console.log('[digest-guard] OK');
}
module.exports = { run, runDelta, ISO_RE };
