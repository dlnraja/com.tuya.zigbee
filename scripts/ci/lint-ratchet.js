#!/usr/bin/env node
/**
 * P3025 — ESLint ratchet for the `npm run lint` scope (lib/ drivers/).
 *
 * The scope carried thousands of pre-existing errors, so a plain `eslint` gate is always red and
 * therefore ignored. This gate fails only on REGRESSIONS against .github/lint-baseline.json:
 *   - the total error count may only go down;
 *   - no file may have more errors than its baseline (a file absent from the baseline = 0),
 *     so new errors on changed files are blocked even when other files improved.
 * Modes:
 *   (default)          check the whole scope
 *   --changed[=REF]    check only files changed vs REF (default origin/HEAD merge-base) — fast hook mode
 *   --update-baseline  rewrite the baseline (refuses to raise the total unless --allow-raise)
 *   --fix-safe[=DIR]   apply ONLY safe, layout-preserving autofixes (curly, no-extra-semi, no-extra-parens)
 *   --json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE = path.join(ROOT, '.github', 'lint-baseline.json');
const SCOPE = ['lib', 'drivers'];
const SAFE_RULES = new Set(['curly', 'no-extra-semi', 'no-extra-parens']);

function loadEslint() {
  const m = require(require.resolve('eslint', { paths: [ROOT] }));
  return m.ESLint || (m.default && m.default.ESLint);
}

function rel(p) { return path.relative(ROOT, p).split(path.sep).join('/'); }

function inScope(f) { return /\.js$/.test(f) && SCOPE.some(d => f === d || f.startsWith(d + '/')); }

async function lintFiles(targets, opts = {}) {
  const ESLint = loadEslint();
  const eslint = new ESLint({ cwd: ROOT, extensions: ['.js'], ...(opts.fix ? { fix: m => SAFE_RULES.has(m.ruleId) } : {}) });
  const files = targets.length ? targets : SCOPE;
  const results = await eslint.lintFiles(files);
  if (opts.fix) {await ESLint.outputFixes(results);}
  const counts = {};
  for (const r of results) {if (r.errorCount) {counts[rel(r.filePath)] = r.errorCount;}}
  return counts;
}

function compare(baseline, counts, onlyFiles) {
  const regressions = [];
  const base = (baseline && baseline.files) || {};
  const keys = onlyFiles ? onlyFiles : Object.keys(counts);
  for (const f of keys) {
    const now = counts[f] || 0; const was = base[f] || 0;
    if (now > was) {regressions.push({ file: f, was, now });}
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!onlyFiles && baseline && total > baseline.total) {regressions.push({ file: '(total)', was: baseline.total, now: total });}
  return { total, regressions };
}

function changedFiles(ref) {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
  let base = ref;
  if (!base) {
    for (const cand of ['@{upstream}', 'origin/HEAD', 'origin/master']) {
      try { base = git('merge-base', 'HEAD', cand); break; } catch (_) { /* next */ }
    }
  }
  const out = new Set();
  const add = s => s.split('\n').filter(Boolean).forEach(f => out.add(f));
  if (base) {add(git('diff', '--name-only', '--diff-filter=ACMR', base, 'HEAD'));}
  add(git('diff', '--name-only', '--diff-filter=ACMR', '--cached'));
  return [...out].filter(inScope).filter(f => fs.existsSync(path.join(ROOT, f)));
}

function readBaseline() { try { return JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (_) { return null; } }

async function main(argv) {
  const json = argv.includes('--json');
  const fixArg = argv.find(a => a === '--fix-safe' || a.startsWith('--fix-safe='));
  if (fixArg) {
    const dir = fixArg.includes('=') ? fixArg.split('=')[1] : '';
    const before = await lintFiles(dir ? [dir] : []);
    const after = await lintFiles(dir ? [dir] : [], { fix: true });
    const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
    console.log(`fix-safe ${dir || SCOPE.join(' ')}: ${sum(before)} → ${sum(after)} error(s)`);
    return 0;
  }
  const baseline = readBaseline();
  if (argv.includes('--update-baseline')) {
    const counts = await lintFiles([]);
    const { total } = compare(null, counts);
    if (baseline && total > baseline.total && !argv.includes('--allow-raise')) {
      console.error(`refusing to raise lint baseline ${baseline.total} → ${total} (use --allow-raise only with a reason)`);
      return 1;
    }
    const files = {}; for (const k of Object.keys(counts).sort()) {files[k] = counts[k];}
    fs.writeFileSync(BASELINE, JSON.stringify({ note: 'P3025 lint ratchet — counts may only go down; regenerate with --update-baseline', total, files }, null, 1) + '\n');
    console.log(`lint baseline written: ${total} error(s) in ${Object.keys(files).length} file(s)`);
    return 0;
  }
  if (!baseline) { console.error('no .github/lint-baseline.json — run with --update-baseline'); return 1; }
  const changedArg = argv.find(a => a === '--changed' || a.startsWith('--changed='));
  let only = null;
  if (changedArg) {
    only = changedFiles(changedArg.includes('=') ? changedArg.split('=')[1] : '');
    if (!only.length) { console.log('lint ratchet: no changed lib/ drivers/ JS file'); return 0; }
  }
  const counts = await lintFiles(only || []);
  const res = compare(baseline, counts, only);
  if (json) {console.log(JSON.stringify(res, null, 2));}
  if (res.regressions.length) {
    for (const r of res.regressions.slice(0, 40)) {console.error(`❌ lint regression ${r.file}: ${r.was} → ${r.now}`);}
    console.error('Fix the new errors (npx eslint <file>), or lower debt; the baseline may only go down.');
    return 1;
  }
  console.log(`✅ lint ratchet: ${only ? only.length + ' changed file(s) ok' : `${res.total} ≤ baseline ${baseline.total}`}`);
  return 0;
}

module.exports = { compare, inScope, SAFE_RULES };

if (require.main === module) {
  main(process.argv.slice(2)).then(c => process.exit(c), e => { console.error('lint ratchet crashed:', e && e.message); process.exit(2); });
}
