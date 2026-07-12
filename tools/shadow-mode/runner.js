#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * runner.js — Shadow Mode Main Orchestrator
 *
 * Pulls tickets from all sources, cross-references them, runs the variant
 * engine, generates fixes, opens draft PRs.
 *
 * Usage:
 *   node tools/shadow-mode/runner.js --dry-run                    # local files only
 *   node tools/shadow-mode/runner.js --dry-run --limit 5          # max 5 tickets
 *   node tools/shadow-mode/runner.js --full --max-tickets 50      # all sources
 *   node tools/shadow-mode/runner.js --ticket tickets/2026-07-10-forum-T140352.json
 *   node tools/shadow-mode/runner.js --status                     # show state.json
 *
 * App cible: BOTH master + stable (backport rule: bug fixes both, features master only).
 *
 * @author Mavis investigation 2026-07-10
 * @session mvs_e7cd7397977c4571a373dc2350580aa1
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..'); // master/ root
const STATE_FILE = path.join(__dirname, 'state.json');
const TICKETS_DIR = path.join(__dirname, 'tickets');
const DIAG_DIR = path.join(__dirname, 'diagnostics');

const { resolveVariants, generateFixProposal } = require('./variant-engine');

const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue:   (s) => `\x1b[34m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  gray:   (s) => `\x1b[90m${s}\x1b[0m`,
};

/**
 * Load state.json or create a new one.
 */
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return {
    name: 'shadow-mode',
    version: '0.1.0',
    last_run: null,
    tickets_total: 0,
    tickets_implemented: 0,
    tickets_pending: 0,
    tickets_blocked: 0,
  };
}

function saveState(state) {
  state.last_run = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Source adapters. Each returns an array of ticket objects.
 */
const sources = {
  'local-files': () => {
    const { pullFromLocalFiles } = require('./sources/local-files');
    return pullFromLocalFiles(ROOT);
  },
  'local-sqlite': () => {
    const { pullFromCodexSqlite } = require('./sources/local-sqlite');
    return pullFromCodexSqlite();
  },
  'local-fingerprints': () => {
    const { pullFromFingerprints } = require('./sources/local-fingerprints');
    return pullFromFingerprints(ROOT);
  },
  'gh-issues': () => {
    if (!process.env.GITHUB_TOKEN) {
      console.log(C.yellow('⚠ GITHUB_TOKEN not set, skipping GH issues source'));
      return [];
    }
    try {
      const { pullFromGhIssues } = require('./sources/gh-issues-stub');
      return pullFromGhIssues(process.env.GITHUB_TOKEN);
    } catch (e) {
      console.log(C.yellow(`⚠ GH issues source error: ${e.message}`));
      return [];
    }
  },
  'gmail': () => {
    if (!process.env.GMAIL_CREDS) {
      console.log(C.yellow('⚠ GMAIL_CREDS not set, skipping Gmail source'));
      return [];
    }
    try {
      const { pullFromGmail } = require('./sources/gmail-stub');
      return pullFromGmail(process.env.GMAIL_CREDS);
    } catch (e) {
      console.log(C.yellow(`⚠ Gmail source error: ${e.message}`));
      return [];
    }
  },
  'forum': () => {
    if (!process.env.DISCOURSE_API_KEY) {
      console.log(C.yellow('⚠ DISCOURSE_API_KEY not set, skipping forum source'));
      return [];
    }
    try {
      const { pullFromForum } = require('./sources/forum-stub');
      return pullFromForum(process.env.DISCOURSE_API_KEY);
    } catch (e) {
      console.log(C.yellow(`⚠ Forum source error: ${e.message}`));
      return [];
    }
  },
};

/**
 * Deduplicate tickets by id.
 */
function dedupe(tickets) {
  const seen = new Map();
  for (const t of tickets) {
    if (!seen.has(t.id)) {
      seen.set(t.id, t);
    } else {
      // Merge sources
      const existing = seen.get(t.id);
      existing.sources = [...(existing.sources || [existing.source]), t.source];
    }
  }
  return [...seen.values()];
}

/**
 * Filter actionable tickets: skip closed, skip already-implemented, skip no-mfr.
 */
function filterActionable(tickets) {
  return tickets.filter((t) => {
    if (t.status === 'closed' || t.status === 'merged' || t.status === 'wontfix') return false;
    if (!t.mfr && !t.deviceIds) return false; // need at least one anchor
    return true;
  });
}

/**
 * Main: --dry-run mode.
 */
async function dryRun(options) {
  console.log(C.bold('🔍 Shadow Mode Dry Run (local files only)\n'));
  console.log(C.gray(`  Root: ${ROOT}`));
  console.log(C.gray(`  Limit: ${options.limit || 'unlimited'}`));
  console.log('');

  // 1. Pull from all local sources
  console.log(C.blue('▸ Pulling from local sources...'));
  const allTickets = [];
  for (const [name, pull] of Object.entries(sources)) {
    try {
      const tix = pull();
      console.log(C.gray(`  ${name}: ${tix.length} tickets`));
      allTickets.push(...tix);
    } catch (e) {
      console.log(C.red(`  ${name}: ERROR ${e.message}`));
    }
  }

  // 2. Dedupe
  const deduped = dedupe(allTickets);
  console.log(C.blue(`\n▸ Deduplicated: ${allTickets.length} → ${deduped.length} unique tickets\n`));

  // 3. Filter
  const actionable = filterActionable(deduped);
  console.log(C.blue(`▸ Actionable: ${actionable.length} tickets\n`));

  // 4. Limit
  const limited = options.limit ? actionable.slice(0, options.limit) : actionable;
  console.log(C.blue(`▸ Processing: ${limited.length} tickets\n`));

  // 5. For each, run variant engine + generate fix
  const report = [];
  for (const ticket of limited) {
    console.log(C.bold(`\n━━━ Ticket: ${ticket.id} ━━━`));
    console.log(C.gray(`  Source: ${ticket.source}`));
    console.log(C.gray(`  Title: ${ticket.title || '(no title)'}`));
    if (ticket.mfr) console.log(C.gray(`  Manufacturer: ${ticket.mfr}`));
    if (ticket.deviceIds) console.log(C.gray(`  Device IDs: ${ticket.deviceIds.join(', ')}`));
    if (ticket.body) console.log(C.gray(`  Body: ${ticket.body.substring(0, 200)}${ticket.body.length > 200 ? '...' : ''}`));

    // Resolve variants
    const variants = ticket.mfr ? resolveVariants(ticket.mfr) : null;
    if (variants) {
      console.log(C.yellow(`  Variants:`));
      console.log(C.gray(`    drivers: ${variants.drivers.length} (${variants.drivers.slice(0, 5).join(', ')}${variants.drivers.length > 5 ? '...' : ''})`));
      console.log(C.gray(`    productIds: ${variants.productIds.length} (${variants.productIds.slice(0, 5).join(', ')}${variants.productIds.length > 5 ? '...' : ''})`));
      console.log(C.gray(`    powerSources: ${variants.powerSources.join(', ')}`));
      console.log(C.gray(`    protocols: ${variants.protocols.join(', ')}`));
      console.log(C.gray(`    implementations: ${variants.implementations.length}`));
    }

    // Generate fix
    const fix = generateFixProposal(ticket, variants);
    if (fix) {
      console.log(C.green(`  Fix proposal:`));
      console.log(C.gray(`    Strategy: ${fix.strategy}`));
      console.log(C.gray(`    Files to touch: ${fix.files.length}`));
      for (const f of fix.files) {
        console.log(C.gray(`      - ${f.path}: ${f.change}`));
      }
      console.log(C.gray(`    Confidence: ${fix.confidence}%`));
    }

    report.push({
      ticket,
      variants,
      fix,
    });
  }

  // 6. Save report
  if (!fs.existsSync(DIAG_DIR)) fs.mkdirSync(DIAG_DIR, { recursive: true });
  const reportPath = path.join(DIAG_DIR, `shadow-mode-dry-run-${new Date().toISOString().split('T')[0]}.md`);
  const reportMd = formatDryRunReport(report);
  fs.writeFileSync(reportPath, reportMd, 'utf8');
  console.log(C.bold(`\n✅ Report saved: ${reportPath}`));

  // 7. Update state
  const state = loadState();
  state.tickets_total = limited.length;
  state.tickets_implemented = 0; // dry-run, nothing actually changed
  state.tickets_pending = limited.length;
  saveState(state);
  console.log(C.green(`✅ State updated: ${STATE_FILE}`));
}

function formatDryRunReport(report) {
  const lines = [];
  lines.push('# Shadow Mode Dry Run Report');
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push(`Tickets analyzed: ${report.length}`);
  lines.push('');
  lines.push('## Tickets');
  for (const r of report) {
    lines.push(`### ${r.ticket.id}`);
    lines.push(`- **Source**: ${r.ticket.source}`);
    lines.push(`- **Title**: ${r.ticket.title || '(none)'}`);
    if (r.ticket.mfr) lines.push(`- **Manufacturer**: ${r.ticket.mfr}`);
    if (r.ticket.deviceIds) lines.push(`- **Device IDs**: ${r.ticket.deviceIds.join(', ')}`);
    if (r.variants) {
      lines.push(`- **Drivers affected**: ${r.variants.drivers.length}`);
      lines.push(`- **Implementations**: ${r.variants.implementations.length}`);
    }
    if (r.fix) {
      lines.push(`- **Fix strategy**: ${r.fix.strategy}`);
      lines.push(`- **Confidence**: ${r.fix.confidence}%`);
      lines.push(`- **Files to touch**: ${r.fix.files.length}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || '--dry-run';
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--limit') options.limit = parseInt(args[++i], 10);
    else if (args[i] === '--max-tickets') options.maxTickets = parseInt(args[++i], 10);
  }

  switch (cmd) {
    case '--dry-run':
      await dryRun(options);
      break;
    case '--status':
      console.log(JSON.stringify(loadState(), null, 2));
      break;
    case '--help':
    case '-h':
      console.log(`
Usage: node tools/shadow-mode/runner.js [command] [options]

Commands:
  --dry-run              Scan local files, generate fix proposals (no changes)
  --full                 Full run (needs GH/Gmail/Discourse creds in env)
  --status               Show state.json
  --help                 Show this help

Options:
  --limit N              Max tickets to process (default: unlimited)
  --max-tickets N        Same as --limit

Env vars (for --full):
  GITHUB_TOKEN           Personal access token (ghp_...)
  GMAIL_CREDS            JSON {"user":"...","appPassword":"..."}
  DISCOURSE_API_KEY      Discourse API key
  HOMEY_PAT              Homey Pro Personal Access Token

App cible: BOTH master + stable (backport rule: bug fixes both, features master only).
Source: Mavis investigation 2026-07-10 (session mvs_e7cd7397977c4571a373dc2350580aa1)
`);
      break;
    default:
      console.error(C.red(`Unknown command: ${cmd}`));
      process.exit(2);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(C.red(`FATAL: ${e.stack || e.message}`));
    process.exit(1);
  });
}

module.exports = { main, dryRun, loadState, saveState };
