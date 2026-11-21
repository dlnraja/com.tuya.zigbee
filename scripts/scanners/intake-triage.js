#!/usr/bin/env node
'use strict';
/**
 * P3362 intake triage - deterministic deep protocol for every incoming request
 * (forum 140352 and others, GitHub issues, PRs, discussions).
 *
 * Collect sources -> cross-reference local SSOT dumps (Z2M, ZHA, deCONZ, Blakadder,
 * Hubitat, tuya-local, Johan, forum, diags, git history, DEVICE_TRUTH, KB, ledgers,
 * Bastien, Apple/HomeKit) -> classify -> evidence + test skeleton -> optional safe
 * apply (add or move). Never posts, never opens PRs, never invents ids, never removes
 * published driver or flow-card ids. GITHUB_TOKEN only in CI.
 *
 *   node scripts/scanners/intake-triage.js [--max=15] [--apply] [--apply-moves] [--dry]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sd = require('../lib/source-digest');
const refsLib = require('../lib/referentials');

const ROOT = path.join(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'data/ssot');
const PROGRESS = path.join(ROOT, 'data/progress');
const REPORT_DIR = path.join(ROOT, 'reports/intake-triage');
const DIAG_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const MODEL_RE = /\b(?:AY|ZG|NAS|TS|TRV|SZ|ZPV|BAC|FK)[-_A-Z0-9]{2,20}\b/g;
const SYMPTOMS = [
  ['crash', /crash|oom|out of memory|killed/i],
  ['empty-capabilities', /empty|null|no data|stays frozen|not reported|tile (?:is |stays )?(?:empty|blank)/i],
  ['unexpected-property', /unexpected property|tuya\.datapoint/i],
  ['unknown-device', /unknown zigbee device|no compatible Homey app/i],
  ['wrong-class', /wrong class|paired as (?:a )?(?:socket|plug|generic)|virtual driver/i],
  ['no-status', /status-only|without (?:sending|an? open|close)|read the actual|finne status/i],
  ['invalid-flow-card', /invalid_flow_card_id|missing flow card|unknown flow/i],
  ['sleepy-battery', /battery (?:dies?|drain)|sleepy|never reports/i],
  ['works-badly', /works badly|doesn'?t work|not work(?:ing)?|behaves wrong|wrong (?:value|unit|scale|reading|status)|malfunction|incorrect/i],
];

const MALFUNCTION_RE = /works badly|doesn'?t work|not work(?:ing)?|broken|behaves wrong|incorrect|wrong (?:value|unit|scale|reading|status)|tile (?:is |stays )?(?:empty|blank)|stays (?:empty|0|null|frozen)|always (?:0|100|open|closed)|inverted|divisor|lag|freeze|frozen|no status|empty capabilit|missing flow|invalid_flow_card|battery (?:dies?|drain)|sleepy|never reports|malfunction|unexpected property|crash|oom|finne status|without sending/i;

const INJECTION_PATTERNS = [
  ['ignore-instructions', /ignore (?:all )?(?:previous|prior|above) (?:instructions|rules|prompts)/i],
  ['system-override', /(?:system prompt|you are now|jailbreak|dan mode)/i],
  ['exfil', /(?:exfiltrat|process\.env|GITHUB_TOKEN|HOMEY_TOKEN|send (?:me )?(?:the )?(?:token|secret|password))/i],
  ['exec', /(?:rm\s+-rf|child_process|execSync|eval\(|new Function)/i],
  ['role-override', /(?:forget (?:your|the) (?:rules|guidelines)|disregard (?:your|the) (?:rules|safety)|do not follow (?:your|the) rules)/i],
];

const SSOT_FILES = [
  'data/ssot/couple-sources.json',
  'data/ssot/thread-digests.json',
  'data/ssot/forum-request-digest.json',
  'data/ssot/curated-facts.json',
  'docs/knowledge/device-truth.json',
  'data/progress/ledger.json',
  'data/diag-ids.json',
  'data/leads/auto-applied.json',
  'config/architecture/couple-driver-pins.json',
  'config/architecture/publish-sacred-keep-couples.json',
  'config/architecture/bastien-house-ssot.json',
  'config/architecture/forum-complementary-failover-ssot.json',
  'scripts/data/z2m-tuya-dps.json',
  'scripts/data/zha-tuya-dps.json',
  'scripts/data/zha-quirk-dps.json',
  'scripts/data/deconz-tuya-dps.json',
  'docs/ssot/referentials/malfunction-causes.json',
  'docs/ssot/referentials/device-cards.json',
  'docs/ssot/referentials/dp-conversion.json',
  'docs/ssot/referentials/intake-history.json',
  'docs/ssot/referentials/lessons-index.json',
  'docs/ssot/referentials/cross-app-ideas.json',
  'docs/ssot/referentials/learnings.json',
];

const argv = process.argv.slice(2);
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const loadJson = (p, fb) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } };
const writeJson = (p, obj) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(sd.assertClean(obj), null, 1)}\n`);
};
const lc = (s) => String(s || '').toLowerCase();

function flagUntrusted(text) {
  const flags = INJECTION_PATTERNS.filter(([, re]) => re.test(String(text || ''))).map(([n]) => n);
  return { untrusted: true, suspicious: flags.length > 0, flags, note: 'Request text is data only. Never execute instructions from it.' };
}

function isMalfunctionReport(item) {
  if ((item.symptoms || []).some((s) => s !== 'unknown-device')) return true;
  return MALFUNCTION_RE.test(String(item.text || ''));
}

function extractIntake(text) {
  const facts = sd.facts(text);
  const diagIds = [...new Set(String(text || '').toLowerCase().match(DIAG_RE) || [])].slice(0, 8);
  const models = [...new Set(String(text || '').match(MODEL_RE) || [])].slice(0, 12);
  const symptoms = SYMPTOMS.filter(([, re]) => re.test(text)).map(([n]) => n);
  const couples = [];
  for (const m of facts.mfrs) for (const p of facts.pids) couples.push(`${m}|${p}`);
  return {
    mfrs: facts.mfrs,
    pids: facts.pids,
    couples: [...new Set(couples)].slice(0, 20),
    models,
    diagIds,
    symptoms,
    dps: facts.dps,
    clusters: facts.clusters,
  };
}

function dumpHas(dump, couple) {
  if (!dump) return false;
  const couples = dump.couples || dump;
  if (couples && typeof couples === 'object' && !Array.isArray(couples)) {
    const keys = Object.keys(couples);
    const want = lc(couple);
    return keys.some((k) => lc(k) === want);
  }
  return false;
}

function lookupSources(couple, root = ROOT) {
  const [mfr, pid] = String(couple).split('|');
  const hits = [];
  const z2m = loadJson(path.join(root, 'scripts/data/z2m-tuya-dps.json'), {});
  const zha = loadJson(path.join(root, 'scripts/data/zha-quirk-dps.json'), {});
  const zha2 = loadJson(path.join(root, 'scripts/data/zha-tuya-dps.json'), {});
  const deconz = loadJson(path.join(root, 'scripts/data/deconz-tuya-dps.json'), {});
  if (dumpHas(z2m, couple)) hits.push({ source: 'z2m', couple });
  if (dumpHas(zha, couple) || dumpHas(zha2, couple)) hits.push({ source: 'zha', couple });
  if (dumpHas(deconz, couple)) hits.push({ source: 'deconz', couple });
  const ssot = loadJson(path.join(root, 'data/ssot/couple-sources.json'), { couples: {} });
  const row = (ssot.couples || {})[lc(couple)] || (ssot.couples || {})[couple];
  if (row) {
    for (const s of row.sources || []) hits.push({ source: s.source || 'ssot', couple, model: s.model || row.model, drivers: row.drivers });
  }
  const sacred = loadJson(path.join(root, 'config/architecture/publish-sacred-keep-couples.json'), { couples: [] });
  const pin = (sacred.couples || []).find((c) => lc(c.mfr) === lc(mfr) && String(c.pid) === String(pid));
  if (pin) hits.push({ source: 'sacred-keep', couple, drivers: [pin.driverId] });
  const truth = loadJson(path.join(root, 'docs/knowledge/device-truth.json'), {});
  const truthText = JSON.stringify(truth);
  if (mfr && truthText.toLowerCase().includes(lc(mfr))) hits.push({ source: 'device-truth', couple });
  const forum = loadJson(path.join(root, 'data/ssot/forum-request-digest.json'), { requests: [] });
  if ((forum.requests || []).some((r) => (r.couples || []).map(lc).includes(lc(couple)))) {
    hits.push({ source: 'forum-digest', couple });
  }
  return uniqSources(hits);
}

function uniqSources(hits) {
  const seen = new Set();
  return hits.filter((h) => {
    const k = `${h.source}:${h.couple}:${(h.drivers || []).join(',')}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function ssotComplement(couple, root = ROOT) {
  const used = [];
  for (const rel of SSOT_FILES) {
    if (fs.existsSync(path.join(root, rel))) used.push(rel);
  }
  const apple = [];
  for (const rel of ['config/architecture', 'docs/knowledge']) {
    const dir = path.join(root, rel);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (/apple|homekit/i.test(f)) apple.push(path.join(rel, f));
    }
  }
  return { filesConsulted: used.concat(apple), couple };
}

function indexDrivers(root = ROOT) {
  const dir = path.join(root, 'drivers');
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const id of fs.readdirSync(dir)) {
    const file = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(file)) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    const z = j.zigbee || {};
    const mfrs = new Set(([]).concat(z.manufacturerName || []).map(lc));
    const pids = new Set(([]).concat(z.productId || []).map(String));
    const flowFile = path.join(dir, id, 'driver.flow.compose.json');
    const flowIds = [];
    if (fs.existsSync(flowFile)) {
      try {
        const fl = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
        for (const k of ['triggers', 'conditions', 'actions']) {
          for (const c of fl[k] || []) if (c && c.id) flowIds.push(c.id);
        }
      } catch { /* ignore */ }
    }
    out.set(id, { id, class: j.class, mfrs, pids, flowIds, published: true });
  }
  return out;
}

