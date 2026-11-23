#!/usr/bin/env node
'use strict';
/**
 * P3362 referentials - structured knowledge catalogues under docs/ssot/referentials/.
 * Investigations consult them first and write back learned entries (source, date, confidence).
 * Regenerated/enriched incrementally; never shipped in the Homey package.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = 'docs/ssot/referentials';
const FILES = {
  manifest: 'manifest.json',
  causes: 'malfunction-causes.json',
  cards: 'device-cards.json',
  dp: 'dp-conversion.json',
  history: 'intake-history.json',
  lessons: 'lessons-index.json',
  ideas: 'cross-app-ideas.json',
  learnings: 'learnings.json',
};
const MD = {
  causes: 'malfunction-causes.md',
  cards: 'device-cards.md',
  dp: 'dp-conversion.md',
  history: 'intake-history.md',
  lessons: 'lessons-index.md',
  ideas: 'cross-app-ideas.md',
  readme: 'README.md',
};
const CAPS = {
  maxCauses: 400,
  maxCards: 1500,
  maxDpRows: 2000,
  maxHistory: 400,
  maxLessons: 200,
  maxIdeas: 200,
  maxLearnings: 800,
  maxJsonBytes: 800000,
  maxMdBytes: 400000,
};

const SEED_CAUSES = [
  { symptom: 'empty-capabilities', label: 'tile or capability stays empty', causes: [
    { id: 'scale-mismatch', rank: 1, checks: ['compare DP scale to Z2M/ZHA (div, mul, 0-1 vs 0-100)'], fixes: ['scale to the official Homey capability range'], confidence: 0.85 },
    { id: 'dp-unmapped', rank: 2, checks: ['upstream DP has no capability in device.js'], fixes: ['map the exact DP to an official capability'], confidence: 0.75 },
    { id: 'reporting-config', rank: 3, checks: ['bindings, attribute reporting, read-only refresh'], fixes: ['request DPs read-only; fix reporting/bind'], confidence: 0.65 },
  ] },
  { symptom: 'works-badly', label: 'user reports it works badly (presumed true)', causes: [
    { id: 'scale-mismatch', rank: 1, checks: ['DP/cluster conversion vs upstream'], fixes: ['fix scaling, divisor, enum or inversion'], confidence: 0.8 },
    { id: 'firmware-quirk', rank: 2, checks: ['appVersion / firmware notes in the couple card'], fixes: ['quirk path for that firmware'], confidence: 0.6 },
    { id: 'known-wrong-behavior', rank: 3, checks: ['already-supported-but-behaves-wrong history'], fixes: ['apply the recorded fix; do not close as already supported'], confidence: 0.9 },
  ] },
  { symptom: 'unexpected-property', label: 'tuya.datapoint unexpected property', causes: [
    { id: 'datapoint-shape', rank: 1, checks: ['sendStructuredDatapoint vs raw'], fixes: ['accept the reported property shape'], confidence: 0.8 },
  ] },
  { symptom: 'no-status', label: 'cannot read status without sending a command', causes: [
    { id: 'missing-readonly-refresh', rank: 1, checks: ['requestAllDPs readOnly', 'DP for position vs set'], fixes: ['status query that does not toggle the device'], confidence: 0.85 },
  ] },
  { symptom: 'crash', label: 'crash or OOM', causes: [
    { id: 'driver-crash', rank: 1, checks: ['diag/crash ledgers for the driver'], fixes: ['fix the crashing path; keep the driver id'], confidence: 0.7 },
  ] },
  { symptom: 'wrong-class', label: 'paired as the wrong class', causes: [
    { id: 'misplaced-couple', rank: 1, checks: ['sources vs current owner', 'git history of the couple'], fixes: ['move the exact couple with a migration path'], confidence: 0.8 },
    { id: 'parasite-combo', rank: 2, checks: ['mfr x pid cross-product on the driver'], fixes: ['exact-pair or continuation; do not add cartesian parasites'], confidence: 0.75 },
  ] },
  { symptom: 'invalid-flow-card', label: 'invalid_flow_card_id or missing flow', causes: [
    { id: 'flow-card-id', rank: 1, checks: ['app-level vs driver flow ids; never remove published ids'], fixes: ['stop firing the missing card; add a legal card if needed'], confidence: 0.85 },
  ] },
  { symptom: 'sleepy-battery', label: 'battery or sleepy device does not report', causes: [
    { id: 'sleepy-tx', rank: 1, checks: ['IAS zone / poll / interview on wake'], fixes: ['configure reporting for sleepy devices'], confidence: 0.7 },
  ] },
];

function lc(s) { return String(s || '').toLowerCase(); }
function nowIso() { return new Date().toISOString(); }
function sha(s) { return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16); }
function relPath(root, ...parts) { return path.join(root, DIR, ...parts); }
function loadJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function stable(obj) {
  return JSON.stringify(obj, (k, v) => {
    if (k === 'generated' || k === 'freshness' || k === 'writtenAt') return undefined;
    return v;
  });
}

function emptyBundle() {
  return {
    manifest: { v: 1, generated: null, freshness: null, counts: {}, hashes: {} },
    causes: { v: 1, items: SEED_CAUSES.slice() },
    cards: { v: 1, cards: {} },
    dp: { v: 1, rows: [] },
    history: { v: 1, items: [] },
    lessons: { v: 1, items: [] },
    ideas: { v: 1, items: [] },
    learnings: { v: 1, items: [] },
  };
}

function load(root) {
  const bundle = emptyBundle();
  if (!root) return bundle;
  const dir = path.join(root, DIR);
  if (!fs.existsSync(dir)) return bundle;
  for (const [key, name] of Object.entries(FILES)) {
    const got = loadJson(path.join(dir, name), null);
    if (got) bundle[key] = got;
  }
  if (!bundle.causes.items || !bundle.causes.items.length) bundle.causes.items = SEED_CAUSES.slice();
  return bundle;
}

function consultFirst(refs, query = {}) {
  const couple = query.couple || '';
  const symptoms = (query.symptoms || []).map(lc);
  const card = couple ? (refs.cards && refs.cards.cards && (refs.cards.cards[couple] || refs.cards.cards[lc(couple)])) : null;
  const learnings = ((refs.learnings && refs.learnings.items) || []).filter((x) => {
    if (couple && x.couple && lc(x.couple) === lc(couple)) return true;
    if (symptoms.length && x.symptom && symptoms.includes(lc(x.symptom))) return true;
    return false;
  });
  const history = ((refs.history && refs.history.items) || []).filter((x) => couple && x.couple && lc(x.couple) === lc(couple));
  const causeItems = [];
  for (const row of (refs.causes && refs.causes.items) || []) {
    if (symptoms.includes(lc(row.symptom)) || (symptoms.length === 0 && couple && learnings.some((l) => l.symptom === row.symptom))) {
      causeItems.push(row);
    }
  }
  const ideas = ((refs.ideas && refs.ideas.items) || []).filter((x) => {
    if (query.idea && lc(x.id || x.tag || '') === lc(query.idea)) return true;
    return false;
  });
  const dp = couple && refs.dp && refs.dp.rows ? refs.dp.rows.filter((r) => r.couple && lc(r.couple) === lc(couple)) : [];
  return {
    consulted: true,
    card: card || null,
    causes: causeItems,
    history,
    learnings,
    ideas,
    dp,
  };
}

function learningKey(entry) {
  const kind = lc(entry.kind || 'note');
  const couple = lc(entry.couple || '');
  const symptom = lc(entry.symptom || '');
  const cause = lc(entry.cause || entry.claim || '');
  return `${kind}|${couple}|${symptom}|${cause}`;
}

function clampConf(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0.5;
  return Math.max(0, Math.min(1, Math.round(x * 100) / 100));
}

function appendLearning(root, entry, opts = {}) {
  const bundle = opts.bundle || load(root);
  const item = {
    key: learningKey(entry),
    kind: entry.kind || 'note',
    couple: entry.couple || null,
    symptom: entry.symptom || null,
    cause: entry.cause || null,
    check: entry.check || null,
    fix: entry.fix || null,
    evidence: entry.evidence || null,
    source: entry.source || 'intake-triage',
    workflow: entry.workflow || entry.source || 'intake-triage',
    confidence: clampConf(entry.confidence),
    date: entry.date || nowIso(),
  };
  if (!bundle.learnings) bundle.learnings = { v: 1, items: [] };
  const items = bundle.learnings.items || [];
  const idx = items.findIndex((x) => x.key === item.key);
  let deduped = false;
  if (idx >= 0) {
    deduped = true;
    const prev = items[idx];
    const conf = Math.max(prev.confidence || 0, item.confidence);
    const sources = [...new Set([].concat(prev.sources || (prev.source ? [prev.source] : []), [item.source]))];
    items[idx] = { ...prev, ...item, confidence: conf, sources, date: item.date, seen: (prev.seen || 1) + 1 };
  } else {
    item.sources = [item.source];
    item.seen = 1;
    items.push(item);
  }
  bundle.learnings.items = items.slice(-CAPS.maxLearnings);
  foldLearnings(bundle);
  if (!opts.skipWrite && root) writeBundle(root, bundle, { only: opts.only });
  return { written: !opts.skipWrite, deduped, key: item.key, item: idx >= 0 ? bundle.learnings.items[idx] || items[idx] : item, bundle };
}

function foldLearnings(bundle) {
  const cards = (bundle.cards && bundle.cards.cards) || {};
  const history = (bundle.history && bundle.history.items) || [];
  const histKeys = new Set(history.map((h) => `${lc(h.couple)}|${h.url || ''}|${h.status || ''}`));
  for (const l of (bundle.learnings && bundle.learnings.items) || []) {
    if (l.couple) {
      const k = l.couple;
      const card = cards[k] || cards[lc(k)] || { couple: k, sources: [], complaints: [], quirks: [] };
      if (l.cause || l.fix) {
        const q = [l.symptom, l.cause, l.fix].filter(Boolean).join(': ');
        card.quirks = [...new Set([].concat(card.quirks || [], q ? [q] : []))];
      }
      if (l.evidence || l.symptom) {
        card.complaints = [...new Set([].concat(card.complaints || [], [l.symptom || l.kind].filter(Boolean)))];
      }
      card.sources = [...new Set([].concat(card.sources || [], l.sources || [l.source]))];
      card.updated = l.date;
      cards[k] = card;
    }
    if (l.couple || l.kind === 'intake') {
      const hk = `${lc(l.couple)}|${l.source}|${l.kind}`;
      if (!histKeys.has(hk)) {
        history.push({ couple: l.couple, status: l.kind, source: l.source, date: l.date, confidence: l.confidence, evidence: l.evidence || l.cause, url: l.url || '' });
        histKeys.add(hk);
      }
    }
  }
  bundle.cards = bundle.cards || { v: 1, cards: {} };
  bundle.cards.cards = cards;
  bundle.history = bundle.history || { v: 1, items: [] };
  bundle.history.items = history.slice(-CAPS.maxHistory);
  return bundle;
}

function schemaErrors(bundle) {
  const errs = [];
  if (!bundle || typeof bundle !== 'object') return ['bundle missing'];
  for (const key of Object.keys(FILES)) {
    if (!bundle[key] || typeof bundle[key] !== 'object') errs.push(`missing ${key}`);
  }
  for (const l of (bundle.learnings && bundle.learnings.items) || []) {
    if (!l.key || !l.source || !l.date) errs.push('learning missing key/source/date');
    if (typeof l.confidence !== 'number' || l.confidence < 0 || l.confidence > 1) errs.push('learning confidence out of range');
  }
  for (const c of Object.values((bundle.cards && bundle.cards.cards) || {})) {
    if (c.couple && !/^[A-Za-z0-9_.:|-]+$/.test(c.couple) && !c.couple.includes('|')) {
      /* couple format is advisory */
    }
  }
  return errs;
}

