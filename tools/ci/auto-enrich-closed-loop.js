#!/usr/bin/env node
/**
 * R69 / P99 — auto-enrich-closed-loop.js
 *
 * Closes the loop: crawl → cross-ref → apply FPs → case-variants →
 * re-inject manual fixes → anti-bot gate → validate → commit.
 *
 * Run:
 *   node tools/ci/auto-enrich-closed-loop.js
 *   node tools/ci/auto-enrich-closed-loop.js --skip-crawl
 *   node tools/ci/auto-enrich-closed-loop.js --dry-run
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  fs.appendFileSync(path.join(STATE_DIR, 'loop.log'), `${line}\n`);
};
const startTime = Date.now();
const summary = {
  phases: {},
  changes: [],
  errors: [],
  startTime: new Date().toISOString(),
  caseInsensitive: true,
};

function runPhase(name, fn) {
  log(`▶ PHASE: ${name}`);
  const t0 = Date.now();
  try {
    const result = fn() || {};
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

function runNode(script, extraArgs = '') {
  const cmd = `node "${path.join(ROOT, script)}" ${extraArgs}`.trim();
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 300000, stdio: 'pipe' });
}

function phaseCrawl() {
  if (skipCrawl) { log('  skipped (--skip-crawl)'); return { skipped: true }; }
  const crawlers = [
    { id: 'blakadder', cmd: 'node tools/ci/mega-crawler.js --only=blakadder --timeout=300' },
    { id: 'johan', cmd: 'node tools/ci/johan-dump.js --no-auth 2>&1 || node tools/ci/johan-dump.js' },
    { id: 'gmail', cmd: 'node tools/ci/gmail-diagnostics.js --max 100 2>&1 || echo GMAIL_SKIP' },
    { id: 'forum', cmd: 'node tools/ci/forum-silent-multi-scan.js --max=40 2>&1 || echo FORUM_SKIP' },
    { id: 'z2m', cmd: 'node scripts/sync/crawl-z2m.js 2>&1 || echo Z2M_SKIP' },
    { id: 'zha', cmd: 'node scripts/sync/crawl-zha.js 2>&1 || echo ZHA_SKIP' },
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

function phaseCrossRef() {
  const crossRefFile = path.join(STATE_DIR, 'cross-ref-state.json');
  let lastState = {};
  if (fs.existsSync(crossRefFile)) lastState = JSON.parse(fs.readFileSync(crossRefFile, 'utf8'));

  const mfsdb = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
  const newFindings = {
    sacredCouples: Object.keys(mfsdb.sacredCouples || {}).length,
    mfrTopLevel: Object.keys(mfsdb).filter((k) => k.startsWith('_')).length,
    drivers: fs.readdirSync(path.join(ROOT, 'drivers')).length,
  };

  let newIssues = 0;
  try {
    const out = execSync('gh issue list --repo dlnraja/com.tuya.zigbee --state open --json number --limit 20', {
      cwd: ROOT,
      encoding: 'utf8',
    });
    newIssues = JSON.parse(out || '[]').length;
  } catch (e) { /* gh may not be available */ }

  const state = { ...newFindings, newOpenIssues: newIssues, runAt: new Date().toISOString() };
  fs.writeFileSync(crossRefFile, JSON.stringify(state, null, 2));
  return { findings: state, lastRun: lastState };
}

function phaseApplyBlakadder() {
  if (skipCommit) { log('  skipped (--skip-commit)'); return { skipped: true }; }
  try {
    const out = execSync('node tools/ci/apply-blakadder-new-fps-r68.js', { cwd: ROOT, encoding: 'utf8' });
    return { output: String(out).slice(-500) };
  } catch (e) {
    return { error: e.message };
  }
}

/** P114: forum routes + sacred lots + blakadder + collision dry gate */
function phaseMultiSourceEnrich() {
  if (skipCommit) { log('  skipped (--skip-commit)'); return { skipped: true }; }
  const args = ['--skip-scan'];
  if (!dryRun) args.push('--apply');
  try {
    const out = runNode('tools/ci/multi-source-enrich-orchestrator.js', args.join(' '));
    return { output: String(out).slice(-600), applied: !dryRun };
  } catch (e) {
    return { softError: e.message.slice(0, 400) };
  }
}

function phaseBidirectionalEnrich() {
  if (skipCommit) return { skipped: true };
  try {
    const out = runNode('tools/ci/bidirectional-enricher.js');
    return { output: String(out).slice(-400) };
  } catch (e) {
    // Soft: missing reports should not kill the loop
    return { softError: e.message.slice(0, 300) };
  }
}

function phaseEnsureCaseVariants() {
  if (skipCommit) return { skipped: true };
  const flag = dryRun ? '' : '--apply';
  const out = runNode('tools/ci/ensure-case-variants.js', flag);
  return { output: String(out).slice(-400), applied: !dryRun };
}

