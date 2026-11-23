#!/usr/bin/env node
'use strict';
/**
 * P3388 - nightly master -> bastien-home backport (owner rule t1022u, t737u).
 *
 * Deterministic, no AI. Runs inside a bastien-home checkout that has origin/master fetched.
 *   plan      list master fix/feat/perf commits and classify them (no change)
 *   apply     cherry-pick the eligible ones (-x), one commit each, drop identity/workflow paths
 *   finalize  --result green|red|rejected|outside-window|dry-run [--pushed <sha>]
 *
 * Never pushes, never force-pushes, never opens an issue or PR: the workflow pushes only when
 * the same gates as .githooks/pre-push are green and the Paris clock is inside 23:00-06:00.
 * The ledger (JSON) keeps bounded attempts: a conflict is retried maxConflictAttempts nights,
 * a red suite maxRedAttempts nights (one commit per night while isolating), then needs-manual.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const DEFAULT_CONFIG = {
  includeTypes: ['fix', 'feat', 'perf'],
  excludeIds: ['P3380', 'P3381', 'P3382', 'P3383'],
  excludeSubjectPatterns: ['\\[auto:', 'alt[- ]?control', '^chore\\(version\\)', '^Merge '],
  excludeBodyPatterns: ['\\[no-bastien\\]', '[Mm]aster only', 'never Bastien', 'not for Bastien', 'Bastien-excluded'],
  requireAnyPathPrefix: ['lib/', 'drivers/', 'app.js'],
  dropPathPrefixes: ['.github/', 'app.json', '.homeycompose/app.json', 'package.json', 'package-lock.json',
    'pnpm-lock.yaml', '.homeychangelog.json', 'README', 'data/status/', 'docs/ssot/referentials/'],
  manualPathPatterns: ['driver\\.compose\\.json$', 'driver\\.flow\\.compose\\.json$',
    'driver\\.settings\\.compose\\.json$', '^\\.homeycompose/'],
  sinceDate: '2026-11-15',
  lookbackDays: 21,
  maxPicksPerRun: 12,
  maxAttemptsPerRun: 40,
  maxConflictAttempts: 3,
  maxRedAttempts: 2,
};

function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts }).trim();
}

function tryGit(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}` };
}

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_e) { return fallback; }
}

function pIds(text) {
  return [...new Set(String(text || '').match(/\bP\d{4}[a-z]?\b/g) || [])];
}

function normSubject(subject) {
  return String(subject || '').replace(/\s*\[skip ci\]\s*/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function commitType(subject) {
  const m = /^([a-z]+)(\([^)]*\))?!?:/.exec(String(subject || ''));
  return m ? m[1] : null;
}

