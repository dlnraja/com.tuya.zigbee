'use strict';
// WHY(P3199, 01/11/2026 Paris): auto-enrich-closed-loop-ledger lost its findings on #557 ("conflit de rebase",
// run 41354032591) because two workers append to data/progress/ledger.json at the same time. Ledger/lead JSON
// files are append-mostly maps, so a rebase conflict on them is resolved structurally: union of keys, recurse
// into objects, union arrays (dedup), and on a scalar clash keep the value of the commit being replayed (newer
// run). Any other conflicted path, or unparsable JSON, keeps the old behaviour (abort, report).
const fs = require('fs');
const path = require('path');

const MERGEABLE = /^data\/(progress|leads)\/[^\s]+\.json$/;

function mergeJson(base, mine) {
  if (Array.isArray(base) && Array.isArray(mine)) {
    const seen = new Set(base.map((x) => JSON.stringify(x)));
    return base.concat(mine.filter((x) => { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; }));
  }
  if (base && mine && typeof base === 'object' && typeof mine === 'object' && !Array.isArray(base) && !Array.isArray(mine)) {
    const out = { ...base };
    for (const k of Object.keys(mine)) out[k] = k in base ? mergeJson(base[k], mine[k]) : mine[k];
    return out;
  }
  return mine === undefined ? base : mine;
}

/** Resolve every conflicted file of an in-progress rebase; returns {ok, files, details}. */
function resolveRebaseConflicts({ git, cwd }) {
  const files = git('diff', '--name-only', '--diff-filter=U').stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!files.length) return { ok: false, files, details: 'no conflicted files listed' };
  const bad = files.filter((f) => !MERGEABLE.test(f));
  if (bad.length) return { ok: false, files, details: `non-mergeable: ${bad.join(', ')}` };
  for (const f of files) {
    const up = git('show', `:2:${f}`); const me = git('show', `:3:${f}`);
    if (up.status !== 0 || me.status !== 0) return { ok: false, files, details: `missing stage for ${f}` };
    let a; let b;
    try { a = JSON.parse(up.stdout); b = JSON.parse(me.stdout); } catch (e) { return { ok: false, files, details: `bad JSON ${f}: ${e.message}` }; }
    fs.writeFileSync(path.join(cwd, f), `${JSON.stringify(mergeJson(a, b), null, 1)}\n`);
    if (git('add', '--', f).status !== 0) return { ok: false, files, details: `git add failed ${f}` };
  }
  return { ok: true, files, details: '' };
}

module.exports = { mergeJson, resolveRebaseConflicts, MERGEABLE };
