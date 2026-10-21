#!/usr/bin/env node
'use strict';
/**
 * P2932 — Branch sync matrix generator (read-only on git).
 *
 * For every master commit in a window that carries a P-tag (feature/fix work,
 * not bot data commits), reports whether stable-v5 and bastien-home already
 * carry it, either by the same P-tag in their own log or by identical file
 * content, and records the port decision kept in
 * config/architecture/sync-decisions.json.
 *
 * Usage (from a master checkout with the three branches fetched):
 *   git fetch origin +refs/heads/stable-v5:refs/remotes/origin/stable-v5 +refs/heads/bastien-home:refs/remotes/origin/bastien-home
 *   node scripts/maintenance/sync-matrix.js [--days 3] [--out docs/knowledge/SYNC_MATRIX_<date>.md]
 *     [--master origin/master] [--stable origin/stable-v5] [--bastien origin/bastien-home]
 *     [--bastien-fleet <path to bastien-publish-fleet-ssot.json>]
 * Without --out it prints Markdown on stdout. Never writes to git.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const DAYS = Number(opt('days', '3'));
const REFS = { master: opt('master', 'origin/master'), stable: opt('stable', 'origin/stable-v5'), bastien: opt('bastien', 'origin/bastien-home') };
const ROOT = path.join(__dirname, '..', '..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).trim();

// Files that are generated, per-branch or bot data: never used to judge a port.
const IGNORE = [/^app\.json$/, /^\.homeychangelog\.json$/, /^package(-lock)?\.json$/, /^data\//, /^docs\/progress\//, /^CREDITS\.md$/, /^\.homeycompose\/app\.json$/, /^docs\/knowledge\//, /^reports\//];
const TAG = /\bP(\d{4})([a-z]?)\b/g;

function tagsOf(subject) { return [...new Set([...subject.matchAll(TAG)].map((m) => `P${m[1]}${m[2]}`))]; }

function targetTags(ref) {
  const out = new Set();
  for (const s of git('log', `--since=${DAYS + 4} days ago`, '--format=%s', ref).split('\n')) for (const t of tagsOf(s)) out.add(t);
  return out;
}

function blob(ref, file) { try { return git('rev-parse', `${ref}:${file}`); } catch { return null; } }

function bastienFleet() {
  const p = opt('bastien-fleet', null);
  let raw = null;
  try { raw = p ? fs.readFileSync(p, 'utf8') : git('show', `${REFS.bastien}:config/architecture/bastien-publish-fleet-ssot.json`); } catch { return null; }
  const j = JSON.parse(raw);
  return { ids: new Set(j.keepDriverIds || []), prefixes: j.alwaysKeepPrefixes || [] };
}

function loadDecisions() {
  const f = path.join(ROOT, 'config', 'architecture', 'sync-decisions.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')).decisions || {}; } catch { return {}; }
}

function main() {
  const lines = git('log', `--since=${DAYS} days ago`, '--no-merges', '--format=%H%x09%ad%x09%s', '--date=iso-strict', REFS.master).split('\n').filter(Boolean);
  const tStable = targetTags(REFS.stable);
  const tBastien = targetTags(REFS.bastien);
  const fleet = bastienFleet();
  const decisions = loadDecisions();
  const rows = [];
  for (const l of lines) {
    const [sha, date, subject] = l.split('\t');
    const tags = tagsOf(subject);
    if (!tags.length) continue; // bot data commits (leads, ledger, version bumps)
    const files = git('show', '--name-only', '--format=', sha).split('\n').filter((f) => f && !IGNORE.some((r) => r.test(f)));
    const drivers = [...new Set(files.map((f) => (f.match(/^drivers\/([^/]+)\//) || [])[1]).filter(Boolean))];
    const judge = (ref, tagSet) => {
      const tagged = tags.some((t) => tagSet.has(t));
      if (!files.length) return tagged ? 'ported (tag)' : 'n/a (data/docs only)';
      let same = 0, missing = 0;
      for (const f of files) { const a = blob(sha, f), b = blob(ref, f); if (a && a === b) same++; else if (!b) missing++; }
      const n = files.length;
      if (same === n) return 'ported (same content)';
      if (tagged && missing === 0) return 'ported (tag, adapted)';
      if (tagged) return `tag seen, ${missing}/${n} files absent`;
      if (same > 0) return `partial ${same}/${n}`;
      return missing === n ? 'missing (new files)' : 'missing';
    };
    let bastienFit = '-';
    if (fleet && drivers.length) {
      const fit = drivers.filter((d) => fleet.ids.has(d) || fleet.prefixes.some((p) => d.startsWith(p)));
      bastienFit = fit.length ? fit.join(', ') : 'none in fleet';
    }
    const key = tags[0];
    const d = decisions[sha.slice(0, 9)] || decisions[key] || {};
    rows.push({ sha: sha.slice(0, 9), date: date.slice(0, 16), tags: tags.join(' '), subject: subject.replace(/\|/g, '/').slice(0, 110),
      stable: judge(REFS.stable, tStable), bastien: judge(REFS.bastien, tBastien), bastienFit, dStable: d.stable || '', dBastien: d.bastien || '', why: d.why || '' });
  }
  const out = [];
  out.push(`# Sync matrix master -> stable-v5 / bastien-home (${new Date().toISOString().slice(0, 10)})`, '');
  out.push(`Generated by \`node scripts/maintenance/sync-matrix.js --days ${DAYS}\` (P2932). Refs: ${REFS.master}, ${REFS.stable}, ${REFS.bastien}.`);
  out.push('Detection: same P-tag in the target log, else identical blob for every non-generated file the commit touched (app.json, data/, package files, CREDITS, journal ignored). Decisions come from `config/architecture/sync-decisions.json`.', '');
  out.push('Policy: features soak 7 days on master before stable-v5; exact sourced couples and crash/CI guards can go same day; Bastien takes only what touches its 30-driver fleet (`config/architecture/bastien-publish-fleet-ssot.json`) or shared runtime/CI.', '');
  out.push('| master | date | tags | subject | stable-v5 | decision stable | bastien-home | Bastien fleet drivers | decision Bastien | why |');
  out.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) out.push(`| ${r.sha} | ${r.date} | ${r.tags} | ${r.subject} | ${r.stable} | ${r.dStable} | ${r.bastien} | ${r.bastienFit} | ${r.dBastien} | ${r.why} |`);
  out.push('', `${rows.length} tagged master commits in the last ${DAYS} days.`);
  const md = out.join('\n') + '\n';
  const o = opt('out', null);
  if (o) { fs.writeFileSync(path.resolve(ROOT, o), md); console.log(`wrote ${o} (${rows.length} rows)`); } else process.stdout.write(md);
}

if (require.main === module) main();
module.exports = { tagsOf, IGNORE };
