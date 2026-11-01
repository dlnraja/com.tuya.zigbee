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
function run(argv = []) {
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
module.exports = { run };