function toMd(title, lines) {
  return `# ${title}\n\nFreshness: see manifest.json.\n\n${lines.join('\n')}\n`;
}

function renderMd(bundle) {
  const out = {};
  out.causes = toMd('Malfunction causes catalogue', (bundle.causes.items || []).map((row) => {
    const cs = (row.causes || []).map((c) => `  - ${c.rank}. ${c.id} (conf ${c.confidence}): checks: ${(c.checks || []).join('; ')}; fixes: ${(c.fixes || []).join('; ')}`).join('\n');
    return `## ${row.symptom}\n${row.label || ''}\n${cs}`;
  }));
  const cards = Object.values((bundle.cards && bundle.cards.cards) || {}).slice(0, 200);
  out.cards = toMd('Device reference cards (index, bounded)', cards.map((c) => {
    return `- \`${c.couple}\` driver=${c.driver || '?'} sources=${(c.sources || []).join(',')} quirks=${(c.quirks || []).slice(0, 3).join('; ')}`;
  }));
  out.dp = toMd('DP / cluster conversion vs Z2M/ZHA', (bundle.dp.rows || []).slice(0, 200).map((r) => `- ${r.couple || r.pattern || ''}: ${r.dp || ''} ${r.name || ''} ${r.transform || ''} (${r.source || ''})`));
  out.history = toMd('Request / intake history', (bundle.history.items || []).slice(-100).map((h) => `- ${h.date || ''} ${h.couple || ''} ${h.status || ''} ${h.source || ''} conf=${h.confidence ?? ''}`));
  out.lessons = toMd('Lessons / rules index', (bundle.lessons.items || []).map((l) => `- [${l.id || l.title}](${l.path || '#'}) ${l.summary || ''}`));
  out.ideas = toMd('Cross-app ideas register', (bundle.ideas.items || []).map((i) => `- ${i.tag || i.id}: ${i.note || ''} (${i.source || ''})`));
  const counts = bundle.manifest && bundle.manifest.counts ? JSON.stringify(bundle.manifest.counts) : '{}';
  out.readme = toMd('Referentials (SSOT)', [
    'Machine-readable JSON plus generated Markdown. Not shipped in the Homey package.',
    'Consult first in intake triage and deep investigations; write back learned entries.',
    `Counts: ${counts}`,
    '',
    '- malfunction-causes',
    '- device-cards',
    '- dp-conversion',
    '- intake-history',
    '- lessons-index',
    '- cross-app-ideas',
    '- learnings (append-only enrichment loop)',
  ]);
  return out;
}

