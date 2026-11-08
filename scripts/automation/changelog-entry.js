#!/usr/bin/env node
'use strict';
/**
 * scripts/automation/changelog-entry.js — P3069: one short, human changelog line per published
 * version (en + fr), written in our own words from our own commit subjects since the previous
 * publish. Replaces the old placeholder "automated publish, manifest sync, and Homey test promotion".
 *
 * - Existing entries are kept as they are (additive). Only a missing or placeholder entry is filled.
 * - Version keys are written newest first; non-version keys (the legacy "changelog" array) stay on top.
 * - No network, no AI, no third-party text: only our commit subjects, reduced to topic words.
 *
 * CLI: node scripts/automation/changelog-entry.js --version 9.0.1603 [--file .homeychangelog.json] [--dry]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

let RW = null;
try { RW = require('../lib/report-writer'); } catch (_) { RW = null; }

const VER_RE = /^\d+\.\d+\.\d+$/;
// Old generic texts that say nothing about the build; an entry made only of one of these gets refilled.
const PLACEHOLDER_RE = [/^y{20,}$/i, /^v\d+\.\d+\.\d+:\s*$/, /automated publish, manifest sync/i,
  /^(v\d+\.\d+\.\d+:\s*)?(Bug fixes and improvements|Reliability improvements|Reliability fixes|Device compatibility and reliability improvements|Stability improvements and Homey test publication retry)\.?$/i];
const USER_TYPES = new Set(['fix', 'feat', 'perf']);

function isPlaceholder(text) {
  const t = String(text || '').trim();
  return !t || PLACEHOLDER_RE.some((re) => re.test(t));
}

function cmpVer(a, b) {
  const pa = a.split('.').map(Number); const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Non-version keys first (original order), then versions newest first. Values untouched. */
function orderChangelog(obj) {
  const out = {};
  for (const k of Object.keys(obj)) if (!VER_RE.test(k)) out[k] = obj[k];
  for (const k of Object.keys(obj).filter((x) => VER_RE.test(x)).sort((a, b) => cmpVer(b, a))) out[k] = obj[k];
  return out;
}

function parseSubject(s) {
  const m = /^(\w+)(?:\(([^)]*)\))?!?:\s*(.*)$/.exec(String(s || ''));
  return m ? { type: m[1].toLowerCase(), scope: m[2] || '', rest: m[3] } : { type: '', scope: '', rest: String(s || '') };
}

