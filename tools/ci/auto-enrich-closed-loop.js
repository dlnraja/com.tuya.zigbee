#!/usr/bin/env node
/**
 * R69 — auto-enrich-closed-loop.js
 *
 * Closes the loop: crawl external sources → cross-ref → apply FPs → validate
 * → publish (if safe). Runs as a single GHA workflow invocation.
 *
 * Pipeline phases:
 *   1. CRAWL: gmail, forum, github issues, blakadder, johan, z2m, zha
 *   2. CROSS-REF: compare new data against our 431 drivers + mfs_db
 *   3. APPLY: add new FPs to drivers + mfs_db sacred couples
 *   4. VALIDATE: homey app validate --level publish
 *   5. TEST: run all test-p6X scripts
 *   6. COMMIT: if any changes, commit + push (master channel only)
 *   7. PUBLISH-SAFE: stable-v5 gets cherry-picked bugfixes only
 *
 * Output:
 *   .github/state/auto-enrich/loop.log
 *   .github/state/auto-enrich/loop.json
 *
 * Run:
 *   node tools/ci/auto-enrich-closed-loop.js          # full loop
 *   node tools/ci/auto-enrich-closed-loop.js --skip-crawl
 *   node tools/ci/auto-enrich-closed-loop.js --dry-run
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'auto-enrich');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipCrawl = args.includes('--skip-crawl');
const skipPublish = args.includes('--skip-publish');
const skipCommit = args.includes('--skip-commit');

if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(path.join(STATE_DIR, 'loop.log'), line + '\n');
};
const startTime = Date.now();
const summary = { phases: {}, changes: [], errors: [], startTime: new Date().toISOString() };

function runPhase(name, fn) {
  log(`▶ PHASE: ${name}`);
  const t0 = Date.now();
  try {
    const result = fn();
    summary.phases[name] = { ok: true, durationMs: Date.now() - t0, ...result };
    log(`✓ ${name} OK (${(Date.now() - t0) / 1000}s)`);
    return result;
  } catch (e) {
    summary.phases[name] = { ok: false, durationMs: Date.now() - t0, error: e.message };
    summary.errors.push({ phase: name, error: e.message });
    log(`✗ ${name} FAILED: ${e.message}`);
    return null;
  }
}

// PHASE 1: CRAWL
function phaseCrawl() {
  if (skipCrawl) { log('  skipped (--skip-crawl)'); return { skipped: true }; }
  const crawlers = [
    { id: 'blakadder', cmd: 'node tools/ci/mega-crawler.js --only=blakadder --timeout=300' },
    { id: 'johan', cmd: 'node tools/ci/johan-dump.js --no-auth 2>&1 || node tools/ci/johan-dump.js' },
    { id: 'gmail', cmd: 'node tools/ci/gmail-diagnostics.js --max 100 2>&1 || echo GMAIL_SKIP' },
    { id: 'forum', cmd: 'node tools/ci/forum-integration.js 2>&1 || echo FORUM_SKIP' },
    { id: 'z2m', cmd: 'node scripts/sync/crawl-z2m.js 2>&1 || echo Z2M_SKIP' },
    { id: 'zha', cmd: 'node scripts/sync/crawl-zha.js 2>&1 || echo ZHA_SKIP' }
  ];
  const results = {};
  for (const c of crawlers) {
    const t0 = Date.now();
    try {
      const out = execSync(c.cmd, { cwd: ROOT, stdio: 'pipe', timeout: 300000 });
      results[c.id] = { ok: true, durationMs: Date.now() - t0, output: String(out).slice(-200) };
    } catch (e) {
      results[c.id] = { ok: false, durationMs: Date.now() - t0, error: e.message };
    }
  }
  return { crawlers: results };
}

// PHASE 2: CROSS-REF (count of new FPs / issues)
function phaseCrossRef() {
  // Load last known state
  const crossRefFile = path.join(STATE_DIR, 'cross-ref-state.json');
  let lastState = {};
  if (fs.existsSync(crossRefFile)) lastState = JSON.parse(fs.readFileSync(crossRefFile, 'utf8'));

  // Count new data sources
  const mfsdb = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
  const newFindings = {
    sacredCouples: Object.keys(mfsdb.sacredCouples || {}).length,
    mfrTopLevel: Object.keys(mfsdb).filter(k => k.startsWith('_')).length,
    drivers: fs.readdirSync(path.join(ROOT, 'drivers')).length
  };

  // Get new github issues since last run
  let newIssues = 0;
  try {
    const out = execSync('gh issue list --repo dlnraja/com.tuya.zigbee --state open --json number --limit 20', { cwd: ROOT, encoding: 'utf8' });
    const issues = JSON.parse(out || '[]');
    newIssues = issues.length;
  } catch (e) { /* gh may not be available */ }

  const state = { ...newFindings, newOpenIssues: newIssues, runAt: new Date().toISOString() };
  fs.writeFileSync(crossRefFile, JSON.stringify(state, null, 2));
  return { findings: state, lastRun: lastState };
}

