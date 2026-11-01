#!/usr/bin/env node
'use strict';
// P3097 (t646u): deterministic decision engine. First matching rule of config/autonomy-policy.json wins.
// Acts alone only when confidence >= actThreshold AND the action is reversible (publish keeps its own gates
// in auto-publish-on-push.yml). Everything else is deferred to the weekly digest. Every decision is logged
// (bounded) in .github/state/autonomy-decisions.jsonl with its reason.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const POLICY = path.join(ROOT, 'config', 'autonomy-policy.json');
const LOG = path.join(ROOT, '.github', 'state', 'autonomy-decisions.jsonl');

function matches(when, ev) {
  return Object.entries(when).every(([k, v]) => {
    if (k.endsWith('Lt')) return Number(ev[k.slice(0, -2)]) < v;
    if (k.endsWith('Gte')) return Number(ev[k.slice(0, -3)]) >= v;
    if (k.endsWith('Gt')) return Number(ev[k.slice(0, -2)]) > v;
    return ev[k] === v;
  });
}

const { validateCouple } = require('./sanitize');

// Granular overrides: config/autonomy-policy.json "overrides" entries scoped by any of
// branch / workflow / driver / family / couple ("mfr|pid") / dp. The most specific matching scope wins
// (dp > couple > driver > family > workflow > branch); it may force an action or change the threshold.
const SPECIFICITY = ['branch', 'workflow', 'family', 'driver', 'couple', 'dp'];
function override(ev, policy) {
  const hits = (policy.overrides || []).filter((o) => o.event === undefined || o.event === ev.type)
    .filter((o) => Object.entries(o.scope || {}).every(([k, v]) => String(ev[k]) === String(v)));
  const rank = (o) => Math.max(-1, ...Object.keys(o.scope || {}).map((k) => SPECIFICITY.indexOf(k)));
  return hits.sort((a, b) => rank(b) - rank(a))[0] || null;
}

function decide(ev, policy = JSON.parse(fs.readFileSync(POLICY, 'utf8'))) {
  if (policy.forbidden.includes(ev.requestedAction)) return { action: 'refuse', confidence: 1, autonomous: false, reason: `forbidden: ${ev.requestedAction}` };
  if (ev.type === 'new_couple') {
    // only structured, validated fields drive the decision; free text never does
    const c = validateCouple(ev.couple);
    ev = { type: ev.type, targetDriverExists: ev.targetDriverExists === true, coupleAlreadyListed: ev.coupleAlreadyListed === true, exactPair: !!c, hasSource: !!c };
  }
  const scope = { branch: ev.branch, workflow: ev.workflow, family: ev.family, driver: ev.driver, couple: ev.couple && ev.couple.mfr ? `${ev.couple.mfr}|${ev.couple.pid}` : ev.coupleKey, dp: ev.dp };
  const o = override({ ...ev, ...scope }, policy);
  if (o && o.action) return { action: o.action, confidence: 1, autonomous: false, reason: `override ${JSON.stringify(o.scope)}: ${o.reason || ''}`.trim() };
  if (o && typeof o.actThreshold === 'number') policy = { ...policy, actThreshold: o.actThreshold };
  const r = policy.rules.find((x) => x.event === ev.type && matches(x.when, ev));
  if (!r) return { action: 'defer', confidence: 0, autonomous: false, reason: 'no rule for event' };
  const autonomous = r.action !== 'defer' && r.confidence >= policy.actThreshold && r.reversible;
  return { action: autonomous || r.action === 'publish' ? r.action : (r.action === 'hold' ? 'hold' : 'defer'), confidence: r.confidence, autonomous, reason: r.reason };
}

function log(ev, d, file = LOG) {
  const line = JSON.stringify({ t: new Date().toISOString(), event: ev.type, ...d }) + '\n';
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-999) : [];
  fs.mkdirSync(path.dirname(file), { recursive: true }); // P3128: dir absent on fresh checkout
  fs.writeFileSync(file, prev.join('\n') + (prev.length ? '\n' : '') + line);
}

if (require.main === module) {
  const ev = JSON.parse(process.argv[2] || '{}');
  const d = decide(ev); log(ev, d); console.log(JSON.stringify(d));
}
module.exports = { decide, matches };
