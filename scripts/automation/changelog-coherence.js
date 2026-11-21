#!/usr/bin/env node
'use strict';
/**
 * P3363 - changelog coherence for one Homey app tree.
 *
 * - Keep only version keys that belong to this app (master 9.x, stable 5.x, bastien 1.x).
 * - Rewrite a wrong or empty note from the commits since the previous version that this
 *   app actually published (ledger) or, if the ledger has no row, since the previous bump.
 * - Always write en+fr (and keep any other locales). Strip personal names and internal ids
 *   from the user-facing text. Never invent versions. Never remove a version of this app.
 *
 *   node scripts/automation/changelog-coherence.js [--root DIR] [--check|--fix] [--report FILE]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const CE = require('./changelog-entry.js');

const VER_RE = /^\d+\.\d+\.\d+$/;
const APP_SERIES = {
  'com.dlnraja.tuya.zigbee': '9.',
  'com.dlnraja.tuya.zigbee.stable': '5.',
  'com.dlnraja.tuya.zigbee.bastien': '1.',
};

const PII_RE = /\b(dlnraja|rajasekaram|dylan)\b/gi;
const INTERNAL_ID_RE = /\bP\d{3,5}[a-z]?\b|\bGH#\d+\b|\b#\d{2,5}\b/g;
const LINT_ONLY_RE = /lint ratchet|budget line|satisfy the lint/i;
const AUTO_RE = /\[auto:|^Merge /i;

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function appIdOf(root) {
  const compose = path.join(root, '.homeycompose', 'app.json');
  const app = path.join(root, 'app.json');
  const src = fs.existsSync(compose) ? compose : app;
  const j = readJson(src);
  return String(j.id || '');
}

function seriesOf(root) {
  const id = appIdOf(root);
  if (APP_SERIES[id]) return APP_SERIES[id];
  const ver = readJson(path.join(root, 'package.json')).version || '';
  const m = /^(\d+\.)/.exec(ver);
  return m ? m[1] : '';
}

function ownKey(version, series) {
  return VER_RE.test(version) && String(version).startsWith(series);
}

function versionKeys(obj) {
  return Object.keys(obj).filter((k) => VER_RE.test(k));
}

function sanitizeUserText(text) {
  let t = String(text || '').replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'");
  t = t.replace(/\b\d+\s+\w+ comments deleted from \S+/gi, '');
  t = t.replace(PII_RE, 'the maintainer');
  t = t.replace(/\bP\d{3,5}[a-z]?\b/g, '');
  t = t.replace(/\bGH#\d+\b/g, '');
  t = t.replace(/#\d{2,5}\b/g, '');
  t = t.replace(/\(\s*[,;\s]*\)/g, '');
  t = t.replace(/\s+([,.;])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  return t;
}

const DEVICE_SUBJ = /drivers?|device|payload|battery|pair|fingerprint|flow card|graduate|held|sensor|switch|plug|curtain|thermostat|dimmer|image dedupe/i;

function fallbackNote(subjects) {
  const items = [];
  for (const s of subjects || []) {
    if (/superseded builds|write-back|lint ratchet|budget line|homeyignore|sacred couples|cross-research|inventory \+ critical/i.test(s)) continue;
    if (!DEVICE_SUBJ.test(s) && !/^P\d{3,5}/.test(s)) continue;
    const rest = String(s).replace(/^P\d{3,5}[a-z]?:\s*/i, '').replace(/\[skip ci\]/ig, '').replace(/\s+/g, ' ').trim();
    const head = sanitizeUserText(rest.replace(/\([^)]*\)/g, '').trim());
    if (head && !items.some((x) => x.toLowerCase() === head.toLowerCase())) {
      items.push(head.length > 90 ? head.slice(0, 87) + '...' : head);
    }
  }
  if (!items.length) return null;
  const list = items.slice(0, 4).join('; ') + (items.length > 4 ? '; +' + (items.length - 4) : '');
  if (/graduate \d+ held drivers|lossless packaged image/i.test(list)) {
    return {
      en: 'The Test build now includes previously held drivers in the payload. Packaged images were deduplicated without quality loss.',
      fr: 'La version Test inclut des appareils auparavant retenus dans le paquet. Les images ont ete dedupliquees sans perte de qualite.',
    };
  }
  return { en: 'Changed: ' + list + '.', fr: 'Modifie : ' + list + '.' };
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const out = { ...entry };
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'string') out[k] = sanitizeUserText(out[k]);
  }
  return out;
}

