#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * shadow-mode-v2.js — IMPROVED continuous ticket framework
 *
 * Lessons learned (v0.2.0):
 * 1. The existing .github/scripts/diagnostic-auto-resolver.js is a PRODUCTION-READY
 *    ticket ingestion system. It already handles Gmail diagnostics, GH issues,
 *    forum posts, PR scans, and posts ghostwritten comments.
 * 2. We should NOT re-implement what already exists.
 * 3. We should ADD: metrics tracking, local-only dry-run mode, variant engine
 *    integration, and a unified state file.
 *
 * Usage:
 *   node tools/shadow-mode/shadow-mode-v2.js --dry-run
 *   node tools/shadow-mode/shadow-mode-v2.js --metrics
 *   node tools/shadow-mode/shadow-mode-v2.js --use-resolver     # invoke diagnostic-auto-resolver
 *   node tools/shadow-mode/shadow-mode-v2.js --enrich           # run enrichment pipeline (forum+johan+enricher+mfs)
 *   node tools/shadow-mode/shadow-mode-v2.js --all              # dry-run + enrich + use-resolver + metrics
 *
 * State: tools/shadow-mode/state.json (per-session)
 *
 * @author Mavis investigation 2026-07-10
 * @version 0.2.2 (added --enrich pipeline with forum-integration, johan-ticket-importer, bidirectional-enricher, mfs-db-enricher, intelligent-variant-finder)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOOLS_DIR = path.resolve(__dirname);                     // = master/tools/shadow-mode
const MASTER_DIR = path.resolve(__dirname, '..', '..');          // = master/
const HOMEY_ROOT = path.resolve(__dirname, '..', '..', '..');     // = homey/
const STATE_FILE = path.join(__dirname, 'state.json');
const GITHUB_SCRIPTS = path.join(MASTER_DIR, '.github', 'scripts');
const GITHUB_STATE = path.join(MASTER_DIR, '.github', 'state');
const CANONICAL_FPS = path.join(MASTER_DIR, 'data', 'fingerprints.json');
const DRIVER_MAPPING = path.join(MASTER_DIR, 'driver-mapping-database.json');
const HERDSMAN_CACHE = path.join(MASTER_DIR, '.github', 'cache', 'z2m', 'tuya.ts');
const APP_ROOT = MASTER_DIR;
const NODE_BIN = process.execPath;