function ownersOf(index, mfr, pid) {
  const hits = [];
  const m = lc(mfr);
  const p = String(pid);
  for (const [id, z] of index) {
    if (z.mfrs.has(m) && z.pids.has(p)) hits.push(id);
  }
  return hits;
}

function siblingPids(index, driverId, mfr) {
  const z = index.get(driverId);
  if (!z || !z.mfrs.has(lc(mfr))) return [];
  return [...z.pids];
}

function classify(item, { driversByBranch, sources }) {
  const couple = item.couple;
  const [mfr, pid] = couple.split('|');
  const branches = driversByBranch || {};
  const owners = {};
  const allOwners = new Set();
  for (const [branch, idx] of Object.entries(branches)) {
    const o = ownersOf(idx, mfr, pid);
    owners[branch] = o;
    o.forEach((d) => allOwners.add(d));
  }
  const sourceDrivers = [...new Set(sources.flatMap((s) => s.drivers || []).filter(Boolean))];
  const malfunction = isMalfunctionReport(item);
  if (!allOwners.size) {
    return { status: 'missing', owners, sourceDrivers, reason: 'couple not present on any branch', malfunction };
  }
  if (sourceDrivers.length === 1 && ![...allOwners].includes(sourceDrivers[0])) {
    return { status: 'misplaced', owners, sourceDrivers, reason: `present on ${[...allOwners].join(',')} but sources point to ${sourceDrivers[0]}`, malfunction };
  }
  if (sourceDrivers.length > 1 && ![...allOwners].some((d) => sourceDrivers.includes(d))) {
    return { status: 'misplaced', owners, sourceDrivers, reason: 'owners conflict with source drivers', malfunction };
  }
  if (malfunction) {
    return {
      status: 'bug',
      owners,
      sourceDrivers,
      escalated: true,
      reason: `basics green on ${[...allOwners].join(',')} but the user report is presumed true; escalate (already supported is not a closing state)`,
      malfunction: true,
    };
  }
  return { status: 'already_supported', owners, sourceDrivers, reason: `on ${[...allOwners].join(',')} with no malfunction report`, malfunction: false };
}

