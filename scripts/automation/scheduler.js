#!/usr/bin/env node
'use strict';

/**
 * scheduler.js - Cron-like Refresh Scheduler v1.0.0
 * ==========================================================================
 * Orchestrates the full refresh pipeline: changelog detection, DB enrichment,
 * driver updates, and URL cache warming. Defines per-resource refresh intervals,
 * tracks last refresh timestamps, and can be invoked from GitHub Actions or
 * locally.
 *
 * Refresh Intervals:
 *   - Z2M tuya.ts / index.ts:     every 6 hours
 *   - ZHA __init__.py / ts0601.py: every 12 hours
 *   - deCONZ devices.json:         daily (24h)
 *   - Phoscon compatible:          weekly (7d)
 *   - Blakadder devices:           weekly (7d)
 *
 * Modes:
 *   --check         Check which resources need refresh (no fetching)
 *   --refresh       Run full refresh pipeline
 *   --refresh-only=<source>  Refresh only one source group
 *   --enrich        Run enrichment only (skip changelog detection)
 *   --update-drivers  Run driver updates only
 *   --force         Force refresh all resources regardless of TTL
 *   --status        Show scheduler status and last refresh times
 *   --reset         Reset all refresh timestamps
 *   --dry-run       Preview without making changes
 *   --verbose       Detailed output
 *
 * Usage:
 *   node scripts/automation/scheduler.js --status
 *   node scripts/automation/scheduler.js --check
 *   node scripts/automation/scheduler.js --refresh
 *   node scripts/automation/scheduler.js --refresh --dry-run
 *   node scripts/automation/scheduler.js --refresh-only=z2m
 *   node scripts/automation/scheduler.js --enrich
 *   node scripts/automation/scheduler.js --update-drivers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '../..');
const SCHEDULER_STATE = path.join(REPO_ROOT, '.cache', 'scheduler-state.json');
const SCRIPTS_DIR = path.join(__dirname);

// ── Scanner Cache Integration ────────────────────────────────────────────────
let ScannerCache, getStaleScanners, getFreshScanners;
try {
  const scannerCache = require('../scanners/scanner-cache');
  ScannerCache = scannerCache.ScannerCache;
  getStaleScanners = scannerCache.getStaleScanners;
  getFreshScanners = scannerCache.getFreshScanners;
} catch { /* scanner-cache not available */ }

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};
const log = (c, ...a) => console.log(`${c}[SCHEDULER]${C.X} ${a.join(' ')}`);

// ── CLI arguments ─────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.some(a => a === `--${name}`);
const OPT = (name) => {
  const a = args_find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};

function args_find(fn) {
  return ARGS.find(fn);
}

const CHECK_ONLY = FLAG('check');
const DO_REFRESH = FLAG('refresh');
const REFRESH_ONLY = OPT('refresh-only');
const DO_ENRICH = FLAG('enrich');
const DO_UPDATE_DRIVERS = FLAG('update-drivers');
const DO_AUTO_FIX = FLAG('auto-fix');
const FORCE = FLAG('force');
const STATUS = FLAG('status');
const RESET = FLAG('reset');
const DRY_RUN = FLAG('dry-run');
const VERBOSE = FLAG('verbose');