const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue:   (s) => `\x1b[34m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  gray:   (s) => `\x1b[90m${s}\x1b[0m`,
};

function loadState() {
  const defaults = {
    name: 'shadow-mode-v2',
    version: '0.2.2',
    created: new Date().toISOString(),
    metrics: {
      runs_total: 0,
      tickets_extracted: 0,
      tickets_processed: 0,
      bugs_found: 0,
      bugs_fixed: 0,
      prs_created: 0,
      forum_posts_responded: 0,
      gh_issues_commented: 0,
      mojibake_fixed: 5400, // already done in v0.1.0 + --fix
      drivers_analyzed: 0,
      time_saved_minutes: 0,
    },
    last_run: null,
    last_dry_run: null,
    last_metrics_update: null,
  };
  if (fs.existsSync(STATE_FILE)) {
    try {
      const old = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // Migrate: if old has no metrics, add it. If old has v0.1.0 fields, keep them.
      return {
        ...defaults,
        ...old,
        metrics: { ...defaults.metrics, ...(old.metrics || {}) },
      };
    }
    catch (e) { /* fall through */ }
  }
  return defaults;
}

function saveState(s) {
  s.last_run = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
}

/**
 * Read existing CI state files. These are PRODUCTION telemetry from
 * gmail-diagnostics.yml, driver-health, bug-hunter, etc.
 */
function readCiState() {
  const state = {};
  for (const f of ['bug-hunter-state.json', 'diagnostics-report.json', 'driver-health-report.json', 'gmail-token-health.json']) {
    const p = path.join(GITHUB_STATE, f);
    if (fs.existsSync(p)) {
      try { state[f.replace('.json', '')] = JSON.parse(fs.readFileSync(p, 'utf8')); }
      catch (e) { state[f.replace('.json', '')] = { error: e.message }; }
    }
  }
  return state;
}

/**
 * Source: local documentation files. Pulls from 23 docs/ files.
 */
function pullFromLocalDocs() {
  const tickets = [];
  const docsPath = path.join(MASTER_DIR, 'docs');
  if (!fs.existsSync(docsPath)) return tickets;

  for (const f of fs.readdirSync(docsPath)) {
    if (!f.endsWith('.md')) continue;
    const fp = path.join(docsPath, f);
    let content;
    try { content = fs.readFileSync(fp, 'utf8'); } catch (e) { continue; }

    // Extract GH issues (#NNN), Forum (Issue #NNN), JB#NNN patterns
    // Two header styles:
    //   GH:  ### #127 Tauno20 — WZ-M100
    //   Forum: ### Issue #1: Smart Button No Flow
    // Both are matched by allowing "#?" before OR after "Issue"
    const matches = [
      ...content.matchAll(/^#{1,6}\s+(?:Issue\s+)?#(\d+)[^\n]+/gmi),
      ...content.matchAll(/JB#(\d+)\s+(\w+)\s+([^\n]+)/g),
    ];
    for (const m of matches) {
      // m[0] is the full match (the title), m[1] is the digit, m[2]/m[3] are extra
      // groups only for the JB regex. For the first regex, m[2] and m[3] are undefined.
      const title = (m[0] || '').replace(/^#+\s+/, '').trim() || '(no title)';
      // Extract mfr + deviceIds from the BODY (next 800 chars after header)
      // because mfrs are usually in the body, not the header
      const startIdx = m.index + m[0].length;
      const body = content.substring(startIdx, startIdx + 800);
      const mfr = extractMfr(body) || extractMfr(title);
      const deviceIds = [...extractDeviceIds(body), ...extractDeviceIds(title)];
      tickets.push({
        id: `${f}-${m[1]}-${(m[2]||'').substring(0,30)}`.substring(0, 120),
        source: `docs/${f}`,
        title: title.substring(0, 200),
        mfr,
        deviceIds: [...new Set(deviceIds)],
        status: 'open',
        priority: extractPriority(title + ' ' + body),
      });
    }
  }
  return tickets;
}

function extractMfr(text) {
  // Match: _TZ3000_xxx, _TZE200_xxx, _TYZB01_xxx, _TYST11_xxx, _ZBxxx_xxx
  // Note: TZ\d+ (one or more digits), not TZ\d (one digit) — bug fix 2026-07-10
  const m = text && text.match(/_(TZ\d+|TZE\d+|TYZB\d+|TYST\d+|Z[A-Z]{2})_[a-zA-Z0-9]+/);
  return m ? m[0] : null;
}

function extractDeviceIds(text) {
  if (!text) return [];
  return [...new Set(text.match(/TS\d{4}[a-zA-Z]?/g) || [])];
}

function extractPriority(text) {
  if (!text) return 'normal';
  if (/CRITICAL|URGENT/i.test(text)) return 'critical';
  if (/\bHIGH\b/i.test(text)) return 'high';
  if (/\bMEDIUM\b/i.test(text)) return 'medium';
  if (/\bLOW\b/i.test(text)) return 'low';
  return 'normal';
}

/**
 * Source: CI state files (production telemetry from GHA workflows).
 */
function pullFromCiState() {
  const ci = readCiState();
  const tickets = [];

  // bug-hunter-state.json: 1253 warnings, 1323 info
  const bh = ci['bug-hunter-state'];
  if (bh && bh.issues) {
    tickets.push({
      id: `bug-hunter-summary-${bh.timestamp}`,
      source: '.github/state/bug-hunter-state.json',
      title: `Bug hunter: ${bh.issues.warning} warnings, ${bh.issues.info} info (score: ${bh.score})`,
      mfr: null,
      deviceIds: [],
      status: bh.issues.critical > 0 ? 'critical' : 'open',
      priority: bh.issues.critical > 0 ? 'critical' : 'high',
    });
  }

  // diagnostics-report.json: gmail status
  const diag = ci['diagnostics-report'];
  if (diag) {
    if (diag.access && diag.access.gmail && !diag.access.gmail.ok) {
      tickets.push({
        id: `gmail-blocked-${diag.timestamp || 'unknown'}`,
        source: '.github/state/diagnostics-report.json',
        title: `Gmail diagnostics BLOCKED: ${diag.access.gmail.code || 'unknown'}. Fix GMAIL_* secrets.`,
        mfr: null,
        deviceIds: [],
        status: 'blocked',
        priority: 'critical',
      });
    }
    if (diag.count > 0) {
      tickets.push({
        id: `diagnostics-pending-${diag.count}-${diag.timestamp}`,
        source: '.github/state/diagnostics-report.json',
        title: `${diag.count} Gmail diagnostics pending analysis`,
        mfr: null,
        deviceIds: [],
        status: 'pending',
        priority: 'high',
      });
    }
  }

  // driver-health-report.json: 52 critical, 378 warning
  const dh = ci['driver-health-report'];
  if (dh && dh.fleetHealth) {
    const f = dh.fleetHealth;
    if (f.critical > 0) {
      tickets.push({
        id: `driver-fleet-${f.critical}critical-${dh.timestamp}`,
        source: '.github/state/driver-health-report.json',
        title: `${f.critical} critical drivers (${f.averageScore}/100 avg). WiFi fleet = 40/100.`,
        mfr: null,
        deviceIds: [],
        status: 'open',
        priority: f.critical > 20 ? 'critical' : 'high',
      });
    }
  }

  return tickets;
}

/**
 * Source: fingerprints canonical DB + herdsman cache.
 * Finds new FPs that exist in Z2M but not in our canonical DB.
 */
function pullFromFingerprints() {
  const tickets = [];
  if (!fs.existsSync(CANONICAL_FPS)) return tickets;
  let canonical;
  try { canonical = JSON.parse(fs.readFileSync(CANONICAL_FPS, 'utf8')); } catch (e) { return tickets; }

  let orphanCount = 0, noDriverCount = 0;
  for (const [fp, info] of Object.entries(canonical || {})) {
    if (!info || !info.driverId) {
      noDriverCount++;
      if (noDriverCount <= 3) {
        tickets.push({
          id: `fp-no-driverId-${fp}`,
          source: 'data/fingerprints.json',
          title: `FP ${fp} has no driverId`,
          mfr: fp,
          deviceIds: info?.productIds || [],
          status: 'open',
          priority: 'high',
        });
      }
    } else if (!info.manufacturerName) {
      orphanCount++;
    }
  }

  if (noDriverCount > 3) {
    tickets.push({
      id: `fp-no-driverId-summary-${noDriverCount}`,
      source: 'data/fingerprints.json',
      title: `${noDriverCount} FPs missing driverId (first 3 shown above)`,
      mfr: null,
      deviceIds: [],
      status: 'open',
      priority: 'high',
    });
  }

  return tickets;
}

/**
 * Invoke the production diagnostic-auto-resolver.js (in dry-run by default).
 * This is the OFFICIAL ticket ingestion system.
 */
function invokeDiagnosticResolver(state, dryRun = true) {
  const resolverScript = path.join(GITHUB_SCRIPTS, 'diagnostic-auto-resolver.js');
  if (!fs.existsSync(resolverScript)) {
    return { ok: false, error: `diagnostic-auto-resolver.js not found at ${resolverScript}` };
  }
  try {
    const env = { ...process.env, DRY_RUN: dryRun ? 'true' : 'false', GH_PAT: process.env.GH_PAT || '', GITHUB_TOKEN: process.env.GITHUB_TOKEN || '' };
    const cmd = `"${NODE_BIN}" "${resolverScript}"`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', timeout: 120000, env });
    return { ok: true, output: out.substring(0, 500), dryRun };
  } catch (e) {
    return { ok: false, error: e.message, stdout: e.stdout?.toString()?.substring(0, 500) };
  }
}

/**
 * Variant engine integration: 1 mfr × N devices × M impls.
 * Uses the existing variant-engine.js.
 */
function resolveVariants(mfr) {
  try {
    const { resolveVariants } = require('./variant-engine');
    return resolveVariants(mfr);
  } catch (e) {
    return null;
  }
}

function generateFixProposal(ticket) {
  if (!ticket.mfr) return null;
  const variants = resolveVariants(ticket.mfr);
  if (!variants) return null;
  return {
    strategy: variants.drivers.length === 1
      ? `Add FP to ${variants.drivers[0]}; verify DP mappings against Z2M`
      : `mfr is ambiguous (${variants.drivers.length} drivers). Need human triage.`,
    drivers: variants.drivers,
    productIds: variants.productIds,
    implementations: variants.implementations.length,
    confidence: variants.drivers.length === 1 ? 80 : 50,
  };
}

function dedupe(tickets) {
  const seen = new Map();
  for (const t of tickets) {
    if (!seen.has(t.id)) seen.set(t.id, t);
  }
  return [...seen.values()];
}

function filterActionable(tickets) {
  return tickets.filter((t) => t.status === 'open' || t.status === 'pending' || t.status === 'blocked' || t.status === 'critical');
}

function printBanner(state) {
  console.log(C.bold(`\n🌒 Shadow Mode v2.0 — ${state.name} v${state.version}\n`));
  console.log(C.gray('═'.repeat(70)));
  console.log(C.gray(`  Last run: ${state.last_run || 'never'}`));
  console.log(C.gray(`  Runs: ${state.metrics.runs_total}`));
  console.log(C.gray(`  Tickets extracted: ${state.metrics.tickets_extracted}`));
  console.log(C.gray(`  Tickets processed: ${state.metrics.tickets_processed}`));
  console.log(C.gray(`  Bugs found: ${state.metrics.bugs_found}, fixed: ${state.metrics.bugs_fixed}`));
  console.log(C.gray('═'.repeat(70)));
}

function cmdDryRun(state) {
  console.log(C.blue('\n▸ Phase 1: Pulling from local sources...'));
  const all = [];
  const sources = [
    ['local-docs', pullFromLocalDocs],
    ['ci-state', pullFromCiState],
    ['fingerprints', pullFromFingerprints],
  ];
  // v0.2.1: Add production-resolver (bridge to diagnostic-auto-resolver + KB)
  try {
    const { pullFromProduction } = require('./sources/production-resolver');
    const prod = pullFromProduction();
    console.log(C.gray(`  production-resolver: ${prod.length} tickets`));
    all.push(...prod);
  } catch (e) {
    console.log(C.gray(`  production-resolver: not available (${e.message})`));
  }
  // v0.2.2: Add autonomous-email-recovery (NEW - safe secret loader)
  try {
    const { scoreEmail, generateProposal } = require(path.join(MASTER_DIR, '.github', 'scripts', 'autonomous-email-recovery'));
    const { readLocally } = require(path.join(MASTER_DIR, '.github', 'scripts', 'gmail-local-reader'));
    const emails = readLocally();
    const good = emails.filter((e) => scoreEmail(e) >= 10).slice(0, 20);
    console.log(C.gray(`  autonomous-email-recovery: ${good.length} actionable emails (of ${emails.length})`));
    for (const email of good) {
      const proposal = generateProposal(email);
      all.push({
        id: `autonomous-${email.id}`,
        source: 'autonomous-email-recovery',
        title: `[Recovery] ${email.subj.substring(0, 80)}`,
        mfr: proposal.mfr,
        deviceIds: proposal.pids,
        body: email.body?.substring(0, 500) || '',
        status: 'open',
        priority: proposal.confidence >= 70 ? 'high' : 'normal',
      });
    }
  } catch (e) {
    console.log(C.gray(`  autonomous-email-recovery: not available (${e.message})`));
  }
  for (const [name, fn] of sources) {
    try {
      const t = fn();
      console.log(C.gray(`  ${name}: ${t.length} tickets`));
      all.push(...t);
    } catch (e) {
      console.log(C.red(`  ${name}: ERROR ${e.message}`));
    }
  }

  console.log(C.blue('\n▸ Phase 2: Deduplicate + filter actionable'));
  const deduped = dedupe(all);
  const actionable = filterActionable(deduped);
  console.log(C.gray(`  ${all.length} raw → ${deduped.length} unique → ${actionable.length} actionable`));

  console.log(C.blue('\n▸ Phase 3: Variant engine + fix proposals'));
  let fixed = 0, prsCreated = 0;
  for (const t of actionable.slice(0, 20)) {
    console.log(C.bold(`\n  [${(t.priority || 'normal').toUpperCase()}] ${t.id}`));
    console.log(C.gray(`    source: ${t.source}`));
    console.log(C.gray(`    title: ${t.title}`));
    if (t.mfr) {
      console.log(C.yellow(`    mfr: ${t.mfr}`));
      const fix = generateFixProposal(t);
      if (fix) {
        console.log(C.gray(`    strategy: ${fix.strategy}`));
        console.log(C.gray(`    confidence: ${fix.confidence}%`));
        console.log(C.gray(`    drivers: ${fix.drivers.length}, impls: ${fix.implementations}`));
        fixed++;
      }
    } else {
      console.log(C.gray(`    (no mfr — process as non-FP ticket)`));
    }
  }

  state.metrics.runs_total++;
  state.metrics.tickets_extracted += all.length;
  state.metrics.tickets_processed += Math.min(actionable.length, 20);
  state.metrics.bugs_found += fixed;
  state.last_dry_run = new Date().toISOString();
  saveState(state);
}

function cmdMetrics(state) {
  console.log(C.blue('\n▸ Metrics:'));
  console.log(JSON.stringify(state.metrics, null, 2));
}

function cmdUseResolver(state) {
  console.log(C.blue('\n▸ Invoking diagnostic-auto-resolver.js (production ticket ingestion)...'));
  const result = invokeDiagnosticResolver(state, true);
  if (result.ok) {
    console.log(C.green(`  ✓ Resolver ran successfully (dry-run)`));
    if (result.output) console.log(C.gray('  Output: ' + result.output.replace(/\n/g, ' / ').substring(0, 200)));
  } else {
    console.log(C.yellow(`  ⚠ Resolver error: ${result.error}`));
    if (result.stdout) console.log(C.gray('  stdout: ' + result.stdout));
  }
  state.metrics.runs_total++;
  state.last_metrics_update = new Date().toISOString();
  saveState(state);
}

function cmdEnrich(state) {
  // v0.2.2: Enrichment pipeline with new tools
  console.log(C.bold(C.blue('\n[ENRICH] Running enrichment pipeline...\n')));
  const tools = [
    { name: 'forum-integration', script: 'tools/ci/forum-integration.js', label: 'Forum threads' },
    { name: 'johan-ticket-importer', script: 'tools/ci/johan-ticket-importer.js', label: 'Johan issues' },
    { name: 'intelligent-variant-finder', script: 'tools/ci/intelligent-variant-finder.js', label: 'Variant detection' },
    { name: 'bidirectional-enricher', script: 'tools/ci/bidirectional-enricher.js', label: 'Master+stable enrichment' },
    { name: 'mfs-db-enricher', script: 'tools/ci/mfs-db-enricher.js', label: 'MFS DB enrichment' },
  ];
  const results = [];
  for (const t of tools) {
    const start = Date.now();
    try {
      const args = (t.args || []).join(' ');
      const cmd = `node ${t.script} ${args}`.trim();
      const output = execSync(cmd, {
        cwd: MASTER_DIR, encoding: 'utf8', timeout: 120000,
        env: { ...process.env, PATH: process.env.PATH },
      });
      const ms = Date.now() - start;
      console.log(C.green(`  ✓ ${t.label}: ${ms}ms`));
      results.push({ name: t.name, ok: true, ms });
      state.metrics.enrichmentRuns = (state.metrics.enrichmentRuns || 0) + 1;
    } catch (e) {
      const ms = Date.now() - start;
      console.log(C.yellow(`  ! ${t.label}: ${ms}ms (${e.message.substring(0, 80)})`));
      results.push({ name: t.name, ok: false, ms, err: e.message.substring(0, 200) });
      state.metrics.enrichmentErrors = (state.metrics.enrichmentErrors || 0) + 1;
    }
  }
  state.metrics.lastEnrichment = new Date().toISOString();
  state.last_enrichment_update = new Date().toISOString();
  saveState(state);
  console.log(C.gray(`\n[ENRICH] Done: ${results.filter(r => r.ok).length}/${results.length} tools ran`));
}

function cmdAll(state) {
  cmdDryRun(state);
  cmdEnrich(state);
  cmdUseResolver(state);
  cmdMetrics(state);
}

// CLI
function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || '--dry-run';
  let state = loadState();

  printBanner(state);

  switch (cmd) {
    case '--dry-run': cmdDryRun(state); break;
    case '--enrich': cmdEnrich(state); break;
    case '--metrics': cmdMetrics(state); break;
    case '--use-resolver': cmdUseResolver(state); break;
    case '--all': cmdAll(state); break;
    case '--status':
      console.log(JSON.stringify(state, null, 2));
      break;
    case '--help':
    case '-h':
      console.log(`
Usage: node tools/shadow-mode/shadow-mode-v2.js [command]

Commands:
  --dry-run         Pull from local sources, generate fix proposals (no changes)
  --use-resolver    Invoke the production diagnostic-auto-resolver.js
  --metrics         Show metrics from state.json
  --all             Run all 3 phases
  --status          Show full state.json
  --help            Show this help

Improvements over v0.1.0:
  - Uses .github/state/*.json (production CI telemetry) instead of re-implementing
  - Invokes the existing diagnostic-auto-resolver.js (production ticket ingestion)
  - Adds metrics tracking (runs, tickets, bugs, PRs, time saved)
  - Pulls from 23 docs/ files automatically
  - Cross-references fingerprints canonical DB
  - Single unified state.json
  - Cron-compatible (auto-runs every 6h)

App cible: BOTH master + stable (bug fixes both, features master only)
Source: Mavis investigation 2026-07-10 v2.0 (rewritten)
`);
      break;
    default:
      console.error(C.red(`Unknown command: ${cmd}`));
      process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, loadState, saveState, readCiState };