function planAction(item, classification, index, opts = {}) {
  const [mfr, pid] = item.couple.split('|');
  const { status, sourceDrivers, owners } = classification;
  const current = [...new Set(Object.values(owners || {}).flat())];
  if (status === 'already_supported') {
    return { action: 'none', reason: classification.reason, keepDrivers: current };
  }
  if (status === 'bug') {
    const top = (classification.causes || [])[0] || null;
    return {
      action: 'investigate',
      reason: classification.reason,
      keepDrivers: current,
      causes: classification.causes || [],
      candidateFix: top && (top.fix || top.candidateFix) || 'produce a fail-before / pass-after test for the top ranked cause',
      testHint: top && top.testHint || 'assert the official capability scale and the reported symptom',
    };
  }
  if (status === 'missing') {
    const target = sourceDrivers.length === 1 ? sourceDrivers[0] : null;
    if (!target || !index.get(target)) {
      return { action: 'skeleton', reason: 'missing, no unique existing target; emit a driver skeleton, do not invent a driver id automatically', keepDrivers: [] };
    }
    const z = index.get(target);
    const parasiteRisk = z.pids.size > 1 && !z.pids.has(String(pid));
    if (parasiteRisk) {
      return { action: 'add-exact-pair', target, mfr, pid, reason: 'target has other pids; add only as an exact pair or continuation to avoid cartesian parasites', keepDrivers: current };
    }
    return { action: 'add', target, mfr, pid, reason: 'missing; one recorded target driver', keepDrivers: current };
  }
  // misplaced
  const target = sourceDrivers.length === 1 ? sourceDrivers[0] : null;
  if (!target || !index.get(target)) {
    return { action: 'skeleton', reason: 'misplaced and sources conflict; new category/driver only as a skeleton artifact', keepDrivers: current };
  }
  const from = current.filter((d) => d !== target);
  const collateral = from.filter((d) => siblingPids(index, d, mfr).length > 1);
  const canStrip = from.filter((d) => siblingPids(index, d, mfr).length <= 1);
  return {
    action: 'move',
    target,
    mfr,
    pid,
    from,
    keepOnOldDriver: collateral,
    canStripExactFrom: canStrip,
    migration: 'already-paired devices stay on the old driver id; new pairings go to the target. Old driver id and its flow-card ids are kept.',
    reason: classification.reason,
    keepDrivers: current,
  };
}

