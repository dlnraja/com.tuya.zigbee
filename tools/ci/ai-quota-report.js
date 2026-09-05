#!/usr/bin/env node
'use strict';
/**
 * ai-quota-report.js (P92.79)
 * Weekly visibility on AI usage vs daily caps (the billing guard enforces
 * hard limits; this SURFACES them so quota exhaustion never comes as a
 * surprise). Reads .github/state/ai-rate-state.json (usage today) and
 * scripts/automation/token-budget.js (caps), prints a summary table.
 *
 * Exit 0 always (report only). Usage: node tools/ci/ai-quota-report.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const STATE = path.join(ROOT, '.github', 'state', 'ai-rate-state.json');

let budgets = {};
try {budgets = require(path.join(ROOT, 'scripts', 'automation', 'token-budget.js')).BUDGETS || {};} catch { /* no budget file */ }

let forfaitCaps = {};
try {
  forfaitCaps = require(path.join(ROOT, 'config', 'security', 'ai-plan-forfait.json')).includedDailyCaps || {};
} catch { /* optional */ }

let state = { d: {}, dd: 'n/a' };
try {state = JSON.parse(fs.readFileSync(STATE, 'utf8'));} catch { /* no state yet */ }

let globalCap = 400;
try {
  globalCap = parseInt(
    process.env.AI_GLOBAL_DAILY_CAP
      || require(path.join(ROOT, 'config', 'security', 'ai-plan-forfait.json')).defaults.AI_GLOBAL_DAILY_CAP
      || '400',
    10
  );
} catch {
  globalCap = parseInt(process.env.AI_GLOBAL_DAILY_CAP || '400', 10);
}
const total = Object.values(state.d || {}).reduce((a, c) => a + c, 0);

console.log(`[ai-quota] forfait | date=${state.dd || 'n/a'} | usage global: ${total}/${globalCap} (${globalCap ? Math.round(100 * total / globalCap) : 0}%)`);

const providers = new Set([...Object.keys(budgets), ...Object.keys(forfaitCaps), ...Object.keys(state.d || {})]);
let warned = 0;
for (const name of [...providers].sort()) {
  const used = (state.d || {})[name] || 0;
  const cap = Number.isFinite(forfaitCaps[name])
    ? forfaitCaps[name]
    : (budgets[name]?.dailyRequests ?? 500);
  const tier = budgets[name]?.tier || 'free';
  const pct = cap ? Math.round(100 * used / cap) : (used > 0 ? 100 : 0);
  const flag = pct >= 80 || (cap === 0 && tier === 'paid') ? ' ⚠️' : '';
  if (pct >= 80) {warned++;}
  console.log(`  ${flag} ${name.padEnd(16)} ${String(used).padStart(4)}/${String(cap).padEnd(5)} (${String(pct).padStart(3)}%) [${tier}]`);
}
if (warned) {
  console.log(`[ai-quota] ⚠️ ${warned} provider(s) ≥ 80% de leur cap journalier`);
} else {
  console.log('[ai-quota] OK — aucun provider proche de son cap');
}
