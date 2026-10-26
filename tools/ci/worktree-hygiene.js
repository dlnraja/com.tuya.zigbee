#!/usr/bin/env node
'use strict';
/**
 * P3062: bounded clean-up of temporary git worktrees left behind by automation.
 *
 * A worktree is removed only when ALL of these hold:
 *   - its path is under one of the temp roots (default: /tmp) or its basename matches --prefix;
 *   - it is not the main checkout and not locked;
 *   - `git status --porcelain` is empty (no uncommitted work);
 *   - its HEAD is reachable from at least one remote-tracking ref (nothing unpushed);
 *   - it is older than --min-age-hours (default 6) by directory mtime.
 * Branches are never deleted. Dry-run by default; --apply removes at most --max (default 20).
 *
 * Usage: node tools/ci/worktree-hygiene.js [--repo DIR] [--apply] [--max N]
 *          [--min-age-hours H] [--root /tmp] [--prefix tmp-wt-] [--json]
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
}

function parsePorcelain(text) {
  const out = [];
  let cur = null;
  for (const line of String(text || '').split('\n')) {
    if (line.startsWith('worktree ')) { cur = { path: line.slice(9), head: null, branch: null, locked: false, bare: false }; out.push(cur); continue; }
    if (!cur) {continue;}
    if (line.startsWith('HEAD ')) {cur.head = line.slice(5);}
    else if (line.startsWith('branch ')) {cur.branch = line.slice(7);}
    else if (line === 'bare') {cur.bare = true;}
    else if (line === 'locked' || line.startsWith('locked ')) {cur.locked = true;}
  }
  return out;
}

function parseArgs(argv) {
  const o = { repo: process.cwd(), apply: false, max: 20, minAgeHours: 6, roots: [], prefixes: [], json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') {o.apply = true;}
    else if (a === '--json') {o.json = true;}
    else if (a === '--repo') {o.repo = argv[++i];}
    else if (a === '--max') {o.max = Math.max(0, Math.min(200, Number(argv[++i]) || 0));}
    else if (a === '--min-age-hours') {o.minAgeHours = Math.max(0, Number(argv[++i]) || 0);}
    else if (a === '--root') {o.roots.push(path.resolve(argv[++i]));}
    else if (a === '--prefix') {o.prefixes.push(argv[++i]);}
  }
  if (!o.roots.length && !o.prefixes.length) {o.roots.push('/tmp');}
  return o;
}

function inScope(wtPath, opts) {
  const p = path.resolve(wtPath);
  if (opts.roots.some((r) => p === r ? false : p.startsWith(r.endsWith(path.sep) ? r : r + path.sep))) {return true;}
  const base = path.basename(p);
  return opts.prefixes.some((pre) => base.startsWith(pre));
}

/** Decide for one worktree. Returns { remove: bool, reason }. */
function assess(repo, wt, opts, now = Date.now()) {
  if (wt.bare) {return { remove: false, reason: 'bare' };}
  if (path.resolve(wt.path) === path.resolve(repo)) {return { remove: false, reason: 'main checkout' };}
  if (wt.locked) {return { remove: false, reason: 'locked' };}
  if (!inScope(wt.path, opts)) {return { remove: false, reason: 'out of scope' };}
  if (!fs.existsSync(wt.path)) {return { remove: true, reason: 'missing dir (prunable)', prune: true };}
  let st;
  try { st = fs.statSync(wt.path); } catch (_e) { return { remove: false, reason: 'stat failed' }; }
  if (now - st.mtimeMs < opts.minAgeHours * 3600e3) {return { remove: false, reason: 'too recent' };}
  let dirty;
  try { dirty = git(wt.path, ['status', '--porcelain']).trim(); } catch (_e) { return { remove: false, reason: 'status failed' }; }
  if (dirty) {return { remove: false, reason: 'uncommitted changes' };}
  if (!wt.head) {return { remove: false, reason: 'no HEAD' };}
  let remotes = '';
  try { remotes = git(repo, ['branch', '-r', '--contains', wt.head]).trim(); } catch (_e) { remotes = ''; }
  if (!remotes) {return { remove: false, reason: 'HEAD not on any remote' };}
  return { remove: true, reason: 'clean, pushed, old' };
}

function run(opts) {
  const list = parsePorcelain(git(opts.repo, ['worktree', 'list', '--porcelain']));
  const report = { scanned: list.length, removed: [], kept: [], dryRun: !opts.apply };
  for (const wt of list) {
    const v = assess(opts.repo, wt, opts);
    if (!v.remove || report.removed.length >= opts.max) {
      report.kept.push({ path: wt.path, reason: v.remove ? 'max reached' : v.reason });
      continue;
    }
    if (opts.apply && !v.prune) {
      try { git(opts.repo, ['worktree', 'remove', wt.path]); } catch (e) {
        report.kept.push({ path: wt.path, reason: 'remove failed: ' + String(e.message || e).split('\n')[0] });
        continue;
      }
    }
    report.removed.push({ path: wt.path, reason: v.reason });
  }
  if (opts.apply) { try { git(opts.repo, ['worktree', 'prune']); } catch (_e) { /* best effort */ } }
  return report;
}

if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2));
  const r = run(opts);
  if (opts.json) {process.stdout.write(JSON.stringify(r, null, 2) + '\n');}
  else {
    console.log(`[worktree-hygiene] scanned=${r.scanned} ${r.dryRun ? 'would remove' : 'removed'}=${r.removed.length} kept=${r.kept.length}`);
    for (const x of r.removed) {console.log('  -', x.path, '(' + x.reason + ')');}
  }
}

module.exports = { parsePorcelain, parseArgs, inScope, assess, run };