function deepChecks(item, opts = {}) {
  const causes = [];
  const consulted = opts.consulted || { causes: [], card: null, learnings: [], history: [], dp: [] };
  const push = (row) => {
    causes.push({
      id: row.id,
      rank: row.rank || causes.length + 1,
      score: row.score || row.confidence || 0.5,
      evidence: row.evidence || '',
      candidateFix: row.fix || row.candidateFix || '',
      testHint: row.testHint || row.check || '',
      origin: row.origin || 'deep-check',
    });
  };
  for (const row of consulted.causes || []) {
    for (const c of row.causes || [row]) {
      push({ ...c, origin: 'referential', evidence: c.evidence || `catalogue symptom ${row.symptom || item.symptoms && item.symptoms[0] || ''}` });
    }
  }
  for (const l of consulted.learnings || []) {
    push({ id: l.cause || l.kind || 'learned', score: l.confidence || 0.8, evidence: l.evidence || 'prior learning', fix: l.fix, testHint: l.check, origin: 'referential-learning' });
  }
  const ctx = opts.deepContext || {};
  const upstream = ctx.upstream || {};
  const transforms = [];
  for (const [src, list] of Object.entries(upstream)) {
    for (const tup of list || []) {
      const tr = Array.isArray(tup) ? tup[2] : tup && tup.transform;
      if (tr && tr !== 'raw') transforms.push(`${src}:${tr}`);
    }
  }
  const driverSrc = ctx.driverSrc || '';
  if (transforms.length && driverSrc && !/div:|mul:|tuyaPercentToValvePosition|\/\s*100|\*\s*0\.01/.test(driverSrc)) {
    push({ id: 'scale-mismatch', score: 0.86, evidence: `upstream uses ${transforms.slice(0, 4).join(', ')} but the driver looks unscaled`, fix: 'scale DP values to the official capability range', testHint: 'fail-before unscaled 0-100, pass-after 0-1', origin: 'upstream-dp' });
  }
  if (consulted.card && consulted.card.quirks && consulted.card.quirks.length) {
    push({ id: 'known-wrong-behavior', score: 0.9, evidence: consulted.card.quirks.join('; '), fix: 'reuse the recorded quirk fix; do not close as already supported', origin: 'referential-card' });
  }
  if (consulted.history && consulted.history.length) {
    push({ id: 'similar-complaints', score: 0.7, evidence: `${consulted.history.length} prior intake/forum rows for this couple`, origin: 'referential-history' });
  }
  const owners = opts.owners || [];
  const index = opts.index;
  if (index && item.couple) {
    const [mfr] = item.couple.split('|');
    for (const d of owners) {
      const pids = siblingPids(index, d, mfr);
      if (pids.length > 1) push({ id: 'parasite-combo', score: 0.62, evidence: `${d} lists ${pids.length} productIds with this mfr (cartesian risk)`, fix: 'exact-pair or continuation; do not add a cross-product', origin: 'parasite' });
    }
  }
  if (ctx.compose && (ctx.compose.energy && (ctx.compose.energy.batteries || ctx.compose.energy.battery)) || (item.symptoms || []).includes('sleepy-battery')) {
    push({ id: 'sleepy-tx', score: 0.6, evidence: 'battery/sleepy device may need reporting or wake handling', origin: 'sleepy' });
  }
  if ((item.symptoms || []).includes('invalid-flow-card') || /invalid_flow_card/i.test(item.text || '')) {
    push({ id: 'flow-card-id', score: 0.8, evidence: 'invalid or missing flow card id', fix: 'stop firing the missing card; never remove a published id', origin: 'flow' });
  }
  if (ctx.crashes && ctx.crashes.length) {
    push({ id: 'driver-crash', score: 0.72, evidence: ctx.crashes.slice(0, 3).join('; '), origin: 'crash-ledger' });
  }
  if (ctx.gitLog && ctx.gitLog.some((l) => /revert|regress|break|scale|valve_position/i.test(l))) {
    push({ id: 'recent-regression', score: 0.68, evidence: ctx.gitLog.filter((l) => /revert|regress|break|scale|valve_position/i.test(l)).join('; '), origin: 'git' });
  }
  if ((item.symptoms || []).includes('no-status')) {
    push({ id: 'missing-readonly-refresh', score: 0.8, evidence: 'user wants status without sending a command', fix: 'read-only DP refresh', origin: 'symptom' });
  }
  causes.sort((a, b) => b.score - a.score);
  causes.forEach((c, i) => { c.rank = i + 1; });
  return { causes: causes.slice(0, 12) };
}