function phaseReInject() {
  if (skipCommit || dryRun) return { skipped: true };
  const out = runNode('tools/ci/re-inject-manual-fixes.js');
  return { output: String(out).slice(-400) };
}

function phaseAntiBotGate() {
  // Enrichers can re-place forbidden mfrs; strip first, then detect.
  // Hard-fail only if a regression remains after repair.
  if (!dryRun) {
    runNode('tools/ci/anti-bot-regression-gate.js', '--strip');
  }
  const out = runNode('tools/ci/anti-bot-regression-gate.js');
  return { output: String(out).slice(-300) };
}

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

function phaseTest() {
  if (skipCommit) { log('  skipped (--skip-commit)'); return { skipped: true }; }
  const tests = [
    'test-p68-blakadder-integration.js',
    'test-r68-flow-card-unique.js',
  ];
  const results = [];
  for (const t of tests) {
    const p = path.join(ROOT, 'tools', 'ci', t);
    if (!fs.existsSync(p)) {
      results.push({ test: t, ok: true, skipped: true });
      continue;
    }
    try {
      const out = execSync(`node tools/ci/${t}`, { cwd: ROOT, encoding: 'utf8' });
      results.push({ test: t, ok: true, output: String(out).slice(-100) });
    } catch (e) {
      results.push({ test: t, ok: false, error: e.message.slice(0, 200) });
    }
  }
  return { tests: results };
}

function phaseCommit() {
  if (dryRun || skipCommit) { log('  skipped (dry-run or --skip-commit)'); return { skipped: true }; }
  try {
    const status = execSync('git status -s', { cwd: ROOT, encoding: 'utf8' });
    if (!status.trim()) { return { ok: true, changes: 0, committed: false }; }
    execSync('git add drivers data/mfs_db.json tools/ci lib/utils .github/state/auto-enrich || true', {
      cwd: ROOT,
      shell: true,
    });
    // Prefer scoped add; fall back if shell fails on Windows locally
    try {
      execSync('git add -u drivers lib/utils tools/ci data/mfs_db.json', { cwd: ROOT });
    } catch (e) { /* ignore */ }
    const staged = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' });
    if (!staged.trim()) { return { ok: true, changes: 0, committed: false }; }
    const commitMsg = `chore(P99): auto-enrich closed loop + case variants ${new Date().toISOString().slice(0, 10)} [skip ci]`;
    execSync(`git commit -m "${commitMsg}" --quiet`, { cwd: ROOT });
    return { ok: true, committed: true, msg: commitMsg };
  } catch (e) {
    return { error: e.message, committed: false };
  }
}

function phasePublishSafe() {
  if (dryRun || skipPublish) { log('  skipped (dry-run or --skip-publish)'); return { skipped: true }; }
  return { handledBy: 'safe-sync-stable.yml (daily 04:00 UTC)' };
}

runPhase('1-crawl', phaseCrawl);
runPhase('2-cross-ref', phaseCrossRef);
runPhase('3-apply-blakadder', phaseApplyBlakadder);
runPhase('3a-multi-source-enrich', phaseMultiSourceEnrich);
runPhase('3b-bidirectional-enrich', phaseBidirectionalEnrich);
runPhase('3c-ensure-case-variants', phaseEnsureCaseVariants);
runPhase('3d-re-inject', phaseReInject);
runPhase('3e-anti-bot-gate', phaseAntiBotGate);
runPhase('4-validate', phaseValidate);
runPhase('5-test', phaseTest);
const commit = runPhase('6-commit', phaseCommit);
runPhase('7-publish-safe', phasePublishSafe);

summary.endTime = new Date().toISOString();
summary.totalDurationMs = Date.now() - startTime;
summary.committed = !!(commit && commit.committed);
fs.writeFileSync(path.join(STATE_DIR, 'loop.json'), JSON.stringify(summary, null, 2));

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `committed=${summary.committed}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `errors=${summary.errors.length}\n`);
}

log('\n=== P99 LOOP COMPLETE ===');
log(`Total: ${(summary.totalDurationMs / 1000).toFixed(1)}s`);
log(`Phases: ${Object.keys(summary.phases).length}`);
log(`Errors: ${summary.errors.length}`);
log(`Committed: ${summary.committed}`);
if (summary.errors.length) {
  for (const e of summary.errors) log(`  - ${e.phase}: ${e.error}`);
}

if (dryRun) log('(DRY RUN - no commits made)');
// Anti-bot / hard failures exit non-zero; soft validate failures stay in summary
const hardFail = summary.errors.some((e) => /anti-bot|3e-anti-bot/i.test(e.phase));
process.exit(hardFail ? 1 : 0);