function writeJsonBounded(file, obj) {
  let text = `${JSON.stringify(obj, null, 1)}\n`;
  if (Buffer.byteLength(text) > CAPS.maxJsonBytes) {
    text = `${JSON.stringify(obj)}\n`;
  }
  if (Buffer.byteLength(text) > CAPS.maxJsonBytes) {
    return { written: false, reason: 'over-size', bytes: Buffer.byteLength(text) };
  }
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (sha(stable(obj)) === sha(stable(loadJson(file, {}))) && prev) return { written: false, reason: 'unchanged' };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return { written: true, bytes: Buffer.byteLength(text) };
}

function writeBundle(root, bundle, opts = {}) {
  const dir = path.join(root, DIR);
  fs.mkdirSync(dir, { recursive: true });
  foldLearnings(bundle);
  const counts = {
    causes: ((bundle.causes && bundle.causes.items) || []).length,
    cards: Object.keys((bundle.cards && bundle.cards.cards) || {}).length,
    dp: ((bundle.dp && bundle.dp.rows) || []).length,
    history: ((bundle.history && bundle.history.items) || []).length,
    lessons: ((bundle.lessons && bundle.lessons.items) || []).length,
    ideas: ((bundle.ideas && bundle.ideas.items) || []).length,
    learnings: ((bundle.learnings && bundle.learnings.items) || []).length,
  };
  const hashes = {};
  const changed = [];
  const jsonMap = {
    causes: bundle.causes,
    cards: bundle.cards,
    dp: bundle.dp,
    history: bundle.history,
    lessons: bundle.lessons,
    ideas: bundle.ideas,
    learnings: bundle.learnings,
  };
  for (const [key, obj] of Object.entries(jsonMap)) {
    hashes[key] = sha(stable(obj));
    const res = writeJsonBounded(path.join(dir, FILES[key]), obj);
    if (res.written) changed.push(FILES[key]);
  }
  bundle.manifest = {
    v: 1,
    generated: nowIso(),
    freshness: nowIso(),
    counts,
    hashes,
    changed,
    note: 'Incremental referentials. Enrich, do not wipe learnings. Outside the app package.',
  };
  writeJsonBounded(path.join(dir, FILES.manifest), bundle.manifest);
  if (!opts.skipMd) {
    const md = renderMd(bundle);
    for (const [key, name] of Object.entries(MD)) {
      let text = md[key] || md.readme;
      if (Buffer.byteLength(text) > CAPS.maxMdBytes) text = text.slice(0, CAPS.maxMdBytes);
      const file = path.join(dir, name);
      const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (prev !== text) {
        fs.writeFileSync(file, text);
        changed.push(name);
      }
    }
  }
  return { changed, counts, dir };
}

module.exports = {
  DIR, FILES, MD, CAPS, SEED_CAUSES,
  emptyBundle, load, consultFirst, appendLearning, foldLearnings,
  learningKey, schemaErrors, writeBundle, renderMd, loadJson, sha, stable,
};
