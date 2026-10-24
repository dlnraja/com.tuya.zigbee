'use strict';

/**
 * P3019d: three-way promote decision (merge-base / target / Bastien) for cross-branch promotes.
 *
 * WHY: bastien-promote-upstream listed files by plain diff (HEAD vs bastien-home) and wrote
 * Bastien bytes. Where the TARGET was ahead (master-first behaviour changes in lib/**, tests,
 * docs) that silently reverted the target to Bastien's older copy. Now only what Bastien changed
 * since the merge-base is promoted, both-sided changes go through `git merge-file`, a conflict is
 * skipped and reported (`conflict_skipped`), and a result must keep every target-only line.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function git(rootDir, args, opts = {}) {
  return execFileSync('git', args, {
    cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, ...opts,
  });
}

/** Raw blob at rev:rel (no trimming), or null when absent. */
function readAt(rootDir, rev, rel) {
  if (!rev) {return null;}
  try {
    return git(rootDir, ['show', `${rev}:${rel}`]);
  } catch {
    return null;
  }
}

function readWorktree(rootDir, rel) {
  const abs = path.join(rootDir, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

function mergeBaseOf(rootDir, ref, head = 'HEAD') {
  try {
    return git(rootDir, ['merge-base', head, ref]).trim() || null;
  } catch {
    return null;
  }
}

/** Files Bastien changed since the merge-base (adds/modifies/deletes). null when no merge-base. */
function listChangedSinceBase(rootDir, base, ref) {
  if (!base) {return null;}
  const out = git(rootDir, ['diff', '--name-only', '--no-renames', base, ref]);
  return out.split(/\r?\n/).map((l) => l.trim().replace(/\\/g, '/')).filter(Boolean).sort();
}

function sameText(a, b) {
  if (a == null || b == null) {return a === b;}
  return a.replace(/\r\n/g, '\n').replace(/\n+$/, '') === b.replace(/\r\n/g, '\n').replace(/\n+$/, '');
}

function lines(t) {
  return String(t || '').replace(/\r\n/g, '\n').split('\n');
}

/** Target-only lines (added since base, multiset) that the result no longer contains. */
function droppedTargetLines(base, ours, result) {
  const count = (arr) => arr.reduce((m, l) => m.set(l, (m.get(l) || 0) + 1), new Map());
  const b = count(lines(base));
  const r = count(lines(result));
  const dropped = [];
  for (const [l, n] of count(lines(ours).filter((x) => x.trim()))) {
    const targetOnly = n - (b.get(l) || 0);
    if (targetOnly > 0 && (r.get(l) || 0) < targetOnly) {dropped.push(l);}
  }
  return dropped;
}

/** `git merge-file -p ours base theirs` → { clean, text, conflicts }. Never throws. */
function mergeFileText(ours, base, theirs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3019d-merge-'));
  const f = (n, t) => { const p = path.join(dir, n); fs.writeFileSync(p, t == null ? '' : t); return p; };
  const o = f('ours', ours);
  const b = f('base', base);
  const t = f('theirs', theirs);
  try {
    const text = execFileSync('git', ['merge-file', '-p', '-L', 'target', '-L', 'base', '-L', 'bastien', o, b, t], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
    });
    return { clean: true, text, conflicts: 0 };
  } catch (e) {
    const n = typeof e.status === 'number' ? e.status : -1;
    return { clean: false, text: null, conflicts: n > 0 ? n : -1, error: n > 0 ? undefined : String(e.message || e) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Pure decision. base/ours/theirs are file texts (null = absent).
 *  skip  — reason: missing_on_bastien | identical | target_ahead | deleted_on_target | conflict_skipped
 *          | would_drop_target_lines | merge_error
 *  take  — only Bastien changed since base (target == base) → Bastien bytes
 *  create— new on Bastien since base, absent on target
 *  merge — both changed, git merge-file clean and every target-only line kept → merged text
 */
function decideThreeWay({ base, ours, theirs }, merge = mergeFileText) {
  if (theirs == null) {return { action: 'skip', reason: 'missing_on_bastien' };} // never delete
  if (ours != null && sameText(ours, theirs)) {return { action: 'skip', reason: 'identical' };}
  if (base != null && sameText(base, theirs)) {return { action: 'skip', reason: 'target_ahead' };}
  if (ours == null) {
    return base == null ? { action: 'create', text: theirs } : { action: 'skip', reason: 'deleted_on_target' };
  }
  if (base != null && sameText(base, ours)) {return { action: 'take', text: theirs };}
  const m = merge(ours, base == null ? '' : base, theirs);
  if (!m.clean) {
    return m.conflicts > 0
      ? { action: 'skip', reason: 'conflict_skipped', conflicts: m.conflicts }
      : { action: 'skip', reason: 'merge_error', error: m.error };
  }
  const dropped = droppedTargetLines(base, ours, m.text);
  if (dropped.length) {return { action: 'skip', reason: 'would_drop_target_lines', dropped: dropped.slice(0, 5) };}
  return { action: 'merge', text: m.text };
}

function parseJson(t) {
  if (t == null) {return null;}
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
}

function minus(arr, baseArr, keyOf = (x) => JSON.stringify(x)) {
  if (!Array.isArray(arr)) {return arr;}
  const seen = new Set((Array.isArray(baseArr) ? baseArr : []).map(keyOf));
  return arr.filter((x) => !seen.has(keyOf(x)));
}

/**
 * P3019d: the part of a Bastien JSON file that Bastien ADDED since the merge-base. The union
 * mergers only append, so feeding them this delta (not Bastien's full file) means an entry the
 * target removed on purpose since the base (a couple moved to its dedicated driver, a curated
 * removal) is never re-added. Returns null when base/theirs is not parseable (caller skips).
 */
function semanticDelta(rel, baseText, theirsText) {
  const theirs = parseJson(theirsText);
  if (!theirs || typeof theirs !== 'object') {return null;}
  if (baseText == null) {return theirs;}
  const base = parseJson(baseText);
  if (!base || typeof base !== 'object') {return null;}
  const out = JSON.parse(JSON.stringify(theirs));
  if (/driver\.compose\.json$/.test(rel)) {
    const bz = base.zigbee || {};
    if (out.zigbee && typeof out.zigbee === 'object') {
      out.zigbee.manufacturerName = minus(out.zigbee.manufacturerName, bz.manufacturerName, String);
      out.zigbee.productId = minus(out.zigbee.productId, bz.productId, String);
      const ep = (z) => (z && z.endpoints && (z.endpoints['1'] || z.endpoints[1])) || null;
      const tep = ep(out.zigbee);
      if (tep && Array.isArray(tep.clusters)) {tep.clusters = minus(tep.clusters, (ep(bz) || {}).clusters, Number);}
    }
    out.capabilities = minus(out.capabilities, base.capabilities);
    out.settings = minus(out.settings, base.settings, (s) => String(s && s.id));
    return out;
  }
  if (Array.isArray(out.cases)) {out.cases = minus(out.cases, base.cases, (c) => String(c && c.id));}
  if (Array.isArray(out.couples)) {
    out.couples = minus(out.couples, base.couples,
      (c) => `${String((c && c.mfr) || '').toLowerCase()}|${String((c && c.pid) || '')}|${String((c && c.driverId) || '')}`);
  }
  return out;
}

/** True when a semanticDelta carries nothing to append. */
function deltaIsEmpty(rel, d) {
  if (!d) {return true;}
  const n = (a) => Array.isArray(a) ? a.length : 0;
  if (/driver\.compose\.json$/.test(rel)) {
    const z = d.zigbee || {};
    const ep = (z.endpoints && (z.endpoints['1'] || z.endpoints[1])) || {};
    return !(n(z.manufacturerName) || n(z.productId) || n(ep.clusters) || n(d.capabilities) || n(d.settings));
  }
  return !(n(d.cases) || n(d.couples));
}

module.exports = {
  semanticDelta,
  deltaIsEmpty,
  readAt,
  readWorktree,
  mergeBaseOf,
  listChangedSinceBase,
  mergeFileText,
  decideThreeWay,
  droppedTargetLines,
  sameText,
};
