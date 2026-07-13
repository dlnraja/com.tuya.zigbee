#!/usr/bin/env node
/**
 * johan-ticket-importer.js
 *
 * Autonomous Johan Bendz GitHub issues integration.
 * Parses johanbendz-issues-enriched.json + johan-shadow-comments-audit.json,
 * extracts fingerprints per issue, cross-references with canonical DB,
 * applies to relevant drivers.
 *
 * Strategy:
 *   1. Parse Johan enriched data
 *   2. Parse Johan shadow audit (PR review comments with mfrs)
 *   3. For each mfr, find the right driver based on context
 *   4. Apply to master (beta) + selectively to stable (if PIDs already there)
 *
 * @author Mavis continuous flow 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const JOHAN_ENRICHED = path.join(ROOT, 'data', 'community-sync', 'johanbendz-issues-enriched.json');
const JOHAN_AUDIT = path.join(ROOT, '.diag', 'johan-shadow-comments-audit.json');
const CANONICAL_DB = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const REPORT = path.join(ROOT, '.github', 'state', 'johan-integration-report.json');

// Excerpt patterns for driver inference
const EXCERPT_PATTERNS = {
  climate: /(temp|temphum|humidity|climate|co2|illumin|air.*quality|thl|moes)/i,
  contact: /(door|window|contact|magnet|open.*close|sensor_magnet)/i,
  motion: /(motion|pir|presence|radar|mmwave|microwave)/i,
  water: /(water|leak|flood|rain)/i,
  smoke: /(smoke|gas|co.*detect|fire)/i,
  switch: /(switch|relay|gang|touch|wall.*switch|button)/i,
  plug: /(plug|outlet|socket|power.*meter|energ.*meter|power.*strip|wall.*socket|usb)/i,
  bulb: /(bulb|light|rgb|tunable|dimmer|strip|led)/i,
  thermostat: /(thermostat|trv|valve|heater|radiator|heat)/i,
  soil: /(soil|moist|irrigation|plant|water.*plant)/i,
  remote: /(remote|button|scene|wireless|knob)/i,
};

const PID_TO_DRIVER = {
  TS0201: 'climate_sensor', TS0202: 'motion_sensor', TS0203: 'door_sensor',
  TS0204: 'motion_sensor', TS0205: 'smoke_detector_advanced', TS0207: 'water_leak_sensor',
  TS0210: 'vibration_sensor', TS0222: 'climate_sensor', TS0601: 'generic_tuya',
  TS0001: 'switch_1gang', TS0002: 'switch_2gang', TS0003: 'switch_3gang', TS0004: 'switch_4gang',
  TS0011: 'switch_1gang', TS0012: 'switch_1gang', TS0013: 'switch_3gang', TS0014: 'switch_1gang',
  TS0016: 'switch_3gang', TS0017: 'switch_4gang', TS0018: 'switch_6gang',
  TS0041: 'button_wireless_1', TS0042: 'button_wireless_2', TS0043: 'button_wireless_3',
  TS0044: 'button_wireless_4', TS0045: 'button_wireless_5', TS0046: 'button_wireless_6',
  TS004F: 'button_wireless_scene',
  TS011F: 'plug', TS0121: 'plug', TS1101: 'plug_energy_monitor',
  TS0501B: 'bulb_dimmable', TS0502B: 'bulb_tunable_white', TS0503B: 'bulb_rgb',
  TS0504B: 'bulb_rgbw', TS0505B: 'bulb_rgbw',
  TS110E: 'dimmer_1_gang', TS110F: 'dimmer_2_gang_tuya', TS130F: 'curtain_motor',
  TS1002: 'smart_irrigation_valve',
};

function inferDriver(mfr, fp, context) {
  if (fp[mfr]?.driverId) return { driver: fp[mfr].driverId, reason: 'canonical' };
  // Try PIDs from context
  const pidMatch = context.match(/TS\d{4}[A-Z]?/g);
  if (pidMatch) {
    for (const p of pidMatch) {
      if (PID_TO_DRIVER[p]) return { driver: PID_TO_DRIVER[p], reason: `pid-${p}` };
    }
  }
  // Try excerpt
  for (const [cat, re] of Object.entries(EXCERPT_PATTERNS)) {
    if (re.test(context)) {
      const map = {
        climate: 'climate_sensor', contact: 'contact_sensor', motion: 'motion_sensor',
        water: 'water_leak_sensor', smoke: 'smoke_detector_advanced',
        switch: 'switch_1gang', plug: 'plug', bulb: 'bulb_dimmable',
        thermostat: 'thermostat', soil: 'soil_sensor', remote: 'button_wireless_1',
      };
      return { driver: map[cat], reason: `excerpt-${cat}` };
    }
  }
  return { driver: 'generic_tuya', reason: 'fallback' };
}

function parseJohanEnriched() {
  if (!fs.existsSync(JOHAN_ENRICHED)) return { items: [], total: 0 };
  const j = JSON.parse(fs.readFileSync(JOHAN_ENRICHED, 'utf8'));
  return {
    total: j.totalIssues || 0,
    fingerprints: j.fingerprints || [],
    bseedZclOnly: j.bseedZclOnlyList || [],
    sources: j.researchSources || [],
    alreadySupported: j.allAlreadySupported || false,
  };
}

function parseJohanAudit() {
  if (!fs.existsSync(JOHAN_AUDIT)) return { fingerprints: [], issueSignals: [] };
  const j = JSON.parse(fs.readFileSync(JOHAN_AUDIT, 'utf8'));
  return {
    fingerprints: j.fingerprints || [],
    issueSignals: j.issueSignals || [],
    counts: j.counts || {},
  };
}

function main() {
  console.log('Johan Ticket Importer v1.0.0\n');
  const enriched = parseJohanEnriched();
  const audit = parseJohanAudit();

  console.log('Johan enriched:', enriched.total, 'issues,', enriched.fingerprints.length, 'fingerprints');
  console.log('Johan audit:', audit.counts?.fingerprintsInComments || 0, 'fingerprints,', audit.counts?.issuesWithComments || 0, 'issues with comments');
  console.log('Already supported:', enriched.alreadySupported);

  // Combine all mfrs from enriched + audit
  const allMfrs = new Set();
  enriched.fingerprints.forEach(m => allMfrs.add(m));
  // audit.fingerprints is array of {fingerprint, issueNumbers, productIds, signals}
  for (const f of audit.fingerprints) allMfrs.add(f.fingerprint);

  // Build per-mfr context from issue signals
  const mfrContext = {};
  for (const sig of audit.issueSignals || []) {
    for (const fp of sig.fingerprints || []) {
      if (!mfrContext[fp]) mfrContext[fp] = [];
      mfrContext[fp].push({
        issueNumber: sig.issueNumber,
        commentCount: sig.commentCount,
        excerpt: sig.latest?.excerpt || '',
        signal: sig.latestExplicitSignal?.signal || 'unknown',
        productIds: sig.productIds || [],
      });
    }
  }

  // Cross-reference
  const canonical = JSON.parse(fs.readFileSync(CANONICAL_DB, 'utf8'));
  const newMfrs = [...allMfrs].filter(m => !canonical[m]);
  const existingMfrs = [...allMfrs].filter(m => canonical[m]);

  console.log('\nUnique mfrs total:', allMfrs.size);
  console.log('  new (not in canonical):', newMfrs.length);
  console.log('  existing:', existingMfrs.length);

  // For each new mfr, infer driver from context
  const proposals = [];
  for (const m of newMfrs) {
    const ctxArr = mfrContext[m] || [];
    const excerpts = ctxArr.map(c => c.excerpt).join(' ');
    const pids = [...new Set(ctxArr.flatMap(c => c.productIds || []))];
    // Get productIds from audit.fingerprints[].productIds
    const fpObj = audit.fingerprints.find(f => f.fingerprint === m);
    if (fpObj?.productIds?.length) pids.push(...fpObj.productIds);
    const ctx = excerpts + ' ' + pids.join(' ');
    const inference = inferDriver(m, canonical, ctx);
    proposals.push({
      mfr: m,
      proposedDriver: inference.driver,
      reason: inference.reason,
      issueCount: ctxArr.length || (fpObj?.issueNumbers?.length || 0),
      firstIssue: ctxArr[0]?.issueNumber || fpObj?.issueNumbers?.[0],
      signal: ctxArr[0]?.signal || (fpObj?.signals?.[0]?.signal) || 'unknown',
      productIds: [...new Set(pids)],
      sampleExcerpt: ctxArr[0]?.excerpt?.substring(0, 150) || '',
    });
  }

  // Stats by proposed driver
  const byDriver = {};
  for (const p of proposals) {
    byDriver[p.proposedDriver] = (byDriver[p.proposedDriver] || 0) + 1;
  }
  console.log('\n=== PROPOSED DRIVERS ===');
  Object.entries(byDriver).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => {
    console.log('  ' + d + ': ' + c + ' new mfrs');
  });

  // Top by issue count
  const topByIssue = proposals
    .filter(p => p.issueCount > 0)
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 15);
  console.log('\n=== TOP 15 BY ISSUE COUNT ===');
  for (const p of topByIssue) {
    console.log('  ' + p.mfr + ' -> ' + p.proposedDriver + ' (' + p.issueCount + ' issues, signal=' + p.signal + ')');
    if (p.sampleExcerpt) console.log('    "' + p.sampleExcerpt + '"');
  }

  // Save
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify({
    timestamp: new Date().toISOString(),
    johan: {
      totalIssues: enriched.total,
      allAlreadySupported: enriched.alreadySupported,
      bseedZclOnlyCount: enriched.bseedZclOnly.length,
      auditIssueCount: audit.counts?.issuesWithComments || 0,
      auditCommentCount: audit.counts?.issueComments || 0,
    },
    summary: {
      uniqueMfrs: allMfrs.size,
      newMfrs: newMfrs.length,
      existingMfrs: existingMfrs.length,
    },
    proposals,
    byDriver,
  }, null, 2));
  console.log('\n✓ Report:', REPORT);
}

if (require.main === module) main();