/** User-facing FR twin for a short EN note when no FR is stored. Templates only; no network. */
function frFromEn(en) {
  const t = String(en || '').trim();
  const map = [
    [/^Maintenance build: same devices and behaviour as the previous version \(publishing and test tooling only\)\.$/,
      'Version de maintenance : memes appareils et meme comportement que la precedente (outils de publication et de test uniquement).'],
    [/^Maintenance release: checks, tests and build tooling only; devices behave as before\.$/,
      'Version de maintenance : controles, tests et outillage uniquement ; les appareils se comportent comme avant.'],
    [/^Behind the scenes: tests and publishing checks\.$/,
      'En coulisses : tests et controles de publication.'],
  ];
  for (const [re, fr] of map) if (re.test(t)) return fr;
  let fr = t
    .replace(/^Fixed:\s*/i, 'Corrige : ')
    .replace(/^New:\s*/i, 'Nouveau : ')
    .replace(/^Changed:\s*/i, 'Modifie : ')
    .replace(/^Faster:\s*/i, 'Plus rapide : ')
    .replace(/^Reliability:\s*/i, 'Fiabilite : ')
    .replace(/^Plus (\d+) other changes? in the app core\./i, 'Et $1 autres changements dans le coeur de l\'app.')
    .replace(/Behind the scenes: tests and publishing checks\./i, 'En coulisses : tests et controles de publication.')
    .replace(/\bsmall fixes\b/g, 'petites corrections')
    .replace(/\bsmall fix\b/g, 'petite correction')
    .replace(/\bFlow cards\b/g, 'cartes Flow')
    .replace(/\blights and dimmers\b/g, 'eclairages et variateurs')
    .replace(/\bbattery reporting\b/g, 'niveau de batterie')
    .replace(/\bpairing and device recognition\b/g, 'appairage et reconnaissance des appareils')
    .replace(/\benergy meters\b/g, 'compteurs d\'energie')
    .replace(/\bclimate sensors\b/g, 'capteurs climatiques')
    .replace(/\bsafety sensors\b/g, 'capteurs de securite')
    .replace(/\bdevice settings\b/g, 'reglages des appareils')
    .replace(/\bbuttons and remotes\b/g, 'boutons et telecommandes')
    .replace(/\bmemory and timers\b/g, 'memoire et minuteries');
  return fr;
}

function ensureFr(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const out = { ...entry };
  if (out.en && !out.fr) out.fr = frFromEn(out.en);
  return out;
}

/** Accent pass for FR notes already in Latin-1 (safe known list only). */
function accentFr(text) {
  const pairs = [
    [/\bprivee\b/g, 'privee'.replace('privee', 'priv\u00E9e')],
    [/\bprive\b/g, 'priv\u00E9'],
    [/\bfiabilite\b/g, 'fiabilit\u00E9'],
    [/\bmemes\b/g, 'm\u00EAmes'],
    [/\bmeme\b/g, 'm\u00EAme'],
    [/\bprecedente\b/g, 'pr\u00E9c\u00E9dente'],
    [/\bCorrige\b/g, 'Corrig\u00E9'],
    [/\bModifie\b/g, 'Modifi\u00E9'],
    [/\bFiabilite\b/g, 'Fiabilit\u00E9'],
    [/\beclairages\b/g, '\u00E9clairages'],
    [/\bcoeur\b/g, 'c\u0153ur'.replace('\u0153', 'oe')],
    [/\btelecommandes\b/g, 't\u00E9l\u00E9commandes'],
    [/\bmemoire\b/g, 'm\u00E9moire'],
    [/\bminuteries\b/g, 'minuteries'],
    [/\breglages\b/g, 'r\u00E9glages'],
    [/\bsecurite\b/g, 's\u00E9curit\u00E9'],
    [/\benergie\b/g, '\u00E9nergie'],
    [/\bcontroles\b/g, 'contr\u00F4les'],
  ];
  // The 'privee' replacement above is messy because this file must stay <= U+00FF.
  // Re-do with explicit Latin-1 escapes only.
  void pairs;
  let t = String(text || '');
  t = t.replace(/\bprivee\b/g, 'priv\u00E9e');
  t = t.replace(/\bprive\b/g, 'priv\u00E9');
  t = t.replace(/\bfiabilite\b/g, 'fiabilit\u00E9');
  t = t.replace(/\bmemes\b/g, 'm\u00EAmes');
  t = t.replace(/\bmeme\b/g, 'm\u00EAme');
  t = t.replace(/\bprecedente\b/g, 'pr\u00E9c\u00E9dente');
  t = t.replace(/\bCorrige\b/g, 'Corrig\u00E9');
  t = t.replace(/\bModifie\b/g, 'Modifi\u00E9');
  t = t.replace(/\bFiabilite\b/g, 'Fiabilit\u00E9');
  t = t.replace(/\beclairages\b/g, '\u00E9clairages');
  t = t.replace(/\bcoeur\b/g, 'coeur');
  t = t.replace(/\btelecommandes\b/g, 't\u00E9l\u00E9commandes');
  t = t.replace(/\bmemoire\b/g, 'm\u00E9moire');
  t = t.replace(/\breglages\b/g, 'r\u00E9glages');
  t = t.replace(/\bsecurite\b/g, 's\u00E9curit\u00E9');
  t = t.replace(/\benergie\b/g, '\u00E9nergie');
  t = t.replace(/\bd'energie\b/g, 'd\'\u00E9nergie');
  t = t.replace(/\bcontroles\b/g, 'contr\u00F4les');
  t = t.replace(/\bcontrole\b/g, 'contr\u00F4le');
  t = t.replace(/\bqualite\b/g, 'qualit\u00E9');
  t = t.replace(/\bdedupliquees\b/g, 'd\u00E9dupliqu\u00E9es');
  t = t.replace(/\bdedupliquee\b/g, 'd\u00E9dupliqu\u00E9e');
  t = t.replace(/\bont ete\b/g, 'ont \u00E9t\u00E9');
  return t;
}

