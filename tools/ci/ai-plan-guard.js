#!/usr/bin/env node
'use strict';

/**
 * ai-plan-guard.js (P2227)
 *
 * Hard guard for "forfait inclus" / token-plan mode:
 * - Never enable paid providers unless AI_ALLOW_PAID=true
 * - Enforce included daily caps from config/security/ai-plan-forfait.json
 * - Soft-stop before exhausting included quota (default 85%)
 * - Prefer skipping AI (local heuristics) over overage spend
 *
 *   node tools/ci/ai-plan-guard.js --preflight
 *   node tools/ci/ai-plan-guard.js --json
 *   node tools/ci/ai-plan-guard.js --apply-env   # print export lines for bash
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CFG = path.join(ROOT, 'config', 'security', 'ai-plan-forfait.json');
const STATE = path.join(ROOT, '.github', 'state', 'ai-rate-state.json');
const OUT = path.join(ROOT, '.github', 'state', 'ai-plan-guard.json');

function loadJson(fp, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return fallback; }
}

function todayUsage() {
  const st = loadJson(STATE, {});
  const td = new Date().toISOString().slice(0, 10);
  if (st.dd !== td) return { date: td, d: {}, total: 0 };
  const d = st.d || {};
  const total = Object.values(d).reduce((a, c) => a + Number(c || 0), 0);
  return { date: td, d, total };
}

function buildReport() {
  const cfg = loadJson(CFG, {});
  const defaults = cfg.defaults || {};
  const caps = cfg.includedDailyCaps || {};
  const mode = process.env.AI_PLAN_MODE || defaults.AI_PLAN_MODE || 'forfait';
  const allowPaid = /^(1|true|yes)$/i.test(String(process.env.AI_ALLOW_PAID || defaults.AI_ALLOW_PAID || 'false'));
  const softPct = Number(process.env.AI_SOFT_STOP_PERCENT || defaults.AI_SOFT_STOP_PERCENT || 85);
  const globalCap = Number(process.env.AI_GLOBAL_DAILY_CAP || defaults.AI_GLOBAL_DAILY_CAP || 400);
  const usage = todayUsage();

  const providers = [];
  let softStop = false;
  let hardStop = false;

  for (const [name, includedCap] of Object.entries(caps)) {
    const used = Number(usage.d[name] || 0);
    const envCap = process.env[`AI_DAILY_CAP_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`];
    const cap = envCap && Number.isFinite(parseInt(envCap, 10)) ? parseInt(envCap, 10) : includedCap;
    const pct = cap > 0 ? Math.round((100 * used) / cap) : (used > 0 ? 100 : 0);
    const blockedPaid = (cfg.blockedUnlessPaidFlag || []).includes(name) && !allowPaid;
    const over = cap > 0 && used >= cap;
    if (pct >= softPct && cap > 0) softStop = true;
    if (over || blockedPaid) hardStop = hardStop || over;
    providers.push({
      name,
      used,
      cap,
      pct,
      blockedPaid,
      over,
      soft: pct >= softPct && !over,
    });
  }

  const globalPct = globalCap > 0 ? Math.round((100 * usage.total) / globalCap) : 0;
  if (globalPct >= softPct) softStop = true;
  if (usage.total >= globalCap) hardStop = true;

  const recommendedEnv = {
    AI_PLAN_MODE: mode,
    AI_ALLOW_PAID: allowPaid ? 'true' : 'false',
    AI_GLOBAL_DAILY_CAP: String(globalCap),
    AI_SOFT_STOP_PERCENT: String(softPct),
    GMAIL_DIAG_AI_MAX: String(defaults.GMAIL_DIAG_AI_MAX ?? '0'),
  };
  for (const [name, cap] of Object.entries(caps)) {
    const key = `AI_DAILY_CAP_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    recommendedEnv[key] = String(cap);
  }

  return {
    generatedAt: new Date().toISOString(),
    mode,
    allowPaid,
    softStop,
    hardStop,
    preferLocalHeuristics: softStop || hardStop || defaults.preferLocalHeuristics !== false,
    usage,
    globalCap,
    globalPct,
    providers,
    recommendedEnv,
    security: cfg.security || {},
    ok: !hardStop && mode === 'forfait' && !allowPaid,
    policy: cfg._meta?.policy,
  };
}

function main() {
  const report = buildReport();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  if (process.argv.includes('--apply-env')) {
    for (const [k, v] of Object.entries(report.recommendedEnv)) {
      console.log(`export ${k}=${JSON.stringify(v)}`);
    }
  } else if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('=== AI plan forfait guard (P2227) ===');
    console.log('mode:', report.mode, '| allowPaid:', report.allowPaid);
    console.log(`global: ${report.usage.total}/${report.globalCap} (${report.globalPct}%)`);
    console.log('softStop:', report.softStop, '| hardStop:', report.hardStop, '| preferLocal:', report.preferLocalHeuristics);
    for (const p of report.providers.filter((x) => x.used > 0 || x.blockedPaid || x.cap === 0)) {
      const flags = [
        p.blockedPaid ? 'PAID-BLOCK' : '',
        p.over ? 'OVER' : '',
        p.soft ? 'SOFT' : '',
      ].filter(Boolean).join(',');
      console.log(`  ${p.name}: ${p.used}/${p.cap} (${p.pct}%)${flags ? ' [' + flags + ']' : ''}`);
    }
    console.log('state:', OUT);
  }

  if (process.argv.includes('--preflight')) {
    if (report.allowPaid && report.mode === 'forfait') {
      console.error('::error::AI_ALLOW_PAID=true conflicts with forfait mode — refuse paid overage');
      process.exit(2);
    }
    if (report.hardStop) {
      console.error('::warning::AI included quota exhausted — skip AI, use local heuristics only');
      // Soft exit 0 so workflows continue without AI
      process.exit(0);
    }
    if (report.softStop) {
      console.log('::warning::AI soft-stop — prefer local heuristics; remaining calls limited');
    }
  }

  process.exit(0);
}

if (require.main === module) main();

module.exports = { buildReport };
