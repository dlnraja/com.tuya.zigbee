#!/usr/bin/env node
/**
 * P114 — Multi-source enrich orchestrator
 *
 * Closed chain across local state + CI sources:
 *   forum silent routes → sacred lots (p101/p102) → blakadder →
 *   infer-enrich (dry) → collision gate (dry) → diag sacred dry-gate
 *
 * NEVER blind-applies ambiguous forum Johan truncations.
 * Known-route / sacred-lot apply only when --apply is set.
 *
 * Usage:
 *   node tools/ci/multi-source-enrich-orchestrator.js
 *   node tools/ci/multi-source-enrich-orchestrator.js --apply
 *   node tools/ci/multi-source-enrich-orchestrator.js --skip-scan --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const SKIP_SCAN = process.argv.includes('--skip-scan');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'multi-source');
const REPORT = path.join(STATE_DIR, 'enrich-report.json');

if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

const summary = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? 'apply' : 'dry-run',
  phases: [],
  ok: true,
};

function log(msg) {
  console.log(`[multi-source] ${msg}`);
}

function runNode(rel, extraArgs = [], soft = true) {
  const script = path.join(ROOT, rel);
  if (!fs.existsSync(script)) {
    return { ok: false, skipped: true, reason: 'missing-script', script: rel };
  }
  const args = [script, ...extraArgs];
  const t0 = Date.now();
  const res = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 240000,
    env: {
      ...process.env,
      FORUM_AUTO_POST: '0',
      REPLY_TOPICS: '140352',
      SMART_FETCH_READER_FALLBACK: process.env.SMART_FETCH_READER_FALLBACK || '1',
    },
  });
  const out = `${res.stdout || ''}${res.stderr || ''}`.trim();
  const ok = res.status === 0;
  return {
    ok: soft ? true : ok,
    hardOk: ok,
    exitCode: res.status,
    durationMs: Date.now() - t0,
    script: rel,
    args: extraArgs,
    tail: out.slice(-800),
  };
}

function phase(name, fn) {
  log(`▶ ${name}`);
  const t0 = Date.now();
  try {
    const result = fn() || {};
    const entry = { name, ok: true, durationMs: Date.now() - t0, ...result };
    summary.phases.push(entry);
    log(`✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return entry;
  } catch (e) {
    summary.ok = false;
    const entry = { name, ok: false, durationMs: Date.now() - t0, error: e.message };
    summary.phases.push(entry);
    log(`✗ ${name}: ${e.message}`);
    return entry;
  }
}

phase('1-forum-silent-scan', () => {
  if (SKIP_SCAN) return { skipped: true };
  return runNode('tools/ci/forum-silent-multi-scan.js', ['--max=40'], true);
});

phase('2-forum-ai-paste-gate', () => runNode('tools/ci/forum-ai-paste-gate.js', ['--scan-defaults'], true));

phase('3-apply-forum-known-routes', () => {
  const args = APPLY ? ['--apply'] : [];
  return runNode('tools/ci/apply-forum-silent-multi.js', args, true);
});

phase('4-sacred-lot2', () => {
  const args = APPLY ? ['--apply'] : [];
  return runNode('tools/ci/apply-p101-sacred-lot2.js', args, true);
});

phase('5-sacred-lot3', () => {
  const args = APPLY ? ['--apply'] : [];
  return runNode('tools/ci/apply-p102-sacred-lot3.js', args, true);
});

phase('6-blakadder-new', () => {
  // Prefer dry unless --apply; apply script uses --apply flag when present
  const script = fs.existsSync(path.join(ROOT, 'tools/ci/apply-blakadder-new.js'))
    ? 'tools/ci/apply-blakadder-new.js'
    : 'tools/ci/apply-blakadder-new-fps-r68.js';
  const args = APPLY ? ['--apply'] : [];
  return runNode(script, args, true);
});

phase('7-infer-enrich-dry', () => runNode('tools/ci/infer-enrich-from-incomplete.js', ['--dry-run'], true));

phase('8-sacred-couple-dry-gate', () => {
  try {
    const out = execSync('npm run check:diag-protocol', {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
      stdio: 'pipe',
    });
    return { ok: true, tail: String(out).slice(-500) };
  } catch (e) {
    return { ok: true, softError: (e.message || '').slice(0, 300), soft: true };
  }
});

phase('9-collision-resolve-dry', () => {
  const script = 'scripts/ci/resolve-collisions.js';
  if (!fs.existsSync(path.join(ROOT, script))) {
    return { skipped: true, reason: 'missing resolve-collisions' };
  }
  return runNode(script, ['--dry-run'], true);
});

phase('10-case-variants', () => {
  const args = APPLY ? ['--apply'] : [];
  return runNode('tools/ci/ensure-case-variants.js', args, true);
});

phase('10b-cross-project-reimpl-gate', () => runNode('tools/ci/cross-project-better-reimpl.js', [], true));

// Aggregate source coverage from state files
phase('11-coverage-snapshot', () => {
  const snapshot = {};
  const files = {
    gmailUnique: '.github/state/gmail-unique-fps.json',
    forumDigest: '.github/state/forum/multi-silent-digest.json',
    forumApply: '.github/state/forum/multi-silent-apply-report.json',
    lot3: '.github/state/p102-sacred-lot3-report.json',
    blakadder: '.github/state/blakadder/apply-report.json',
    infer: '.github/state/infer-enrich-report.json',
  };
  for (const [k, rel] of Object.entries(files)) {
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) {
      snapshot[k] = { present: false };
      continue;
    }
    try {
      const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (k === 'gmailUnique') snapshot[k] = { present: true, count: (j.fps || []).length };
      else if (k === 'forumDigest') snapshot[k] = { present: true, totals: j.totals || null };
      else if (k === 'lot3') snapshot[k] = { present: true, couples: (j.report || []).length };
      else if (k === 'infer') {
        snapshot[k] = {
          present: true,
          applied: Array.isArray(j.applied) ? j.applied.length : 0,
          needsReview: Array.isArray(j.inferred_needs_review) ? j.inferred_needs_review.length : 0,
        };
      } else snapshot[k] = { present: true, keys: Object.keys(j).slice(0, 8) };
    } catch (e) {
      snapshot[k] = { present: true, parseError: e.message };
    }
  }

  // Driver index health
  const driversDir = path.join(ROOT, 'drivers');
  let driverCount = 0;
  let mfrCount = 0;
  for (const d of fs.readdirSync(driversDir)) {
    const f = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    driverCount += 1;
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      mfrCount += (j.zigbee?.manufacturerName || []).length;
    } catch (_e) { /* skip */ }
  }
  snapshot.drivers = { driverCount, manufacturerNameEntries: mfrCount };
  return { snapshot };
});

fs.writeFileSync(REPORT, `${JSON.stringify(summary, null, 2)}\n`);
log(`Report → ${REPORT}`);
log(`Mode=${summary.mode} phases=${summary.phases.length} ok=${summary.ok}`);
process.exit(summary.ok ? 0 : 1);