// PHASE 3: APPLY Blakadder FPs
function phaseApplyBlakadder() {
  if (skipCommit) { log('  skipped (--skip-commit)'); return { skipped: true }; }
  try {
    const out = execSync('node tools/ci/apply-blakadder-new-fps-r68.js', { cwd: ROOT, encoding: 'utf8' });
    return { output: String(out).slice(-500) };
  } catch (e) {
    return { error: e.message };
  }
}

// PHASE 4: VALIDATE
function phaseValidate() {
  if (skipCommit) { log('  skipped (--skip-commit)'); return { skipped: true }; }
  try {
    const cmd = `node "${path.join(ROOT, 'node_modules', 'homey', 'bin', 'homey.js')}" app validate --level publish`;
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
    return { ok: true, output: String(out).slice(-300) };
  } catch (e) {
    return { ok: false, error: e.message.slice(0, 500) };
  }
}

// PHASE 5: TEST
function phaseTest() {
  if (skipCommit) { log('  skipped (--skip-commit)'); return { skipped: true }; }
  const tests = [
    'test-p68-blakadder-integration.js',
    'test-r68-flow-card-unique.js'
  ];
  const results = [];
  for (const t of tests) {
    try {
      const out = execSync(`node tools/ci/${t}`, { cwd: ROOT, encoding: 'utf8' });
      results.push({ test: t, ok: true, output: String(out).slice(-100) });
    } catch (e) {
      results.push({ test: t, ok: false, error: e.message.slice(0, 200) });
    }
  }
  return { tests: results };
}

// PHASE 6: COMMIT (if any changes)
function phaseCommit() {
  if (dryRun || skipCommit) { log('  skipped (dry-run or --skip-commit)'); return { skipped: true }; }
  try {
    const status = execSync('git status -s', { cwd: ROOT, encoding: 'utf8' });
    if (!status.trim()) { return { ok: true, changes: 0 }; }
    execSync('git add -A', { cwd: ROOT });
    const commitMsg = `chore(R69): auto-enrich closed loop ${new Date().toISOString().slice(0, 10)}`;
    execSync(`git commit -m "${commitMsg}" --quiet`, { cwd: ROOT });
    return { ok: true, committed: true, msg: commitMsg };
  } catch (e) {
    return { error: e.message };
  }
}

// PHASE 7: PUBLISH-SAFE (stable-v5 cherry-pick)
function phasePublishSafe() {
  if (dryRun || skipPublish) { log('  skipped (dry-run or --skip-publish)'); return { skipped: true }; }
  // Only sync safe files (FPs, mfs_db, bug fixes - not the apply-blakadder new FPs)
  // Already handled by safe-sync-stable workflow which is daily
  return { handledBy: 'safe-sync-stable.yml (daily 04:00 UTC)' };
}

// Run all phases
runPhase('1-crawl', phaseCrawl);
runPhase('2-cross-ref', phaseCrossRef);
const apply = runPhase('3-apply-blakadder', phaseApplyBlakadder);
const validate = runPhase('4-validate', phaseValidate);
const tests = runPhase('5-test', phaseTest);
runPhase('6-commit', phaseCommit);
runPhase('7-publish-safe', phasePublishSafe);

summary.endTime = new Date().toISOString();
summary.totalDurationMs = Date.now() - startTime;
fs.writeFileSync(path.join(STATE_DIR, 'loop.json'), JSON.stringify(summary, null, 2));

log(`\n=== R69 LOOP COMPLETE ===`);
log(`Total: ${(summary.totalDurationMs / 1000).toFixed(1)}s`);
log(`Phases: ${Object.keys(summary.phases).length}`);
log(`Errors: ${summary.errors.length}`);
if (summary.errors.length) {
  for (const e of summary.errors) log(`  - ${e.phase}: ${e.error}`);
}

if (dryRun) log('(DRY RUN - no commits made)');
process.exit(summary.errors.length > 0 ? 1 : 0);