function gitHistory(couple, root = ROOT, runner) {
  const [mfr] = couple.split('|');
  const run = runner || ((args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 15000 }));
  try {
    const log = run(['log', '-n', '8', '--oneline', '-S', mfr, '--', 'drivers']);
    return String(log || '').trim().split('\n').filter(Boolean).slice(0, 8);
  } catch {
    return [];
  }
}

function testSkeleton(item, classification, plan) {
  const [mfr, pid] = item.couple.split('|');
  const expect = plan.target || (classification.sourceDrivers || [])[0] || 'TARGET_DRIVER';
  return `'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
function owners(needle) {
  const hits = [];
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const file = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(file)) continue;
    if (fs.readFileSync(file, 'utf8').toLowerCase().includes(String(needle).toLowerCase())) hits.push(id);
  }
  return hits;
}
describe('intake ${mfr}|${pid}', () => {
  it('the exact couple is on the intended driver only', () => {
    const hits = owners('${mfr}');
    assert.ok(hits.includes('${expect}'), 'expected ${expect}, got ' + hits.join(','));
  });
});
`;
}

function evidenceRecord(item, classification, sources, complement, history, plan, extra = {}) {
  return sd.assertClean({
    v: 1,
    couple: item.couple,
    url: item.url || '',
    status: classification.status,
    reason: classification.reason,
    escalated: !!classification.escalated,
    owners: classification.owners,
    sourceDrivers: classification.sourceDrivers,
    sources: sources.map((s) => ({ source: s.source, model: s.model || null, drivers: s.drivers || [] })),
    symptoms: item.symptoms || [],
    diagIds: item.diagIds || [],
    gitHistory: history,
    ssot: complement.filesConsulted,
    plan,
    untrusted: extra.untrusted || null,
    consultedReferentials: !!(extra.consulted && extra.consulted.consulted),
    causes: classification.causes || [],
  });
}