/** Pure classification (unit-tested). ctx: { cfg, driverExists(id), targetText, ledgerEntry } */
function classify(commit, ctx) {
  const cfg = ctx.cfg;
  const { sha, subject, body, files } = commit;
  const type = commitType(subject);
  if (!type || !cfg.includeTypes.includes(type)) {return { status: 'skip', reason: `type:${type || 'none'}` };}
  for (const re of cfg.excludeSubjectPatterns) {
    if (new RegExp(re, 'i').test(subject)) {return { status: 'skip', reason: `subject:${re}` };}
  }
  for (const re of cfg.excludeBodyPatterns) {
    if (new RegExp(re).test(body || '')) {return { status: 'skip', reason: `body:${re}` };}
  }
  const ids = pIds(`${subject}`);
  const excl = ids.filter((id) => cfg.excludeIds.includes(id.replace(/[a-z]$/, '')));
  // a range like P3380-P3383 names every id in it
  const range = /P(\d{4})-P(\d{4})/.exec(subject);
  if (range) {
    for (let n = Number(range[1]); n <= Number(range[2]); n++) {
      if (cfg.excludeIds.includes(`P${n}`)) {excl.push(`P${n}`);}
    }
  }
  if (excl.length) {return { status: 'skip', reason: `excluded-id:${[...new Set(excl)].join(',')}` };}
  const text = ctx.targetText || '';
  if (text.includes(`cherry picked from commit ${sha}`) || text.includes(sha.slice(0, 10))) {
    return { status: 'skip', reason: 'already-present' };
  }
  // a hand port usually keeps the master subject (minus [skip ci])
  if (ctx.targetSubjects && ctx.targetSubjects.has(normSubject(subject))) {
    return { status: 'skip', reason: 'already-present (same subject)' };
  }
  const kept = files.filter((f) => !cfg.dropPathPrefixes.some((p) => f === p || f.startsWith(p)));
  if (!kept.some((f) => cfg.requireAnyPathPrefix.some((p) => f === p || f.startsWith(p)))) {
    return { status: 'skip', reason: 'no-shared-lib-or-driver-change' };
  }
  const absent = [...new Set(kept.map((f) => (/^drivers\/([^/]+)\//.exec(f) || [])[1]).filter(Boolean))]
    .filter((id) => !ctx.driverExists(id));
  if (absent.length) {return { status: 'skip', reason: `driver-absent-on-bastien:${absent.join(',')}` };}
  const manual = kept.filter((f) => cfg.manualPathPatterns.some((re) => new RegExp(re).test(f)));
  if (manual.length) {return { status: 'needs-manual', reason: `compose-change:${manual.slice(0, 4).join(',')}` };}
  const le = ctx.ledgerEntry;
  if (le) {
    if (le.status === 'picked' || le.status === 'needs-manual') {return { status: 'skip', reason: `ledger:${le.status}` };}
    if ((le.conflicts || 0) >= cfg.maxConflictAttempts || (le.reds || 0) >= cfg.maxRedAttempts) {
      return { status: 'needs-manual', reason: `bounded:${le.conflicts || 0}c/${le.reds || 0}r` };
    }
  }
  const idsHere = ids.filter((id) => new RegExp(`\\b${id}\\b`).test(text));
  return { status: 'eligible', reason: idsHere.length ? `id-seen-on-bastien:${idsHere.join(',')}` : 'new', keptFiles: kept };
}

function listMasterCommits(masterRef, cfg) {
  const floor = new Date(Date.now() - cfg.lookbackDays * 86400000).toISOString().slice(0, 10);
  const since = cfg.sinceDate && cfg.sinceDate > floor ? cfg.sinceDate : floor;
  const raw = git(['log', '--first-parent', '--no-merges', '--reverse', `--since=${since}`,
    '--format=%H%x1f%s%x1f%b%x1e', masterRef]);
  return raw.split('\x1e').map((r) => r.trim()).filter(Boolean).map((r) => {
    const [sha, subject, body] = r.split('\x1f');
    const files = git(['diff-tree', '--no-commit-id', '--name-only', '-r', sha]).split('\n').filter(Boolean);
    return { sha, subject, body: body || '', files };
  });
}

function latin1Problems(files) {
  const bad = [];
  for (const f of files) {
    if (!/\.(js|cjs|mjs)$/.test(f) || !/^(lib|drivers)\/|^app\.js$/.test(f) || !fs.existsSync(f)) {continue;}
    const s = fs.readFileSync(f, 'utf8');
    for (const ch of s) { if (ch.codePointAt(0) > 0xff) { bad.push(f); break; } }
  }
  return bad;
}

/** Conflicts only on dropped paths (identity, workflows, referentials) keep bastien's side. */
function resolveDroppedConflicts(kept) {
  const unmerged = git(['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);
  if (!unmerged.length || unmerged.some((f) => kept.includes(f))) {return false;}
  for (const f of unmerged) {
    if (tryGit(['cat-file', '-e', `HEAD:${f}`]).ok) {git(['checkout', 'HEAD', '--', f]);}
    else {tryGit(['rm', '-q', '-f', '--', f]);}
  }
  return git(['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean).length === 0;
}

function applyOne(c, kept) {
  const r = tryGit(['cherry-pick', '-x', '--no-commit', c.sha]);
  if (!r.ok && !resolveDroppedConflicts(kept)) {
    tryGit(['cherry-pick', '--abort']);
    tryGit(['reset', '--hard', 'HEAD']);
    return { ok: false, kind: 'conflict', detail: r.out.split('\n').filter((l) => /CONFLICT|error/.test(l)).slice(0, 5).join(' | ') };
  }
  tryGit(['cherry-pick', '--quit']);
  // drop identity / workflow paths: keep bastien's own version
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  for (const f of staged) {
    if (kept.includes(f)) {continue;}
    if (tryGit(['cat-file', '-e', `HEAD:${f}`]).ok) {git(['checkout', 'HEAD', '--', f]);}
    else {git(['rm', '-q', '--cached', '-f', '--', f]); try { fs.rmSync(f, { force: true }); } catch (_e) { /* soft */ }}
  }
  const left = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  if (!left.length) {tryGit(['reset', '--hard', 'HEAD']); return { ok: false, kind: 'empty', detail: 'already applied' };}
  const bad = latin1Problems(left);
  if (bad.length) {tryGit(['reset', '--hard', 'HEAD']); return { ok: false, kind: 'manual', detail: `latin1:${bad.join(',')}` };}
  const author = git(['log', '-1', '--format=%an <%ae>', c.sha]);
  const date = git(['log', '-1', '--format=%aI', c.sha]);
  const msg = `${git(['log', '-1', '--format=%B', c.sha])}\n\n(cherry picked from commit ${c.sha})\nBackport: P3388 bastien-backport-nightly\n`;
  const tmp = path.join(require('os').tmpdir(), `bp-${c.sha}.msg`);
  fs.writeFileSync(tmp, msg);
  const cr = spawnSync('git', ['commit', '-q', `--author=${author}`, `--date=${date}`, '-F', tmp],
    { encoding: 'utf8' });
  if (cr.status !== 0) {tryGit(['reset', '--hard', 'HEAD']); return { ok: false, kind: 'manual', detail: (cr.stderr || '').slice(0, 200) };}
  return { ok: true, sha: git(['rev-parse', 'HEAD']), files: left };
}

function parseArgs(argv) {
  const a = { cmd: argv[0] || 'plan' };
  for (let i = 1; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    a[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return a;
}

function writeReport(file, ledger, run) {
  const lines = [`# Bastien backport ${run.at}`, '', `result: ${run.result || 'pending'}  picked: ${run.picked.length}  ` +
    `conflicts: ${run.conflicts.length}  needs-manual: ${run.manual.length}`, ''];
  const sect = (title, rows) => { if (rows.length) { lines.push(`## ${title}`, ...rows.map((r) => `- ${r}`), ''); } };
  sect('Picked (pending gates)', run.picked);
  sect('Conflicts (retried next night, bounded)', run.conflicts);
  sect('Candidate tasks (needs-manual)', run.manual);
  sect('Skipped', run.skipped.slice(0, 80));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = { ...DEFAULT_CONFIG, ...loadJson(args.config || 'config/ci/bastien-backport.json', {}) };
  const ledgerFile = args.ledger || '.bastien-backport/ledger.json';
  const reportFile = args.report || '.bastien-backport/report.md';
  const ledger = loadJson(ledgerFile, { entries: {}, runs: [] });
  ledger.entries = ledger.entries || {};
  const masterRef = args.master || 'origin/master';
  const now = new Date().toISOString();

  if (args.cmd === 'finalize') {
    const result = String(args.result || 'red');
    const run = (ledger.runs || [])[ledger.runs.length - 1] || {};
    run.result = result;
    for (const [sha, e] of Object.entries(ledger.entries)) {
      if (e.status !== 'pending') {continue;}
      if (result === 'green') { e.status = 'picked'; e.pushed = args.pushed || null; }
      else if (result === 'red') {
        e.reds = (e.reds || 0) + 1;
        e.status = e.reds >= cfg.maxRedAttempts ? 'needs-manual' : 'red';
        e.reason = `full gates red (${e.reds}/${cfg.maxRedAttempts})`;
      } else { e.status = 'retry'; e.reason = result; }
      e.at = now;
      ledger.entries[sha] = e;
    }
    ledger.updatedAt = now;
    fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
    fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
    console.log(`[P3388] finalize ${result}`);
    return;
  }

  const targetText = git(['log', '-600', '--format=%s%n%b']);
  const targetSubjects = new Set(git(['log', '-1500', '--format=%s']).split('\n').map(normSubject));
  const commits = listMasterCommits(masterRef, cfg);
  const isolating = Object.values(ledger.entries).some((e) => e.status === 'red');
  const maxPicks = isolating ? 1 : cfg.maxPicksPerRun;
  const run = { at: now, picked: [], conflicts: [], manual: [], skipped: [], isolating };
  let picks = 0; let attempts = 0;
  // while isolating a red night, retry the red commits first, one per night
  const ordered = isolating
    ? [...commits.filter((c) => ledger.entries[c.sha]?.status === 'red'), ...commits.filter((c) => ledger.entries[c.sha]?.status !== 'red')]
    : commits;
  for (const c of ordered) {
    const le = ledger.entries[c.sha];
    const v = classify(c, { cfg, targetText, targetSubjects, ledgerEntry: le, driverExists: (id) => fs.existsSync(path.join('drivers', id)) });
    const tag = `${c.sha.slice(0, 10)} ${c.subject.slice(0, 110)}`;
    if (v.status === 'skip') { run.skipped.push(`${tag} (${v.reason})`); continue; }
    if (v.status === 'needs-manual') {
      run.manual.push(`${tag} (${v.reason})`);
      ledger.entries[c.sha] = { ...le, subject: c.subject, status: 'needs-manual', reason: v.reason, at: now };
      continue;
    }
    if (picks >= maxPicks || attempts >= cfg.maxAttemptsPerRun) { run.skipped.push(`${tag} (run cap)`); continue; }
    attempts++;
    if (args.cmd !== 'apply') { run.picked.push(`${tag} (plan: ${v.reason})`); picks++; continue; }
    const r = applyOne(c, v.keptFiles);
    const e = { ...le, subject: c.subject, at: now };
    if (r.ok) {
      picks++;
      Object.assign(e, { status: 'pending', bastienSha: r.sha, reason: v.reason });
      run.picked.push(`${tag} -> ${r.sha.slice(0, 10)} (${v.reason})`);
    } else if (r.kind === 'empty') {
      Object.assign(e, { status: 'picked', reason: 'empty: already on bastien-home' });
      run.skipped.push(`${tag} (empty, already applied)`);
    } else if (r.kind === 'conflict') {
      e.conflicts = (e.conflicts || 0) + 1;
      e.status = e.conflicts >= cfg.maxConflictAttempts ? 'needs-manual' : 'conflict';
      e.reason = `conflict ${e.conflicts}/${cfg.maxConflictAttempts}: ${r.detail}`;
      (e.status === 'needs-manual' ? run.manual : run.conflicts).push(`${tag} (${e.reason})`);
    } else {
      Object.assign(e, { status: 'needs-manual', reason: r.detail });
      run.manual.push(`${tag} (${r.detail})`);
    }
    ledger.entries[c.sha] = e;
  }
  ledger.runs = [...ledger.runs || [], { at: now, picked: run.picked.length, conflicts: run.conflicts.length,
    manual: run.manual.length, isolating }].slice(-30);
  ledger.updatedAt = now;
  if (args.cmd === 'apply') {
    fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
    fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
  }
  writeReport(reportFile, ledger, run);
  console.log(fs.readFileSync(reportFile, 'utf8'));
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `picked=${args.cmd === 'apply' ? picks : 0}\n`);
  }
}

module.exports = { classify, commitType, normSubject, pIds, DEFAULT_CONFIG };
if (require.main === module) {main();}