// ═══════════════════════════════════════════════════════════════════════════════
// REFRESH INTERVAL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const RESOURCE_GROUPS = {
  z2m: {
    name: 'Zigbee2MQTT',
    interval: 6 * 60 * 60 * 1000,  // 6 hours
    intervalHuman: '6h',
    sources: [
      { id: 'z2m-tuya', name: 'Z2M tuya.ts' },
      { id: 'z2m-index', name: 'Z2M index.ts' },
    ],
  },
  zha: {
    name: 'ZHA Quirks',
    interval: 12 * 60 * 60 * 1000, // 12 hours
    intervalHuman: '12h',
    sources: [
      { id: 'zha-init', name: 'ZHA __init__.py' },
      { id: 'zha-ts0601', name: 'ZHA ts0601.py' },
    ],
  },
  deconz: {
    name: 'deCONZ',
    interval: 24 * 60 * 60 * 1000, // 24 hours (daily)
    intervalHuman: '24h',
    sources: [
      { id: 'deconz-devices', name: 'deCONZ devices.json' },
    ],
  },
  phoscon: {
    name: 'Phoscon',
    interval: 7 * 24 * 60 * 60 * 1000, // 7 days (weekly)
    intervalHuman: '7d',
    sources: [
      { id: 'phoscon-compatible', name: 'Phoscon Compatible' },
    ],
  },
  blakadder: {
    name: 'Blakadder',
    interval: 7 * 24 * 60 * 60 * 1000, // 7 days (weekly)
    intervalHuman: '7d',
    sources: [
      { id: 'blakadder-devices', name: 'Blakadder DB' },
    ],
  },
  scanners: {
    name: 'External Scanners',
    interval: 12 * 60 * 60 * 1000,  // 12 hours (default, per-scanner TTLs override)
    intervalHuman: '12h',
    sources: [
      { id: 'scanner-tinytuya', name: 'TinyTuya (24h TTL)' },
      { id: 'scanner-tuya-local', name: 'Tuya-Local (24h TTL)' },
      { id: 'scanner-hubitat', name: 'Hubitat (12h TTL)' },
      { id: 'scanner-smartthings', name: 'SmartThings (12h TTL)' },
      { id: 'scanner-openhab', name: 'openHAB (48h TTL)' },
      { id: 'scanner-domoticz', name: 'Domoticz (48h TTL)' },
      { id: 'scanner-xiaomi-miot', name: 'Xiaomi MIoT (24h TTL)' },
      { id: 'scanner-csa-iot', name: 'CSA-IoT (7d TTL)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function loadState() {
  try {
    if (fs.existsSync(SCHEDULER_STATE)) {
      return JSON.parse(fs.readFileSync(SCHEDULER_STATE));
    }
  } catch { /* ignore */ }
  return {
    lastRefresh: {},   // groupId -> ISO timestamp
    lastCheck: null,
    lastEnrich: null,
    lastUpdate: null,
    lastAutoFix: null,
    autoFixStats: {
      totalRuns: 0,
      totalFixed: 0,
      lastRun: null,
      patterns: {
        zbProductId: 0,
        bareSetInterval: 0,
        missingDestroyGuard: 0,
        consoleLog: 0,
        emptyCatch: 0,
      },
    },
    history: [],       // last N refresh events
  };
}

function saveState(state) {
  const dir = path.dirname(SCHEDULER_STATE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SCHEDULER_STATE, JSON.stringify(state, null, 2));
}

function addHistoryEntry(state, event) {
  state.history.unshift({
    ...event,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 50 entries
  if (state.history.length > 50) state.history = state.history.slice(0, 50);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STALENESS CHECK
// ═══════════════════════════════════════════════════════════════════════════════

function isStale(groupId, state) {
  const lastRefresh = state.lastRefresh[groupId];
  if (!lastRefresh) return true; // never refreshed
  const group = RESOURCE_GROUPS[groupId];
  const age = Date.now() - new Date(lastRefresh).getTime();
  return age > group.interval;
}

function getTimeUntilStale(groupId, state) {
  const lastRefresh = state.lastRefresh[groupId];
  if (!lastRefresh) return -1; // already stale
  const group = RESOURCE_GROUPS[groupId];
  const age = Date.now() - new Date(lastRefresh).getTime();
  return Math.max(0, group.interval - age);
}

function formatMs(ms) {
  if (ms < 0) return 'NEVER';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60 * 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60 * 60 * 1000) return `${(ms / 60000).toFixed(1)}min`;
  if (ms < 24 * 60 * 60 * 1000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCRIPT RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

function runScript(scriptName, extraArgs = '') {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const args = extraArgs + (DRY_RUN ? ' --dry-run' : '') + (VERBOSE ? ' --verbose' : '');
  const cmd = `node "${scriptPath}" ${args}`.trim();

  log(C.D, `Running: ${cmd}`);

  try {
    const output = execSync(cmd, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 300000, // 5 minute timeout per script
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (VERBOSE && output) {
      // Print last 20 lines of output
      const lines = output.trim().split('\n');
      for (const line of lines.slice(-20)) {
        console.log(`  ${C.D}|${C.X} ${line}`);
      }
    }
    return { success: true, output };
  } catch (err) {
    log(C.R, `Script failed: ${scriptName} - ${err.message}`);
    if (err.stdout) {
      const output = err.stdout.toString().trim();
      const lines = output.split('\n').slice(-10);
      for (const line of lines) {
        console.log(`  ${C.R}|${C.X} ${line}`);
      }
    }
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

function showStatus() {
  const state = loadState();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  SCHEDULER STATUS`);
  console.log(`${'='.repeat(70)}\n`);

  console.log('  Resource Refresh Status:');
  console.log('  ' + '-'.repeat(66));

  for (const [groupId, group] of Object.entries(RESOURCE_GROUPS)) {
    const stale = isStale(groupId, state);
    const statusIcon = stale ? `${C.Y}STALE` : `${C.G}FRESH`;
    const lastRefresh = state.lastRefresh[groupId] || 'NEVER';
    const remaining = getTimeUntilStale(groupId, state);

    console.log(`  ${statusIcon}${C.X}  ${group.name.padEnd(20)} (every ${group.intervalHuman})`);
    console.log(`       Last: ${lastRefresh}  |  Next in: ${formatMs(remaining)}`);

    for (const src of group.sources) {
      console.log(`       ${C.D}  - ${src.name}${C.X}`);
    }
    console.log('');
  }

  console.log('  Pipeline Status:');
  console.log('  ' + '-'.repeat(66));
  console.log(`  Last check:     ${state.lastCheck || 'NEVER'}`);
  console.log(`  Last enrich:    ${state.lastEnrich || 'NEVER'}`);
  console.log(`  Last update:    ${state.lastUpdate || 'NEVER'}`);
  console.log(`  Last auto-fix:  ${state.lastAutoFix || 'NEVER'}`);

  if (state.autoFixStats && state.autoFixStats.totalRuns > 0) {
    console.log('  Auto-Fix Stats:');
    console.log(`    Total runs:     ${state.autoFixStats.totalRuns}`);
    console.log(`    Total fixes:    ${state.autoFixStats.totalFixed}`);
    const p = state.autoFixStats.patterns;
    if (p) {
      console.log(`    zb_product_id:  ${p.zbProductId || 0}`);
      console.log(`    bareInterval:   ${p.bareSetInterval || 0}`);
      console.log(`    destroyGuard:   ${p.missingDestroyGuard || 0}`);
      console.log(`    consoleLog:     ${p.consoleLog || 0}`);
      console.log(`    emptyCatch:     ${p.emptyCatch || 0}`);
    }
  }
  console.log('');

  if (state.history.length > 0) {
    console.log('  Recent History:');
    console.log('  ' + '-'.repeat(66));
    for (const entry of state.history.slice(0, 5)) {
      const result = entry.success ? C.G + 'OK' : C.R + 'FAIL';
      console.log(`  ${result}${C.X} ${entry.timestamp} - ${entry.action}`);
    }
  }

  // Show scanner cache status
  if (getStaleScanners && getFreshScanners) {
    console.log('  Scanner Cache Status:');
    console.log('  ' + '-'.repeat(66));
    const fresh = getFreshScanners();
    const stale = getStaleScanners();
    if (fresh.length > 0) {
      console.log(`  ${C.G}FRESH${C.X}: ${fresh.join(', ')}`);
    }
    if (stale.length > 0) {
      console.log(`  ${C.Y}STALE${C.X}: ${stale.join(', ')}`);
    }
    console.log('');
  }

  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK MODE
// ═══════════════════════════════════════════════════════════════════════════════

function checkNeedsRefresh() {
  const state = loadState();
  state.lastCheck = new Date().toISOString();
  saveState(state);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  REFRESH CHECK`);
  console.log(`${'='.repeat(70)}\n`);

  const needsRefresh = [];
  const upToDate = [];

  for (const [groupId, group] of Object.entries(RESOURCE_GROUPS)) {
    if (REFRESH_ONLY && groupId !== REFRESH_ONLY) continue;

    const stale = isStale(groupId, state);
    const remaining = getTimeUntilStale(groupId, state);

    if (stale || FORCE) {
      needsRefresh.push(groupId);
      log(C.Y, `${group.name} NEEDS REFRESH (interval: ${group.intervalHuman}, last: ${state.lastRefresh[groupId] || 'NEVER'})`);
    } else {
      upToDate.push(groupId);
      log(C.G, `${group.name} is up to date (next refresh in ${formatMs(remaining)})`);
    }
  }

  console.log(`\n  Need refresh: ${needsRefresh.length}`);
  console.log(`  Up to date:   ${upToDate.length}`);

  // Output for CI
  if (process.env.GITHUB_OUTPUT) {
    const output = `needs_refresh=${needsRefresh.length > 0}\nrefresh_groups=${needsRefresh.join(',')}`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
  }

  return needsRefresh;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL REFRESH PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

async function refreshPipeline() {
  const state = loadState();
  const startTime = Date.now();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  REFRESH PIPELINE ${DRY_RUN ? '(DRY RUN)' : ''} ${FORCE ? '(FORCED)' : ''}`);
  console.log(`${'='.repeat(70)}\n`);

  // Step 1: Check which groups need refresh
  const needsRefresh = [];
  for (const [groupId, group] of Object.entries(RESOURCE_GROUPS)) {
    if (REFRESH_ONLY && groupId !== REFRESH_ONLY) continue;
    if (FORCE || isStale(groupId, state)) {
      needsRefresh.push(groupId);
    }
  }

  if (needsRefresh.length === 0) {
    log(C.G, 'All resources are up to date. Nothing to refresh.');
    log(C.G, 'Use --force to force a refresh regardless of TTL.');
    return;
  }

  log(C.B, `${needsRefresh.length} resource group(s) need refresh: ${needsRefresh.join(', ')}`);

  // Step 2: Run changelog detection (which also fetches and caches data)
  log(C.B, '\n--- Step 1: Changelog Detection ---');
  const changelogResult = runScript('changelog-detector.js',
    needsRefresh.map(g => `--source=${g}`).join(' ')
  );

  if (!changelogResult.success) {
    log(C.R, 'Changelog detection failed. Continuing with enrichment...');
  }

  // Step 3: Run DB enrichment
  log(C.B, '\n--- Step 2: DB Enrichment ---');
  const enrichResult = runScript('auto-enrich-db.js');

  if (enrichResult.success) {
    state.lastEnrich = new Date().toISOString();
    addHistoryEntry(state, { action: 'enrich', success: true });
  } else {
    addHistoryEntry(state, { action: 'enrich', success: false });
  }

  // Step 4: Run driver updates
  log(C.B, '\n--- Step 3: Driver Updates ---');
  const updateResult = runScript('auto-update-drivers.js');

  if (updateResult.success) {
    state.lastUpdate = new Date().toISOString();
    addHistoryEntry(state, { action: 'update-drivers', success: true });
  } else {
    addHistoryEntry(state, { action: 'update-drivers', success: false });
  }

  // Step 5: Run auto-fix pipeline
  log(C.B, '\n--- Step 4: Auto-Fix Pipeline ---');
  const autoFixScripts = ['auto-fix-patterns.js', 'fix-console-log.js', 'fix-empty-catches.js'];
  let autoFixTotalFixed = 0;
  let autoFixSuccess = 0;

  for (const script of autoFixScripts) {
    const afResult = runScript(script, '--verbose');
    if (afResult.success) {
      autoFixSuccess++;
      const match = afResult.output ? afResult.output.match(/Total fixes:\s*(\d+)/i) : null;
      if (match) autoFixTotalFixed += parseInt(match[1], 10);
    }
  }

  state.lastAutoFix = new Date().toISOString();
  state.autoFixStats.totalRuns++;
  state.autoFixStats.totalFixed += autoFixTotalFixed;
  state.autoFixStats.lastRun = new Date().toISOString();
  addHistoryEntry(state, {
    action: 'auto-fix',
    success: autoFixSuccess === autoFixScripts.length,
    fixed: autoFixTotalFixed,
  });

  // Step 6: Run stale scanners (cache-aware)
  if (needsRefresh.includes('scanners') && getStaleScanners) {
    log(C.B, '\n--- Step 4: External Scanners (cache-aware) ---');
    const staleScanners = getStaleScanners();
    if (staleScanners.length > 0) {
      log(C.D, `Stale scanners: ${staleScanners.join(', ')}`);
      const scannerNames = {
        tinytuya: 'tinytuya-scanner.js',
        'tuya-local': 'tuya-local-scanner.js',
        hubitat: 'hubitat-scanner.js',
        smartthings: 'smartthings-scanner.js',
        openhab: 'openhab-scanner.js',
        domoticz: 'domoticz-scanner.js',
        'xiaomi-miot': 'xiaomi-miot-scanner.js',
        'csa-iot': 'csa-iot-scanner.js',
      };
      let scannerSuccess = 0;
      for (const scannerId of staleScanners) {
        const scriptName = scannerNames[scannerId];
        if (scriptName) {
          log(C.D, `  Running: ${scriptName}`);
          const result = runScript(scriptName);
          if (result.success) scannerSuccess++;
        }
      }
      addHistoryEntry(state, { action: 'scanners', success: scannerSuccess > 0, ran: staleScanners.length, ok: scannerSuccess });
    } else {
      log(C.G, 'All scanners are still fresh (cached).');
    }
  }

  // Update timestamps for refreshed groups
  const now = new Date().toISOString();
  for (const groupId of needsRefresh) {
    state.lastRefresh[groupId] = now;
  }

  // Record this run
  addHistoryEntry(state, {
    action: 'refresh-pipeline',
    success: true,
    groups: needsRefresh,
    duration: Date.now() - startTime,
  });

  saveState(state);

  // Final summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  PIPELINE COMPLETE (${elapsed}s)`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  Changelog: ${changelogResult.success ? C.G + 'OK' : C.R + 'FAIL'}${C.X}`);
  console.log(`  Enrich:    ${enrichResult.success ? C.G + 'OK' : C.R + 'FAIL'}${C.X}`);
  console.log(`  Update:    ${updateResult.success ? C.G + 'OK' : C.R + 'FAIL'}${C.X}`);
  console.log(`  Auto-Fix:  ${autoFixSuccess === autoFixScripts.length ? C.G + 'OK' : C.R + 'PARTIAL'}${C.X} (${autoFixTotalFixed} fixes)`);
  if (getFreshScanners) {
    const freshCount = getFreshScanners().length;
    console.log(`  Scanners:  ${C.G}${freshCount}/8 cached${C.X}`);
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENRICH-ONLY MODE
// ═══════════════════════════════════════════════════════════════════════════════

async function enrichOnly() {
  log(C.B, 'Running enrichment only...');
  const result = runScript('auto-enrich-db.js');
  const state = loadState();
  if (result.success) {
    state.lastEnrich = new Date().toISOString();
    addHistoryEntry(state, { action: 'enrich', success: true });
  } else {
    addHistoryEntry(state, { action: 'enrich', success: false });
  }
  saveState(state);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE-DRIVERS-ONLY MODE
// ═══════════════════════════════════════════════════════════════════════════════

async function updateDriversOnly() {
  log(C.B, 'Running driver updates only...');
  const result = runScript('auto-update-drivers.js');
  const state = loadState();
  if (result.success) {
    state.lastUpdate = new Date().toISOString();
    addHistoryEntry(state, { action: 'update-drivers', success: true });
  } else {
    addHistoryEntry(state, { action: 'update-drivers', success: false });
  }
  saveState(state);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-FIX PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

async function autoFixPipeline() {
  const startTime = Date.now();
  const state = loadState();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  AUTO-FIX PIPELINE ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(70)}\n`);

  const autoFixScripts = [
    { name: 'auto-fix-patterns.js', label: 'Architectural Violations' },
    { name: 'fix-console-log.js', label: 'Console Log Replacements' },
    { name: 'fix-empty-catches.js', label: 'Empty Catch Blocks' },
  ];

  let totalFixed = 0;
  const results = [];

  for (let i = 0; i < autoFixScripts.length; i++) {
    const script = autoFixScripts[i];
    log(C.B, `\n--- Auto-Fix ${i + 1}/${autoFixScripts.length}: ${script.label} ---`);

    const result = runScript(script.name, '--verbose');
    results.push({ script: script.name, success: result.success });

    if (result.success) {
      // Try to extract fix count from output
      const match = result.output ? result.output.match(/Total fixes:\s*(\d+)/i) : null;
      if (match) {
        totalFixed += parseInt(match[1], 10);
      }
    }
  }

  // Run pre-commit validation to confirm fixes
  log(C.B, '\n--- Auto-Fix Validation ---');
  const validateResult = runScript('../ci/pre-commit-checks.js', '--json');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const successCount = results.filter(r => r.success).length;

  // Update state
  state.lastAutoFix = new Date().toISOString();
  state.autoFixStats.totalRuns++;
  state.autoFixStats.totalFixed += totalFixed;
  state.autoFixStats.lastRun = new Date().toISOString();

  addHistoryEntry(state, {
    action: 'auto-fix',
    success: successCount === autoFixScripts.length,
    scripts: autoFixScripts.length,
    ok: successCount,
    fixed: totalFixed,
    duration: Date.now() - startTime,
  });

  saveState(state);

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  AUTO-FIX PIPELINE COMPLETE (${elapsed}s)`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  Scripts run:    ${autoFixScripts.length}`);
  console.log(`  Scripts passed: ${successCount}/${autoFixScripts.length}`);
  console.log(`  Total fixes:    ${C.G}${totalFixed}${C.X}`);
  console.log(`  Validation:     ${validateResult.success ? C.G + 'PASSED' : C.R + 'FAILED'}${C.X}`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

async function cli() {
  if (STATUS) {
    showStatus();
    return;
  }

  if (RESET) {
    const state = loadState();
    state.lastRefresh = {};
    state.lastCheck = null;
    state.lastEnrich = null;
    state.lastUpdate = null;
    state.history = [];
    saveState(state);
    log(C.Y, 'All scheduler state reset.');
    return;
  }

  if (CHECK_ONLY) {
    checkNeedsRefresh();
    return;
  }

  if (DO_ENRICH) {
    await enrichOnly();
    return;
  }

  if (DO_UPDATE_DRIVERS) {
    await updateDriversOnly();
    return;
  }

  if (DO_AUTO_FIX) {
    await autoFixPipeline();
    return;
  }

  if (DO_REFRESH || FORCE) {
    await refreshPipeline();
    return;
  }

  // Default: show status
  showStatus();
  console.log('Usage:');
  console.log('  node scheduler.js --status          Show refresh status');
  console.log('  node scheduler.js --check           Check which resources need refresh');
  console.log('  node scheduler.js --refresh         Run full refresh pipeline');
  console.log('  node scheduler.js --enrich          Run enrichment only');
  console.log('  node scheduler.js --update-drivers  Run driver updates only');
  console.log('  node scheduler.js --auto-fix        Run auto-fix pipeline');
  console.log('  node scheduler.js --force --refresh Force refresh all resources');
  console.log('  node scheduler.js --reset           Reset all timestamps');
}

// ── Export & run ──────────────────────────────────────────────────────────────
module.exports = {
  RESOURCE_GROUPS,
  isStale,
  getTimeUntilStale,
  loadState,
  saveState,
};

if (require.main === module) {
  cli().catch((err) => {
    console.error(`[SCHEDULER] Fatal: ${err.message}`);
    process.exit(1);
  });
}