function topics(subjects, lang) {
  if (!RW || !subjects.length) return '';
  const t = RW.topicOf(subjects.join(' ; '), lang) || '';
  return t.split(' — ')[0].replace(/`/g, '').trim();
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Our own commit subjects → { en, fr }. Never returns the old placeholder. */
function summarize(subjects) {
  const user = []; let fixes = 0; let feats = 0; let internal = 0;
  for (const s of subjects) {
    if (/\[auto:|^Merge |^v\d+\.\d+\.\d+: |sync generated publish metadata/i.test(s)) continue;
    const p = parseSubject(s);
    if (USER_TYPES.has(p.type)) { user.push(p.rest); if (p.type === 'feat') feats++; else fixes++; } else internal++;
  }
  if (!user.length) {
    return {
      en: 'Maintenance release: checks, tests and build tooling only; devices behave as before.',
      fr: 'Version de maintenance : contrôles, tests et outillage uniquement ; les appareils se comportent comme avant.',
    };
  }
  const tEn = topics(user, 'en'); const tFr = topics(user, 'fr');
  const cEn = [fixes && plural(fixes, 'fix', 'fixes'), feats && plural(feats, 'improvement', 'improvements')].filter(Boolean).join(', ');
  const cFr = [fixes && plural(fixes, 'correctif', 'correctifs'), feats && plural(feats, 'amélioration', 'améliorations')].filter(Boolean).join(', ');
  return {
    en: tEn ? `Device fixes and improvements for ${tEn} (${cEn}).` : `Device fixes and improvements (${cEn}).`,
    fr: tFr ? `Corrections et améliorations pour : ${tFr} (${cFr}).` : `Corrections et améliorations des appareils (${cFr}).`,
  };
}

// P3075: the bastien bump/write-back subjects ("chore(version): v1.0.217 written back after Test")
// also close a version, so one entry never lists the whole recent history.
const BUMP_SUBJECT = /^(?:chore|release|build)(?:\([^)]*\))?:\s*v?\d+\.\d+\.\d+\b|source manifests [\d.]+ -> \d+\.\d+\.\d+/i;

/** Precise en/fr note from our commits (families, model ids), in our own words; summarize() if the backfill module is missing.
 *  When describe() would only say "small fixes" or "tooling only", name the runtime subjects (fix/feat/perf, chore diag/drivers/lib/app). */
function runtimeHeads(subjects) {
  const items = [];
  for (const s of subjects || []) {
    if (/\[auto:|^Merge |\[skip ci\]/i.test(s) || BUMP_SUBJECT.test(s)) continue;
    const p = parseSubject(s);
    const runtime = p.type === 'fix' || p.type === 'feat' || p.type === 'perf'
      || (p.type === 'chore' && /^(diag|drivers|lib|app)\b/i.test(p.scope));
    if (!runtime) continue;
    const head = p.rest.replace(/\(credit[^)]*\)/gi, '').replace(/\s*[—(;].*$/, '').replace(/\b(P\d{3,5}[a-z]?|GH#\d+|#\d{2,5})\b:?/g, '').replace(/\s+/g, ' ').trim();
    if (head && !items.some((x) => x.toLowerCase() === head.toLowerCase())) items.push(head.length > 90 ? `${head.slice(0, 87)}...` : head);
  }
  return items.slice(0, 4);
}

function precise(subjects) {
  let B = null;
  try { B = require('./changelog-backfill.js'); } catch (_) { B = null; }
  const out = B && typeof B.describe === 'function' ? B.describe(subjects) : summarize(subjects);
  const unnamedOnly = /^(Reliability: \d+ small fix|Maintenance build: same devices)/i.test(String(out && out.en || ''));
  if (unnamedOnly) {
    const heads = runtimeHeads(subjects);
    if (heads.length) {
      return { en: `Changed: ${heads.join('; ')}.`, fr: `Modifié : ${heads.join('; ')}.` };
    }
  }
  const vague = B && typeof B.needsRewrite === 'function' ? B.needsRewrite(out) === 'vague' : String((out && out.en) || '').length < 40;
  return vague ? specific(subjects, out) : out;
}

// P3243c: the post-Test write-back gave bastien 1.0.227 "Fixed: climate sensors." (P3075 vague-note ceiling).
// A vague family note gets the concrete items from our own commit subjects: short subject heads + P/GH numbers.
function specific(subjects, base) {
  const refs = []; const items = [];
  for (const s of subjects || []) {
    if (/\[auto:|^Merge |\[skip ci\]/i.test(s) || BUMP_SUBJECT.test(s)) continue;
    const p = parseSubject(s);
    if (p.type && !USER_TYPES.has(p.type)) continue;
    for (const r of `${p.scope} ${p.rest}`.match(/\bP\d{3,5}[a-z]?\b|GH#\d+|#\d{2,5}\b/g) || []) if (!refs.includes(r)) refs.push(r);
    const head = p.rest.replace(/\(credit[^)]*\)/gi, '').replace(/\s*[—(;].*$/, '').replace(/\b(P\d{3,5}[a-z]?|GH#\d+|#\d{2,5})\b:?/g, '').replace(/\s+/g, ' ').trim();
    if (head && !items.some((x) => x.toLowerCase() === head.toLowerCase())) items.push(head.length > 90 ? `${head.slice(0, 87)}...` : head);
  }
  if (!items.length) return base;
  const list = items.slice(0, 4).join('; ') + (items.length > 4 ? `; +${items.length - 4}` : '');
  const tail = refs.length ? ` (${refs.slice(0, 6).join(', ')})` : '';
  const trim = (t) => String(t || '').replace(/[.\s]+$/, '');
  return {
    en: `${trim(base && base.en) || 'Fixed'}: ${list}${tail}.`,
    fr: `${trim(base && base.fr) || 'Corrigé'} : ${list}${tail}.`,
  };
}

/** Our commit subjects since the previous publish metadata commit (bounded). */
function subjectsSinceLastPublish(cwd = process.cwd(), max = 400) {
  let log = '';
  try { log = execFileSync('git', ['log', '--no-merges', '--format=%s', '-n', String(max)], { cwd, encoding: 'utf8' }); } catch (_) { return []; }
  const out = [];
  for (const s of log.split('\n')) {
    if (/^v\d+\.\d+\.\d+: \d+ drivers/.test(s) || BUMP_SUBJECT.test(s)) break;
    if (s.trim()) out.push(s.trim());
  }
  return out;
}

/** Two maintenance builds in a row must not carry the very same note (P3075 counts it as a duplicate). */
function distinctFromPrevious(obj, version, entry) {
  if (!entry || typeof entry !== 'object' || !entry.en) {
    return entry;
  }
  const prev = Object.keys(obj).filter((k) => k !== version && /^\d+\.\d+\.\d+$/.test(k) && cmpVer(k, version) < 0).sort(cmpVer).pop();
  const prevEntry = prev ? obj[prev] : null;
  const prevEn = prevEntry && typeof prevEntry === 'object' ? prevEntry.en : prevEntry;
  if (!prevEn || prevEn !== entry.en) {
    return entry;
  }
  const out = { ...entry, en: `v${version}: ${entry.en}` };
  if (entry.fr) {
    out.fr = `v${version} : ${entry.fr}`;
  }
  return out;
}

/** Driver paths named in a commit. A subject with none is package-wide. */
function driverIdsInSubject(subject) {
  return [...String(subject || '').matchAll(/drivers\/([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase());
}

/**
 * Bastien's packed app keeps a driver allow-list. A commit that names only
 * drivers outside that list must not be told to the house as a device fix.
 * Subjects with no driver path stay (shared runtime). No list means every subject stays.
 */
function scopeSubjectsToPackage(subjects, keepDriverIds) {
  if (!Array.isArray(keepDriverIds) || !keepDriverIds.length) {return subjects || [];}
  const keep = new Set(keepDriverIds.map((id) => String(id).toLowerCase()));
  return (subjects || []).filter((s) => {
    const named = driverIdsInSubject(s);
    if (!named.length) {return true;}
    return named.some((id) => keep.has(id));
  });
}

/** The note a publish is allowed to upload. Placeholder env text never wins. */
function noteForPublish(subjects, options = {}) {
  const scoped = scopeSubjectsToPackage(subjects, options.keepDriverIds);
  const entry = precise(scoped);
  if (entry && !isPlaceholder(entry.en)) {return entry;}
  return {
    en: 'Maintenance release: checks, tests and build tooling only; devices behave as before.',
    fr: 'Version de maintenance : contrôles, tests et outillage uniquement ; les appareils se comportent comme avant.',
  };
}

/** Fill the entry for `version` when missing or placeholder; always re-order. Returns { changed, entry }. */
function updateChangelog(obj, version, subjects) {
  const cur = obj[version];
  let changed = false;
  if (!cur || isPlaceholder(cur.en)) {
    obj[version] = precise(subjects);
    obj[version] = distinctFromPrevious(obj, version, obj[version]);
    changed = true;
  }
  const ordered = orderChangelog(obj);
  if (JSON.stringify(Object.keys(ordered)) !== JSON.stringify(Object.keys(obj))) changed = true;
  return { changed, obj: ordered, entry: ordered[version] };
}

module.exports = {
  specific, isPlaceholder, orderChangelog, summarize, precise, subjectsSinceLastPublish,
  updateChangelog, cmpVer, BUMP_SUBJECT, driverIdsInSubject, scopeSubjectsToPackage,
  noteForPublish, distinctFromPrevious,
};

if (require.main === module) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
  const file = path.resolve(arg('--file') || '.homeychangelog.json');
  const version = arg('--version') || JSON.parse(fs.readFileSync('app.json', 'utf8')).version;
  if (!fs.existsSync(file)) { console.log(`changelog-entry: ${file} missing, nothing to do`); process.exit(0); }
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = updateChangelog(obj, version, subjectsSinceLastPublish());
  if (r.changed && !process.argv.includes('--dry')) fs.writeFileSync(file, JSON.stringify(r.obj, null, 2) + '\n');
  console.log(`changelog-entry v${version}: ${r.changed ? 'updated' : 'unchanged'} — ${r.entry.en}`);
}