function publishedRows(root) {
  const rows = [];
  const cands = [
    path.join(root, 'docs/knowledge/athom-publish-outcomes.jsonl'),
    path.join(root, 'docs/status/athom-publish-outcomes.jsonl'),
  ];
  const id = appIdOf(root);
  for (const file of cands) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\n/)) {
      if (!line.trim()) continue;
      let o; try { o = JSON.parse(line); } catch (_e) { continue; }
      const app = o.app_id || o.appId || o.app || '';
      const ver = o.version;
      const state = String(o.state || o.channel || '').toLowerCase();
      const kind = String(o.kind || o.status || '').toLowerCase();
      const ok = (state === 'test' || state === 'live' || state === 'draft') && kind !== 'aggregateerror' && !/fail/.test(kind);
      if (!ver || !VER_RE.test(ver)) continue;
      if (app && app !== id && app !== 'master' && app !== 'stable' && app !== 'bastien') {
        // keep rows with no app id (legacy) if the version matches this series
        if (!ownKey(ver, seriesOf(root))) continue;
      } else if (app === 'master' && !id.endsWith('zigbee')) continue;
      else if (app === 'stable' && !id.endsWith('.stable')) continue;
      else if (app === 'bastien' && !id.endsWith('.bastien')) continue;
      else if (app && app !== id && !['master', 'stable', 'bastien'].includes(app)) continue;
      if (!ownKey(ver, seriesOf(root))) continue;
      if (!ok && state && !['test', 'live', 'draft', 'published'].includes(state)) continue;
      rows.push({ version: ver, sha: o.source_sha || o.sha || '', state, kind, at: o.at || '' });
    }
  }
  return rows;
}

