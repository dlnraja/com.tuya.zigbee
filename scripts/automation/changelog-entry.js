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
  /^v\d+\.\d+\.\d+: Bug fixes and improvements\.?$/i, /^Reliability improvements\.?$/i];
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

/** Our commit subjects since the previous publish metadata commit (bounded). */
function subjectsSinceLastPublish(cwd = process.cwd(), max = 400) {
  let log = '';
  try { log = execFileSync('git', ['log', '--no-merges', '--format=%s', '-n', String(max)], { cwd, encoding: 'utf8' }); } catch (_) { return []; }
  const out = [];
  for (const s of log.split('\n')) {
    if (/^v\d+\.\d+\.\d+: \d+ drivers/.test(s)) break;
    if (s.trim()) out.push(s.trim());
  }
  return out;
}

/** Fill the entry for `version` when missing or placeholder; always re-order. Returns { changed, entry }. */
function updateChangelog(obj, version, subjects) {
  const cur = obj[version];
  let changed = false;
  if (!cur || isPlaceholder(cur.en)) { obj[version] = summarize(subjects); changed = true; }
  const ordered = orderChangelog(obj);
  if (JSON.stringify(Object.keys(ordered)) !== JSON.stringify(Object.keys(obj))) changed = true;
  return { changed, obj: ordered, entry: ordered[version] };
}

module.exports = { isPlaceholder, orderChangelog, summarize, subjectsSinceLastPublish, updateChangelog, cmpVer };

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
