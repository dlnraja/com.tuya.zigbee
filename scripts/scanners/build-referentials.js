#!/usr/bin/env node
'use strict';
/**
 * P3362 referentials builder - incremental regenerate + enrich.
 * Deterministic, no AI. Consult existing learnings and fold them in so a rebuild never wipes enrichment.
 *
 *   node scripts/scanners/build-referentials.js [--enrich] [--from=forum-poll] [--validate] [--dry]
 */
const fs = require('fs');
const path = require('path');
const refs = require('../lib/referentials');

const ROOT = path.join(__dirname, '../..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const loadJson = refs.loadJson;
const lc = (s) => String(s || '').toLowerCase();

function harvestCoupleSources(root, bundle, cap) {
  const raw = loadJson(path.join(root, 'data/ssot/couple-sources.json'), { couples: {} });
  const couples = raw.couples || {};
  const keys = Object.keys(couples);
  let n = 0;
  for (const k of keys) {
    if (Object.keys(bundle.cards.cards).length >= cap) break;
    const row = couples[k];
    const sources = (row.sources || []).map((s) => s.source || s).filter(Boolean);
    const strong = sources.some((s) => /z2m|zha|deconz|diag|kb|sacred/i.test(String(s)));
    if (!strong && n > 200) continue;
    const couple = k.includes('|') ? k : k;
    const card = bundle.cards.cards[couple] || { couple, sources: [], complaints: [], quirks: [] };
    card.driver = card.driver || (row.drivers && row.drivers[0]) || row.driver || card.driver;
    card.model = card.model || row.model || null;
    card.sources = [...new Set([].concat(card.sources || [], sources))];
    card.dps = card.dps || row.dps || null;
    bundle.cards.cards[couple] = card;
    n += 1;
  }
  return n;
}

function harvestDumps(root, bundle) {
  const files = [
    ['z2m', 'scripts/data/z2m-tuya-dps.json'],
    ['zha', 'scripts/data/zha-quirk-dps.json'],
    ['zha', 'scripts/data/zha-tuya-dps.json'],
    ['deconz', 'scripts/data/deconz-tuya-dps.json'],
  ];
  const rows = bundle.dp.rows || [];
  const seen = new Set(rows.map((r) => `${r.source}|${r.couple}|${r.dp}|${r.transform}`));
  const patternSeen = new Set(rows.filter((r) => r.pattern).map((r) => `${r.source}|${r.name}|${r.transform}`));
  for (const [source, rel] of files) {
    const dump = loadJson(path.join(root, rel), {});
    const couples = dump.couples || {};
    let added = 0;
    for (const [couple, list] of Object.entries(couples)) {
      if (!Array.isArray(list)) continue;
      for (const tup of list) {
        const dp = Array.isArray(tup) ? tup[0] : tup.dp;
        const name = Array.isArray(tup) ? tup[1] : tup.name;
        const transform = Array.isArray(tup) ? tup[2] : tup.transform;
        const patternKey = `${source}|${name}|${transform}`;
        if (!patternSeen.has(patternKey) && rows.length < refs.CAPS.maxDpRows) {
          rows.push({ pattern: `${name}:${transform}`, source, name, transform, exampleCouple: couple, dp });
          patternSeen.add(patternKey);
        }
        if (added < 3 && rows.length < refs.CAPS.maxDpRows) {
          const k = `${source}|${couple}|${dp}|${transform}`;
          if (!seen.has(k)) {
            rows.push({ couple, source, dp, name, transform });
            seen.add(k);
            added += 1;
          }
        }
      }
    }
  }
  bundle.dp.rows = rows.slice(0, refs.CAPS.maxDpRows);
}

function harvestForumAndIntake(root, bundle, from) {
  const forum = loadJson(path.join(root, 'data/ssot/forum-request-digest.json'), { requests: [] });
  const intake = loadJson(path.join(root, 'data/ssot/intake-triage.json'), { items: [] });
  const ideas = bundle.ideas.items || [];
  const ideaKeys = new Set(ideas.map((i) => i.tag || i.id));
  for (const r of forum.requests || []) {
    for (const tag of r.ideas || []) {
      if (!ideaKeys.has(tag)) {
        ideas.push({ tag, note: 'idea tag from a peer or product thread', source: 'forum-request-digest', date: r.date || null, confidence: 0.5 });
        ideaKeys.add(tag);
      }
    }
    for (const c of r.couples || []) {
      const card = bundle.cards.cards[c] || { couple: c, sources: [], complaints: [], quirks: [] };
      card.sources = [...new Set([].concat(card.sources || [], ['forum-digest']))];
      if (r.kind === 'bug') card.complaints = [...new Set([].concat(card.complaints || [], [r.kind]))];
      bundle.cards.cards[c] = card;
      bundle.history.items.push({ couple: c, status: r.kind || 'request', source: 'forum-request-digest', date: r.date || null, url: r.url || '', confidence: 0.7, evidence: 'forum request' });
    }
  }
  for (const it of intake.items || []) {
    if (!it.couple) continue;
    const card = bundle.cards.cards[it.couple] || { couple: it.couple, sources: [], complaints: [], quirks: [] };
    card.driver = card.driver || (it.sourceDrivers && it.sourceDrivers[0]) || card.driver;
    card.sources = [...new Set([].concat(card.sources || [], ['intake-triage']))];
    bundle.cards.cards[it.couple] = card;
    bundle.history.items.push({ couple: it.couple, status: it.status, source: 'intake-triage', date: it.date || null, url: it.url || '', confidence: 0.75, evidence: it.reason || '' });
  }
  bundle.ideas.items = ideas.slice(0, refs.CAPS.maxIdeas);
  bundle.history.items = bundle.history.items.slice(-refs.CAPS.maxHistory);
  return from;
}

function harvestSacredAndHomekit(root, bundle) {
  const sacred = loadJson(path.join(root, 'config/architecture/publish-sacred-keep-couples.json'), { couples: [] });
  for (const c of sacred.couples || []) {
    const couple = `${c.mfr}|${c.pid}`;
    const card = bundle.cards.cards[couple] || { couple, sources: [], complaints: [], quirks: [] };
    card.driver = c.driverId || card.driver;
    card.sources = [...new Set([].concat(card.sources || [], ['sacred-keep']))];
    card.notes = card.notes || c.note || null;
    bundle.cards.cards[couple] = card;
  }
  const homekit = path.join(root, 'docs/rules/HOMEKIT_CAPABILITY_RULES.md');
  if (fs.existsSync(homekit)) {
    for (const card of Object.values(bundle.cards.cards)) {
      card.homekit = card.homekit || 'Homey Apple Home bridge maps class + system capabilities only; see docs/rules/HOMEKIT_CAPABILITY_RULES.md';
    }
  }
}

function harvestLessons(root, bundle) {
  const dir = path.join(root, 'docs/rules');
  const items = bundle.lessons.items || [];
  const seen = new Set(items.map((i) => i.path));
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const rel = `docs/rules/${f}`;
      if (seen.has(rel)) continue;
      const text = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').slice(0, 8).join(' ').slice(0, 180);
      items.push({ id: f.replace(/\.md$/, ''), path: rel, title: f, summary: text.replace(/[#*`]/g, '').trim() });
      seen.add(rel);
    }
  }
  const extra = [
    'docs/knowledge/HOMEY_DEEP_CROSS_RESEARCH.md',
    'config/architecture/intake-triage-rules.json',
  ];
  for (const rel of extra) {
    if (seen.has(rel) || !fs.existsSync(path.join(root, rel))) continue;
    items.push({ id: path.basename(rel), path: rel, title: path.basename(rel), summary: 'intake / deep-research rule' });
  }
  bundle.lessons.items = items.slice(0, refs.CAPS.maxLessons);
}

function harvestBugPatterns(root, bundle) {
  const bugs = loadJson(path.join(root, 'data/bug-patterns.json'), {});
  for (const [id, row] of Object.entries(bugs)) {
    if (!row || typeof row !== 'object') continue;
    bundle.causes.items.push({
      symptom: id,
      label: (row.keywords || []).slice(0, 6).join(', '),
      causes: [{ id, rank: 1, checks: (row.keywords || []).slice(0, 4), fixes: row.autoResponse ? ['see recorded pattern, do not auto-post'] : [], confidence: 0.55 }],
    });
  }
  const bySym = new Map();
  for (const row of bundle.causes.items) {
    const k = lc(row.symptom);
    if (!bySym.has(k)) bySym.set(k, row);
  }
  bundle.causes.items = [...bySym.values()].slice(0, refs.CAPS.maxCauses);
}

function enrichFromWorkflow(root, bundle, from) {
  const source = from || 'referentials-rebuild';
  const findings = [];
  if (from === 'forum-poll' || !from) {
    const forum = loadJson(path.join(root, 'data/ssot/forum-request-digest.json'), { requests: [] });
    for (const r of (forum.requests || []).slice(-40)) {
      for (const c of r.couples || []) {
        findings.push({ kind: r.kind || 'request', couple: c, symptom: r.kind === 'bug' ? 'works-badly' : null, source, workflow: source, confidence: 0.7, evidence: r.url || 'forum-digest', date: r.date || new Date().toISOString() });
      }
    }
  }
  if (from === 'crash-triage' || from === 'fetch-diags' || !from) {
    const ledger = loadJson(path.join(root, 'data/progress/ledger.json'), null);
    const rows = Array.isArray(ledger) ? ledger : (ledger && (ledger.items || ledger.entries || [])) || [];
    for (const e of rows.slice(-30)) {
      const couple = e.couple || (e.mfr && e.pid ? `${e.mfr}|${e.pid}` : null);
      if (!couple && !e.driver) continue;
      findings.push({ kind: 'diag', couple, cause: e.signature || e.note || e.driver, source, workflow: source, confidence: 0.65, evidence: e.id || e.diagId || 'ledger', date: e.date || new Date().toISOString() });
    }
  }
  if (from === 'upstream-thread-miner' || !from) {
    const digest = loadJson(path.join(root, 'data/ssot/thread-digests.json'), {});
    const threads = digest.threads || digest.items || [];
    const list = Array.isArray(threads) ? threads : Object.values(threads);
    for (const t of list.slice(-20)) {
      findings.push({ kind: 'idea', symptom: (t.ideas && t.ideas[0]) || null, cause: t.title || t.id || 'thread', source, workflow: source, confidence: 0.5, evidence: t.url || 'thread-digests', date: new Date().toISOString() });
    }
  }
  let appended = 0;
  let deduped = 0;
  for (const f of findings.slice(0, 80)) {
    const r = refs.appendLearning(root, f, { bundle, skipWrite: true });
    if (r.deduped) deduped += 1;
    else appended += 1;
  }
  return { appended, deduped, source };
}

function build(opts = {}) {
  const root = opts.root || ROOT;
  const bundle = refs.load(root);
  harvestSacredAndHomekit(root, bundle);
  harvestCoupleSources(root, bundle, refs.CAPS.maxCards);
  harvestDumps(root, bundle);
  harvestForumAndIntake(root, bundle, opts.from);
  harvestLessons(root, bundle);
  harvestBugPatterns(root, bundle);
  const enrich = enrichFromWorkflow(root, bundle, opts.from || (opts.enrich ? 'enrich' : 'referentials-rebuild'));
  refs.foldLearnings(bundle);
  // cap cards
  const keys = Object.keys(bundle.cards.cards);
  if (keys.length > refs.CAPS.maxCards) {
    const keep = {};
    for (const k of keys.slice(-refs.CAPS.maxCards)) keep[k] = bundle.cards.cards[k];
    bundle.cards.cards = keep;
  }
  const errors = refs.schemaErrors(bundle);
  if (opts.validateOnly) return { ok: errors.length === 0, errors, counts: { learnings: (bundle.learnings.items || []).length } };
  if (opts.dry) return { dry: true, errors, enrich, counts: {
    cards: Object.keys(bundle.cards.cards).length,
    learnings: (bundle.learnings.items || []).length,
    dp: (bundle.dp.rows || []).length,
  } };
  const written = refs.writeBundle(root, bundle);
  return { ok: errors.length === 0, errors, enrich, ...written };
}

if (require.main === module) {
  const validateOnly = argv.includes('--validate');
  const res = build({
    enrich: argv.includes('--enrich') || !validateOnly,
    from: opt('from', ''),
    dry: argv.includes('--dry'),
    validateOnly,
  });
  if (validateOnly && !res.ok) {
    console.error(JSON.stringify(res, null, 1));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(res, null, 1));
  }
}

module.exports = { build, harvestForumAndIntake, enrichFromWorkflow };
