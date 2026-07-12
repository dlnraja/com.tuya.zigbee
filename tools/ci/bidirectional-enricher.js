#!/usr/bin/env node
/**
 * bidirectional-enricher.js
 *
 * Master/Stable bidirectional enricher.
 *
 *   master (beta): gets EVERYTHING (new mfrs, new features, advanced heuristics,
 *                  AI behavior, etc.) — the "innovation" app
 *   stable v5     : gets only FUNCTIONAL changes (bug fixes, mfrs for already-
 *                  supported PIDs, no new features) — the "reliability" app
 *
 * Workflow:
 *   1. Load Johan + Forum proposals
 *   2. For each mfr, classify: functional vs feature
 *   3. Apply to master unconditionally
 *   4. Apply to stable only if FUNCTIONAL
 *   5. Track per-app changes for the report
 *
 *   Functional:  adding mfr for already-supported PID
 *                fixing a bug
 *   Feature:     new driver, new capability, new heuristic, new flow card
 *
 * @author Mavis continuous flow 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MASTER_DIR = ROOT; // current dir
const STABLE_DIR = path.resolve(ROOT, '..', 'stable');
const CANONICAL_DB = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const STABLE_CANONICAL = path.join(STABLE_DIR, 'lib', 'tuya', 'fingerprints.json');
const JOHAN_REPORT = path.join(ROOT, '.github', 'state', 'johan-integration-report.json');
const FORUM_REPORT = path.join(ROOT, '.github', 'state', 'forum-integration-report.json');
const REPORT = path.join(ROOT, '.github', 'state', 'bidirectional-enrichment-report.json');

const FEATURE_KEYWORDS = [
  /new driver/i, /new feature/i, /new capability/i, /new flow/i, /new card/i,
  /advanced heuristic/i, /AI/i, /smart.*detect/i, /learning/i,
  /experimental/i, /beta/i, /preview/i,
];

const FUNCTIONAL_KEYWORDS = [
  /add.*support.*for/i, /fix.*crash/i, /fix.*bug/i, /fix.*interview/i,
  /not.*recognized/i, /unknown.*device/i, /interview.*result/i,
  /pairing/i, /battery/i, /interview/i, /manufacturerName/i,
];

function isFunctional(proposal) {
  const text = (proposal.sampleExcerpt || '') + ' ' + (proposal.excerpt || '');
  // Check if any FUNCTIONAL keyword matches and no FEATURE keyword
  const hasFunctional = FUNCTIONAL_KEYWORDS.some(re => re.test(text));
  const hasFeature = FEATURE_KEYWORDS.some(re => re.test(text));
  if (hasFeature && !hasFunctional) return false;
  if (hasFunctional) return true;
  // Default: adding mfr to existing driver is functional
  return proposal.proposedDriver !== 'generic_tuya' || proposal.productIds?.length > 0;
}

function loadProposals() {
  const all = [];
  if (fs.existsSync(JOHAN_REPORT)) {
    const j = JSON.parse(fs.readFileSync(JOHAN_REPORT, 'utf8'));
    for (const p of j.proposals || []) {
      all.push({ source: 'johan', ...p });
    }
  }
  if (fs.existsSync(FORUM_REPORT)) {
    const f = JSON.parse(fs.readFileSync(FORUM_REPORT, 'utf8'));
    for (const p of f.proposals || []) {
      all.push({ source: 'forum', mfr: p.mfr, proposedDriver: p.proposedDriver, reason: p.reason, sampleExcerpt: p.excerpt, issueCount: 1, signal: 'unknown' });
    }
  }
  return all;
}

function applyMfrToDriver(driverId, mfr) {
  const cpPath = path.join(MASTER_DIR, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(cpPath)) return { ok: false, reason: 'driver missing' };
  const j = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
  if (!j.zigbee) j.zigbee = {};
  if (!j.zigbee.manufacturerName) j.zigbee.manufacturerName = [];
  if (j.zigbee.manufacturerName.includes(mfr)) return { ok: false, reason: 'already present' };
  j.zigbee.manufacturerName.push(mfr);
  fs.writeFileSync(cpPath, JSON.stringify(j, null, 2), 'utf8');
  return { ok: true };
}

function applyMfrToStableDriver(driverId, mfr) {
  const cpPath = path.join(STABLE_DIR, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(cpPath)) return { ok: false, reason: 'stable driver missing' };
  const j = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
  if (!j.zigbee) j.zigbee = {};
  if (!j.zigbee.manufacturerName) j.zigbee.manufacturerName = [];
  if (j.zigbee.manufacturerName.includes(mfr)) return { ok: false, reason: 'already in stable' };
  j.zigbee.manufacturerName.push(mfr);
  fs.writeFileSync(cpPath, JSON.stringify(j, null, 2), 'utf8');
  return { ok: true };
}

function updateCanonical(mfr, driverId, type) {
  const fp = JSON.parse(fs.readFileSync(CANONICAL_DB, 'utf8'));
  if (fp[mfr]) {
    if (fp[mfr].driverId === driverId) return false; // already correct
    fp[mfr].driverId = driverId;
  } else {
    fp[mfr] = { driverId, type: type || 'device', powerSource: 'unknown', modelIds: [] };
  }
  fs.writeFileSync(CANONICAL_DB, JSON.stringify(fp, null, 2), 'utf8');
  return true;
}

function main() {
  console.log('Bidirectional Enricher v1.0.0\n');
  console.log('Master:', MASTER_DIR);
  console.log('Stable:', STABLE_DIR, fs.existsSync(STABLE_DIR) ? '(exists)' : '(NOT FOUND)');
  console.log();

  const proposals = loadProposals();
  console.log('Loaded proposals:', proposals.length);
  const bySource = {};
  for (const p of proposals) bySource[p.source] = (bySource[p.source] || 0) + 1;
  console.log('By source:', bySource);

  // Filter: only apply those with a real driver (not generic_tuya fallback)
  const applicable = proposals.filter(p => p.proposedDriver && p.proposedDriver !== 'generic_tuya');
  const genericFallback = proposals.filter(p => p.proposedDriver === 'generic_tuya');
  console.log('Applicable (specific driver):', applicable.length);
  console.log('Generic fallback (skip for now):', genericFallback.length);

  // Classify
  const functional = applicable.filter(isFunctional);
  const feature = applicable.filter(p => !isFunctional(p));
  console.log('Functional (stable-safe):', functional.length);
  console.log('Feature (master-only):', feature.length);

  // Apply to master: all applicable
  const masterResults = { ok: 0, skipped: 0, failed: 0, drivers: new Set() };
  for (const p of applicable) {
    const r = applyMfrToDriver(p.proposedDriver, p.mfr);
    if (r.ok) {
      masterResults.ok++;
      masterResults.drivers.add(p.proposedDriver);
      updateCanonical(p.mfr, p.proposedDriver, 'device');
    } else if (r.reason === 'already present') {
      masterResults.skipped++;
    } else {
      masterResults.failed++;
      console.log('  MASTER FAIL:', p.mfr, '->', p.proposedDriver, ':', r.reason);
    }
  }
  console.log('\n=== MASTER APPLIED ===');
  console.log('OK:', masterResults.ok, '| Skipped:', masterResults.skipped, '| Failed:', masterResults.failed);
  console.log('Drivers touched:', masterResults.drivers.size);

  // Apply to stable: only functional
  const stableResults = { ok: 0, skipped: 0, failed: 0, drivers: new Set() };
  if (fs.existsSync(STABLE_DIR)) {
    for (const p of functional) {
      const r = applyMfrToStableDriver(p.proposedDriver, p.mfr);
      if (r.ok) {
        stableResults.ok++;
        stableResults.drivers.add(p.proposedDriver);
      } else if (r.reason === 'already in stable') {
        stableResults.skipped++;
      } else {
        stableResults.failed++;
      }
    }
  }
  console.log('\n=== STABLE APPLIED (functional only) ===');
  console.log('OK:', stableResults.ok, '| Skipped:', stableResults.skipped, '| Failed:', stableResults.failed);
  console.log('Drivers touched:', stableResults.drivers.size);
  console.log('(Note: stable only gets FUNCTIONAL changes — no new features)');

  // Save report
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      proposals: proposals.length,
      bySource,
      applicable: applicable.length,
      functional: functional.length,
      feature: feature.length,
      genericFallback: genericFallback.length,
    },
    master: {
      applied: masterResults.ok,
      skipped: masterResults.skipped,
      failed: masterResults.failed,
      drivers: [...masterResults.drivers],
    },
    stable: {
      applied: stableResults.ok,
      skipped: stableResults.skipped,
      failed: stableResults.failed,
      drivers: [...stableResults.drivers],
    },
    proposals: applicable,
  }, null, 2));
  console.log('\n✓ Report:', REPORT);
}

if (require.main === module) main();