function mergeUnique(list, items, keyFn, max) {
  const seen = new Set((list || []).map(keyFn));
  const out = [...(list || [])];
  for (const it of items) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out.slice(-max);
}

function collectGithubEvent(event) {
  if (!event || typeof event !== 'object') return [];
  const node = event.issue || event.pull_request || event.discussion || {};
  const title = node.title || '';
  const body = node.body || '';
  const url = node.html_url || '';
  const text = `${title}\n${body}`;
  const extracted = extractIntake(text);
  const sourceType = event.issue ? 'issue' : event.pull_request ? 'pull_request' : event.discussion ? 'discussion' : 'github';
  const items = [];
  const couples = extracted.couples.length ? extracted.couples : [null];
  for (const c of couples) {
    items.push({
      sourceType,
      url,
      couple: c || undefined,
      text,
      symptoms: extracted.symptoms,
      diagIds: extracted.diagIds,
      mfrs: extracted.mfrs,
      pids: extracted.pids,
    });
  }
  return items;
}

async function collectItems(opts = {}) {
  const items = [...(opts.items || [])];
  if (opts.event) items.push(...collectGithubEvent(opts.event));
  else if (process.env.GITHUB_EVENT_PATH && process.env.GITHUB_EVENT_NAME && /^(issues|pull_request|discussion)/.test(process.env.GITHUB_EVENT_NAME)) {
    try { items.push(...collectGithubEvent(JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')))); } catch { /* ignore */ }
  }
  const forum = loadJson(path.join(opts.root || ROOT, 'data/ssot/forum-request-digest.json'), { requests: [] });
  for (const r of forum.requests || []) {
    for (const c of r.couples || []) {
      items.push({
        sourceType: 'forum',
        url: r.url,
        couple: c,
        mfrs: r.mfrs || [],
        pids: r.pids || [],
        diagIds: r.diagIds || [],
        symptoms: r.kind === 'bug' ? ['empty-capabilities'] : [],
        text: [r.kind, (r.ideas || []).join(' '), (r.diagIds || []).join(' ')].join(' '),
      });
    }
  }
  return items.slice(0, opts.max || 15);
}

function triageItem(raw, opts = {}) {
  const root = opts.root || ROOT;
  const untrusted = flagUntrusted(raw.text || '');
  const index = opts.index || indexDrivers(root);
  const driversByBranch = opts.driversByBranch || { current: index };
  const extracted = raw.couple ? {
    mfrs: raw.mfrs || [raw.couple.split('|')[0]],
    pids: raw.pids || [raw.couple.split('|')[1]],
    couples: [raw.couple],
    diagIds: raw.diagIds || extractIntake(raw.text || '').diagIds,
    symptoms: raw.symptoms || extractIntake(raw.text || '').symptoms,
    models: raw.models || [],
    dps: raw.dps || [],
  } : extractIntake(raw.text || '');
  const couple = extracted.couples[0];
  if (!couple) {
    return { skipped: true, reason: 'no exact mfr+pid couple', untrusted };
  }
  const item = { ...raw, ...extracted, couple };
  const bundle = opts.refs || refsLib.load(root);
  const consulted = refsLib.consultFirst(bundle, { couple, symptoms: item.symptoms, text: item.text });
  const sources = lookupSources(couple, root);
  if (consulted.card && consulted.card.driver) {
    sources.push({ source: 'referential', couple, drivers: [consulted.card.driver] });
  }
  const complement = ssotComplement(couple, root);
  const history = opts.history || gitHistory(couple, root, opts.gitRunner);
  const classification = classify(item, { driversByBranch, sources });
  const owners = [...new Set(Object.values(classification.owners || {}).flat())];
  if (classification.status === 'bug' || classification.escalated) {
    const deep = deepChecks(item, {
      consulted,
      index,
      owners,
      deepContext: opts.deepContext || {
        gitLog: history,
        upstream: opts.upstream,
        driverSrc: opts.driverSrc,
        crashes: opts.crashes,
      },
    });
    classification.causes = deep.causes;
  }
  const plan = planAction(item, classification, index, opts);
  const evidence = evidenceRecord(item, classification, sources, complement, history, plan, { untrusted, consulted });
  const skeleton = testSkeleton(item, classification, plan);
  let writtenBack = null;
  const allowWrite = opts.writeBack !== false && !opts.dry && !untrusted.suspicious && root;
  if (allowWrite && classification.status !== 'already_supported') {
    const top = (classification.causes || [])[0] || {};
    writtenBack = refsLib.appendLearning(root, {
      kind: classification.status,
      couple,
      symptom: (item.symptoms || [])[0] || (classification.escalated ? 'works-badly' : null),
      cause: top.id || classification.reason,
      check: top.testHint || null,
      fix: plan.candidateFix || top.candidateFix || null,
      evidence: top.evidence || classification.reason,
      source: raw.sourceType || 'intake-triage',
      workflow: 'intake-triage',
      confidence: classification.escalated ? 0.8 : 0.7,
      url: item.url || '',
    }, { bundle });
  }
  return { item, sources, classification, plan, evidence, skeleton, complement, untrusted, consulted, writtenBack };
}

function readCompose(root, driverId) {
  const file = path.join(root, 'drivers', driverId, 'driver.compose.json');
  return { file, json: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

function writeCompose(file, json) {
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

function ensureList(v) {
  if (Array.isArray(v)) return v.slice();
  if (v == null || v === '') return [];
  return [v];
}

function addExactCouple(root, driverId, mfr, pid) {
  const { file, json } = readCompose(root, driverId);
  json.zigbee = json.zigbee || {};
  const mfrs = ensureList(json.zigbee.manufacturerName);
  const pids = ensureList(json.zigbee.productId);
  if (!mfrs.map(lc).includes(lc(mfr))) mfrs.push(mfr);
  if (!pids.map(String).includes(String(pid))) pids.push(pid);
  json.zigbee.manufacturerName = mfrs;
  json.zigbee.productId = pids;
  writeCompose(file, json);
  return file;
}

function stripMfr(root, driverId, mfr) {
  const { file, json } = readCompose(root, driverId);
  const mfrs = ensureList((json.zigbee || {}).manufacturerName).filter((x) => lc(x) !== lc(mfr));
  if (!mfrs.length) {
    throw new Error(`refusing to empty manufacturerName on ${driverId}`);
  }
  json.zigbee.manufacturerName = mfrs;
  writeCompose(file, json);
  return file;
}

function canAutoApply(result, opts = {}) {
  const plan = result.plan || {};
  if (result.untrusted && result.untrusted.suspicious) return { ok: false, reason: 'suspicious request text; treat as data only' };
  if (opts.apply === false) return { ok: false, reason: 'apply disabled' };
  if (plan.action === 'add' && result.sources.length >= 1 && plan.target) return { ok: true, kind: 'add' };
  if (plan.action === 'add-exact-pair') return { ok: false, reason: 'exact-pair add is a candidate only (avoid cartesian parasites)' };
  if (plan.action === 'move' && opts.applyMoves !== false && plan.target && result.sources.length >= 1) {
    if ((result.classification.sourceDrivers || []).length !== 1) return { ok: false, reason: 'move needs a single source driver' };
    const from = plan.from || [];
    const canStrip = plan.canStripExactFrom || [];
    if (from.some((d) => !canStrip.includes(d))) {
      return { ok: false, reason: 'cannot strip source without collateral parasites; plan only' };
    }
    return { ok: true, kind: 'move' };
  }
  return { ok: false, reason: `action ${plan.action} is report-only` };
}

function applyPlan(result, opts = {}) {
  const gate = canAutoApply(result, opts);
  if (!gate.ok) return { applied: false, reason: gate.reason };
  const root = opts.root;
  if (!root) return { applied: false, reason: 'apply requires an explicit root' };
  const plan = result.plan;
  const changed = [];
  if (gate.kind === 'add') {
    changed.push(addExactCouple(root, plan.target, plan.mfr, plan.pid));
  }
  if (gate.kind === 'move') {
    changed.push(addExactCouple(root, plan.target, plan.mfr, plan.pid));
    for (const d of plan.canStripExactFrom || []) {
      if (d === plan.target) continue;
      changed.push(stripMfr(root, d, plan.mfr));
    }
  }
  return { applied: true, kind: gate.kind, changed, migration: plan.migration || null };
}

async function run(opts = {}) {
  const root = opts.root || ROOT;
  const max = opts.max || 15;
  const dry = !!opts.dry;
  const items = await collectItems({ ...opts, root, max });
  const results = [];
  const index = opts.index || indexDrivers(root);
  for (const raw of items.slice(0, max)) {
    results.push(triageItem(raw, { ...opts, root, index }));
  }
  const usable = results.filter((r) => !r.skipped);
  const digest = {
    _meta: {
      generator: 'intake-triage',
      note: 'Deterministic deep protocol. Never posts. Whole SSOT consulted. Moves keep old driver ids and flow cards.',
      generated: new Date().toISOString(),
    },
    items: usable.map((r) => r.evidence),
  };
  const tasks = usable.filter((r) => r.classification && r.classification.status !== 'already_supported').map((r) => ({
    kind: r.plan.action,
    target: r.item.couple,
    hint: r.plan.reason,
    url: r.item.url || '',
    status: r.classification.status,
    migration: r.plan.migration || null,
  }));
  const replies = usable.filter((r) => r.item.sourceType === 'forum' && r.item.url).map((r) => ({
    platform: 'forum',
    url: r.item.url,
    status: 'candidate',
    kind: r.classification.status,
    couple: r.item.couple,
    note: 'Intake triage candidate. The anti-flood routine decides. CI never posts.',
  }));

  if (!dry) {
    writeJson(path.join(OUT_DIR, 'intake-triage.json'), digest);
    const tasksPath = path.join(PROGRESS, 'candidate-tasks.json');
    const prev = loadJson(tasksPath, { items: [] });
    writeJson(tasksPath, {
      _meta: { generator: 'intake-triage', note: 'candidate tasks; never auto-applied blindly' },
      generated: digest._meta.generated,
      items: mergeUnique(prev.items, tasks, (x) => `${x.target}|${x.url}|${x.kind}`, 200),
    });
    const replyPath = path.join(PROGRESS, 'forum-reply-candidates.json');
    const prevR = loadJson(replyPath, { candidates: [] });
    writeJson(replyPath, {
      generated: digest._meta.generated,
      note: 'Candidates only. CI never posts. Never topic 26439.',
      candidates: mergeUnique(prevR.candidates, replies, (x) => x.url, 80),
    });
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const applied = [];
    for (const r of usable) {
      if (!r.skeleton) continue;
      const safe = String(r.item.couple).replace(/[^A-Za-z0-9_|-]/g, '_');
      fs.writeFileSync(path.join(REPORT_DIR, `skeleton-${safe}.test.js`), r.skeleton);
      writeJson(path.join(REPORT_DIR, `evidence-${safe}.json`), r.evidence);
      if (opts.apply && !opts.dry) {
        const out = applyPlan(r, { ...opts, root });
        r.applied = out;
        if (out.applied) applied.push({ couple: r.item.couple, kind: out.kind, changed: out.changed });
      }
    }
    if (applied.length) writeJson(path.join(root, 'data/leads/intake-applied.json'), { items: applied });
  }
  return { dry, count: usable.length, skipped: results.length - usable.length, statuses: usable.map((r) => r.classification.status), results: usable };
}

if (require.main === module) {
  run({
    max: Math.max(1, Math.min(40, Number(opt('max', '15')) || 15)),
    dry: argv.includes('--dry'),
    apply: argv.includes('--apply'),
    applyMoves: argv.includes('--apply-moves'),
  }).then((r) => {
    const summary = { dry: r.dry, count: r.count, skipped: r.skipped, statuses: r.statuses };
    console.log(JSON.stringify(summary, null, 1));
    if (process.env.GITHUB_STEP_SUMMARY) {
      try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Intake triage\n\`\`\`json\n${JSON.stringify(summary, null, 1)}\n\`\`\`\n`); } catch { /* ignore */ }
    }
  }).catch((e) => { console.error(e); process.exitCode = 1; });
}

module.exports = {
  extractIntake, lookupSources, indexDrivers, ownersOf, siblingPids,
  classify, planAction, gitHistory, testSkeleton, triageItem, canAutoApply, applyPlan,
  addExactCouple, stripMfr, ssotComplement, run, SYMPTOMS, collectGithubEvent,
  flagUntrusted, isMalfunctionReport, deepChecks, INJECTION_PATTERNS, MALFUNCTION_RE,
};
