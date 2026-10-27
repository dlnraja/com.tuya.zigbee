#!/usr/bin/env node
'use strict';
// Stable publish versioning (2026-10-04). Homey rejects a re-upload of an existing version
// ("already been published"), so every stable publish needs a fresh patch version.
//   node stable-version-bump.js bump [--publish-dir DIR]  -> patch+1 everywhere (repo, optional publish dir)
//   node stable-version-bump.js set <version> [--if-higher] -> write <version> into the repo manifests
// The app id is never touched. app.json keeps its on-disk format (minified stays minified).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
function writeLikeOriginal(f, obj) {
  const raw = fs.readFileSync(f, 'utf8');
  const pretty = /\n\s+"/.test(raw);
  fs.writeFileSync(f, (pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)) + (raw.endsWith('\n') ? '\n' : ''));
}
function nextPatch(v) {
  const m = String(v || '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) { throw new Error(`invalid version ${v}`); }
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}
function cmp(a, b) {
  const pa = a.split('.').map(Number); const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if (pa[i] !== pb[i]) { return pa[i] - pb[i]; } }
  return 0;
}
function setVersion(dir, v, { manifestsOnly = false } = {}) {
  const files = manifestsOnly ? ['app.json', 'package.json'] : ['.homeycompose/app.json', 'app.json', 'package.json'];
  for (const rel of files) {
    const f = path.join(dir, rel);
    if (!fs.existsSync(f)) { continue; }
    const j = readJson(f);
    if (rel.endsWith('app.json') && j.id && !/\.stable$/.test(j.id) && dir === ROOT) {
      throw new Error(`refusing to touch non-stable app id ${j.id}`);
    }
    j.version = v;
    writeLikeOriginal(f, j);
  }
  const lock = path.join(dir, 'package-lock.json');
  if (fs.existsSync(lock)) {
    const j = readJson(lock);
    j.version = v;
    if (j.packages && j.packages['']) { j.packages[''].version = v; }
    writeLikeOriginal(lock, j);
  }
  const cl = path.join(dir, '.homeychangelog.json');
  if (fs.existsSync(cl)) {
    const j = readJson(cl);
    let ce = null;
    try { ce = require('../../scripts/automation/changelog-entry'); } catch (_) { ce = null; }
    let changed = false;
    if (!j[v] || !String(j[v].en || '').trim() || isPendingSeed(j[v])) {
      // P3069: a real HOMEY_CHANGELOG wins; otherwise our own en + fr note from the commits since the last bump.
      const given = process.env.HOMEY_CHANGELOG || 'Device compatibility and reliability improvements.';
      j[v] = ce && ce.isPlaceholder(given) ? entryFromCommits(ROOT, ce) : { en: given };
      changed = true;
    }
    // P3075 (t613u): seed the next patch so the pending-entry check stays green after every bump;
    // a hand-written pending entry is kept, the seed is replaced at the next bump (above).
    const nx = nextPatch(v);
    if (!manifestsOnly && (!j[nx] || !String(j[nx].en || '').trim())) { j[nx] = { ...PENDING_SEED }; changed = true; }
    if (changed) { writeLikeOriginal(cl, ce ? ce.orderChangelog(j) : j); }
  }
}

// P3075 (t613u): pending entry for the next patch, in our own words; recognised and replaced at the next bump.
const PENDING_SEED = {
  en: 'Next stable update in preparation: this note is replaced by the list of its changes when the version is published.',
  fr: 'Prochaine mise à jour stable en préparation : cette note est remplacée par la liste de ses changements à la publication.',
};
function isPendingSeed(e) { return !!e && String(e.en || '').trim() === PENDING_SEED.en; }

/** Our commit subjects since the previous version bump ("chore(stable): v5.12.512", "v9.0.1601: …"), newest first. */
function subjectsSinceBump(cwd, max = 400) {
  let log = '';
  try { log = require('child_process').execFileSync('git', ['log', '--no-merges', '--format=%s', '-n', String(max)], { cwd, encoding: 'utf8' }); } catch (_) { return []; }
  let bumpOf = null;
  try { bumpOf = require('../../scripts/automation/changelog-backfill').bumpOf; } catch (_) { bumpOf = null; }
  const out = [];
  for (const s of log.split('\n')) {
    const t = s.trim();
    if (!t) { continue; }
    if (/^v\d+\.\d+\.\d+: \d+ drivers/.test(t) || (bumpOf ? bumpOf(t) : /^chore\(stable\): v\d+\.\d+\.\d+/.test(t))) { break; }
    out.push(t);
  }
  return out;
}

/** Granular en + fr note (families, model ids, kind of change); never the generic "Bug fixes and improvements". */
function entryFromCommits(cwd, ce) {
  const subjects = subjectsSinceBump(cwd);
  try { return require('../../scripts/automation/changelog-backfill').describe(subjects); } catch (_) { /* older tree */ }
  return ce.summarize(subjects.length ? subjects : ce.subjectsSinceLastPublish(cwd));
}

function currentVersion() {
  const vs = ['.homeycompose/app.json', 'app.json', 'package.json']
    .map((r) => path.join(ROOT, r)).filter((f) => fs.existsSync(f)).map((f) => readJson(f).version).filter(Boolean);
  return vs.sort(cmp).pop();
}

module.exports = { nextPatch, cmp, setVersion, currentVersion, PENDING_SEED, isPendingSeed, subjectsSinceBump, entryFromCommits };

if (require.main === module) {
  const [cmd, arg, arg2] = process.argv.slice(2);
  let v;
  if (cmd === 'bump') {
    v = nextPatch(currentVersion());
    setVersion(ROOT, v);
    const pd = arg === '--publish-dir' ? arg2 : null;
    if (pd) { setVersion(pd, v, { manifestsOnly: true }); }
    console.log(`stable version -> ${v}${pd ? ` (publish dir ${pd})` : ''}`);
  } else if (cmd === 'set' && arg) {
    v = arg;
    const cur = currentVersion();
    if (arg2 === '--if-higher' && cur && cmp(v, cur) <= 0) {
      console.log(`stable version ${cur} already >= ${v}; unchanged`);
    } else {
      setVersion(ROOT, v);
      console.log(`stable version set ${v}`);
    }
  } else {
    console.error('usage: bump [--publish-dir DIR] | set <version>');
    process.exit(2);
  }
  if (process.env.GITHUB_OUTPUT) { fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${v}\n`); }
}