function bumpSha(root, version) {
  const patterns = [
    `chore(stable): v${version}`,
    `chore(version): v${version}`,
    `v${version}:`,
    `chore(bastien): v${version}`,
    `v${version} `,
  ];
  for (const p of patterns) {
    try {
      const out = execFileSync('git', ['log', '--format=%H', '--grep', p, '-n', '5'], {
        cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (out) return out.split('\n')[0];
    } catch (_e) { /* no git */ }
  }
  return '';
}

function subjectsBetween(root, fromRef, toRef) {
  if (!toRef) return [];
  const range = fromRef ? `${fromRef}..${toRef}` : toRef;
  try {
    const log = execFileSync('git', ['log', '--no-merges', '--format=%s', range, '-n', '400'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    return log.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (_e) { return []; }
}

function usableSubjects(subjects) {
  return (subjects || []).filter((s) => {
    if (AUTO_RE.test(s) || CE.BUMP_SUBJECT.test(s) || /^v\d+\.\d+\.\d+:/.test(s)) return false;
    if (LINT_ONLY_RE.test(s)) return false;
    return true;
  });
}

function isStockMaintenance(text) {
  return /maintenance (build|release)/i.test(String(text || ''))
    && /same devices|tooling only|devices behave as before/i.test(String(text || ''));
}

function audit(root) {
  const file = path.join(root, '.homeychangelog.json');
  const pkg = readJson(path.join(root, 'package.json'));
  const series = seriesOf(root);
  const findings = [];
  if (!fs.existsSync(file)) {
    return { findings: [{ code: 'missing-file', msg: '.homeychangelog.json is missing' }], series, version: pkg.version };
  }
  const obj = readJson(file);
  const keys = versionKeys(obj);
  const foreign = keys.filter((k) => !ownKey(k, series));
  if (foreign.length) {
    findings.push({
      code: 'foreign-versions',
      msg: `${foreign.length} changelog version(s) belong to another app`,
      samples: foreign.slice(0, 8),
      count: foreign.length,
    });
  }
  if (pkg.version && !obj[pkg.version]) {
    findings.push({ code: 'version-mismatch', msg: `package.json ${pkg.version} has no changelog entry` });
  }
  const own = keys.filter((k) => ownKey(k, series)).sort(CE.cmpVer);
  const ordered = versionKeys(obj);
  const expected = [...ordered.filter((k) => !ownKey(k, series)), ...[...ordered.filter((k) => ownKey(k, series))].sort((a, b) => CE.cmpVer(b, a))];
  // After a fix we drop foreign keys, so only check own-key order here when no foreign keys remain.
  if (!foreign.length) {
    const got = keys.slice();
    const want = [...own].sort((a, b) => CE.cmpVer(b, a));
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      findings.push({ code: 'order', msg: 'own version keys are not newest-first' });
    }
  }
  let noFr = 0; let stockWrong = 0; let pii = 0;
  for (const v of own) {
    const e = obj[v];
    const en = e && typeof e === 'object' ? e.en : String(e || '');
    const fr = e && typeof e === 'object' ? e.fr : '';
    if (!fr) noFr++;
    if (PII_RE.test(en) || PII_RE.test(fr) || INTERNAL_ID_RE.test(en) || INTERNAL_ID_RE.test(fr)) pii++;
    void en; // reset lastIndex by creating new test below
  }
  // reset regex state
  PII_RE.lastIndex = 0; INTERNAL_ID_RE.lastIndex = 0;
  pii = 0; noFr = 0;
  for (const v of own) {
    const e = obj[v];
    const en = e && typeof e === 'object' ? (e.en || '') : String(e || '');
    const fr = e && typeof e === 'object' ? (e.fr || '') : '';
    if (!fr) noFr++;
    if (PII_RE.test(en) || PII_RE.test(fr)) pii++;
    PII_RE.lastIndex = 0;
    if (INTERNAL_ID_RE.test(en) || INTERNAL_ID_RE.test(fr)) pii++;
    INTERNAL_ID_RE.lastIndex = 0;
  }
  if (noFr) findings.push({ code: 'missing-fr', msg: `${noFr} own entr(ies) have no French text`, count: noFr });
  if (pii) findings.push({ code: 'pii-or-internal-id', msg: `${pii} own entr(ies) leak a name or internal id`, count: pii });
  return {
    findings, series, version: pkg.version, appId: appIdOf(root),
    ownCount: own.length, foreignCount: foreign.length, noFr, pii,
    currentEntry: obj[pkg.version] || null,
  };
}

function stripForeign(obj, series) {
  const out = {};
  if (Array.isArray(obj.changelog)) {
    out.changelog = obj.changelog.filter((e) => e && ownKey(String(e.version || ''), series));
  } else if (obj.changelog && typeof obj.changelog === 'object' && !Array.isArray(obj.changelog)) {
    const inner = {};
    for (const [k, v] of Object.entries(obj.changelog)) if (ownKey(k, series)) inner[k] = v;
    if (Object.keys(inner).length) out.changelog = inner;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'changelog') continue;
    if (VER_RE.test(k) && !ownKey(k, series)) continue;
    out[k] = v;
  }
  return out;
}

function rewriteOwnEntries(root, obj, series) {
  const changed = [];
  const own = versionKeys(obj).filter((k) => ownKey(k, series)).sort(CE.cmpVer);
  const pub = publishedRows(root);
  const pubByVer = new Map();
  for (const r of pub) if (r.sha && !pubByVer.has(r.version)) pubByVer.set(r.version, r.sha);

  for (let i = 0; i < own.length; i++) {
    const ver = own[i];
    const prev = i > 0 ? own[i - 1] : null;
    const toRef = pubByVer.get(ver) || bumpSha(root, ver);
    const fromRef = prev ? (pubByVer.get(prev) || bumpSha(root, prev)) : '';
    const subjects = usableSubjects(toRef ? subjectsBetween(root, fromRef, toRef) : []);
    let entry = obj[ver] && typeof obj[ver] === 'object' ? { ...obj[ver] } : { en: String(obj[ver] || '') };
    const before = JSON.stringify(entry);
    let generated = subjects.length ? CE.precise(subjects) : null;
    if (!generated || isStockMaintenance(generated.en)) {
      const fb = fallbackNote(subjects);
      if (fb) generated = fb;
    }
    const generatedUseful = generated && generated.en && !isStockMaintenance(generated.en);
    if (generatedUseful && (isStockMaintenance(entry.en) || !entry.en || CE.isPlaceholder(entry.en))) {
      entry = { ...entry, en: generated.en, fr: generated.fr || entry.fr };
      changed.push({ version: ver, why: 'rewrote-stock-or-placeholder', en: entry.en });
    } else if (generatedUseful && /^(Reliability: \d+ small fix)/i.test(entry.en || '')) {
      entry = { ...entry, en: generated.en, fr: generated.fr || entry.fr };
      changed.push({ version: ver, why: 'rewrote-vague-reliability', en: entry.en });
    }
    entry = ensureFr(sanitizeEntry(entry));
    if (entry.fr) entry.fr = accentFr(entry.fr);
    if (entry.en) entry.en = sanitizeUserText(entry.en);
    if (JSON.stringify(entry) !== before && !changed.some((c) => c.version === ver)) {
      changed.push({ version: ver, why: 'locales-or-sanitize', en: entry.en });
    }
    obj[ver] = CE.distinctFromPrevious(obj, ver, entry);
  }
  return { obj: CE.orderChangelog(obj), changed };
}

function apply(root) {
  const file = path.join(root, '.homeychangelog.json');
  const series = seriesOf(root);
  const obj = readJson(file);
  const stripped = stripForeign(obj, series);
  const foreignRemoved = versionKeys(obj).length - versionKeys(stripped).length;
  const r = rewriteOwnEntries(root, stripped, series);
  const json = JSON.stringify(r.obj, null, 2) + '\n';
  return { file, series, foreignRemoved, changed: r.changed, obj: r.obj, json };
}

function check(root) {
  const a = audit(root);
  return { ok: a.findings.filter((f) => f.code === 'foreign-versions' || f.code === 'version-mismatch').length === 0, ...a };
}

module.exports = {
  APP_SERIES, appIdOf, seriesOf, ownKey, sanitizeUserText, sanitizeEntry,
  frFromEn, accentFr, ensureFr, publishedRows, bumpSha, subjectsBetween,
  usableSubjects, fallbackNote, isStockMaintenance, audit, stripForeign, rewriteOwnEntries, apply, check,
};

if (require.main === module) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
  const root = path.resolve(arg('--root') || process.cwd());
  const report = arg('--report');
  const doFix = process.argv.includes('--fix');
  const result = doFix ? { ...apply(root), auditAfter: null } : { audit: audit(root) };
  if (doFix) {
    fs.writeFileSync(result.file, result.json);
    result.auditAfter = audit(root);
    console.log(`changelog-coherence: removed ${result.foreignRemoved} foreign version(s), rewrote ${result.changed.length} own entr(ies)`);
    for (const c of result.changed.slice(0, 20)) console.log(`  ${c.version} [${c.why}] ${c.en}`.slice(0, 200));
  } else {
    const a = result.audit;
    console.log(`changelog-coherence: ${a.appId} series ${a.series}* own=${a.ownCount} foreign=${a.foreignCount} findings=${a.findings.length}`);
    for (const f of a.findings) console.log(`  [${f.code}] ${f.msg}`);
  }
  if (report) fs.writeFileSync(report, JSON.stringify(doFix ? result : result.audit, null, 2) + '\n');
  const findings = (doFix ? result.auditAfter : result.audit).findings;
  const fatal = findings.filter((f) => f.code === 'foreign-versions' || f.code === 'version-mismatch');
  process.exitCode = doFix ? 0 : (fatal.length ? 1 : 0);
}
