#!/usr/bin/env node
'use strict';

/**
 * free-scrape-budget.js (P2372)
 *
 * Shared daily budget for free/keyless readers (Jina, Microlink, AllOrigins, Wayback, Firecrawl).
 * Prevents free-tier lockouts and server saturation. Prefer cache + direct HTTP.
 *
 * Usage:
 *   node tools/ci/free-scrape-budget.js --report
 *   node tools/ci/free-scrape-budget.js --preflight
 *   const { allow, consume, report } = require('./free-scrape-budget');
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CONFIG = path.join(ROOT, 'config/enrichment/free-scrape-budget.json');
const STATE = path.join(ROOT, '.cache/scraper-cache/_free-scrape-budget.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  } catch {
    return {
      defaults: { softStopPercent: 85 },
      dailyCaps: { jina: 80, microlink: 40, allorigins: 40, wayback: 20, firecrawl: 3, direct: 2000 },
    };
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    if (s.date === today()) return s;
  } catch { /* fresh */ }
  return { date: today(), used: {}, blockedUntil: {}, hits429: 0, hits403: 0 };
}

function saveState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
  } catch { /* best-effort */ }
}

function allow(tier, opts = {}) {
  const cfg = loadConfig();
  const state = loadState();
  const name = String(tier || 'direct').toLowerCase();
  const cap = Number(cfg.dailyCaps?.[name] ?? 50);
  const used = Number(state.used[name] || 0);
  const soft = Number(cfg.defaults?.softStopPercent || 85);
  const until = state.blockedUntil?.[name];
  // WHY(P2372): cap 0 = intentionally disabled (e.g. browser) — not a failure
  if (cap === 0) {
    return { ok: false, reason: 'disabled', used, cap, remaining: 0 };
  }
  if (until && Date.now() < until) {
    return { ok: false, reason: 'cooldown', used, cap, remaining: Math.max(0, cap - used) };
  }
  if (used >= cap) {
    return { ok: false, reason: 'daily_cap', used, cap, remaining: 0 };
  }
  if (!opts.hard && used >= Math.floor((cap * soft) / 100)) {
    return { ok: false, reason: 'soft_stop', used, cap, remaining: Math.max(0, cap - used) };
  }
  return { ok: true, used, cap, remaining: Math.max(0, cap - used) };
}

function consume(tier, n = 1) {
  const state = loadState();
  const name = String(tier || 'direct').toLowerCase();
  state.used[name] = Number(state.used[name] || 0) + n;
  saveState(state);
  return allow(name, { hard: true });
}

function markRateLimited(tier, statusCode = 429) {
  const cfg = loadConfig();
  const state = loadState();
  const name = String(tier || 'direct').toLowerCase();
  const ms = statusCode === 403
    ? Number(cfg.cooldownOn403Ms || 300000)
    : Number(cfg.cooldownOn429Ms || 120000);
  if (!state.blockedUntil) state.blockedUntil = {};
  state.blockedUntil[name] = Date.now() + ms;
  if (statusCode === 429) state.hits429 = (state.hits429 || 0) + 1;
  if (statusCode === 403) state.hits403 = (state.hits403 || 0) + 1;
  saveState(state);
  return { cooldownMs: ms, until: state.blockedUntil[name] };
}

function report() {
  const cfg = loadConfig();
  const state = loadState();
  const tiers = Object.keys(cfg.dailyCaps || {});
  const rows = tiers.map((t) => {
    const a = allow(t, { hard: true });
    return { tier: t, ...a, cooldownUntil: state.blockedUntil?.[t] || null };
  });
  return {
    date: state.date,
    mode: cfg.mode || 'free_first',
    hits429: state.hits429 || 0,
    hits403: state.hits403 || 0,
    tiers: rows,
    softStopPercent: cfg.defaults?.softStopPercent || 85,
  };
}

function preflight() {
  const r = report();
  const softStopped = r.tiers.filter((t) => !t.ok && t.reason === 'soft_stop').map((t) => t.tier);
  const capped = r.tiers.filter((t) => !t.ok && t.reason === 'daily_cap').map((t) => t.tier);
  const direct = r.tiers.find((t) => t.tier === 'direct');
  const ok = !direct || direct.ok || direct.reason === 'soft_stop';
  return { ok, softStopped, capped, report: r };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--preflight')) {
    const p = preflight();
    console.log(JSON.stringify(p, null, 2));
    process.exit(p.ok ? 0 : 1);
  }
  console.log(JSON.stringify(report(), null, 2));
}

module.exports = {
  allow,
  consume,
  markRateLimited,
  report,
  preflight,
  loadConfig,
};
