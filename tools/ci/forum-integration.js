#!/usr/bin/env node
/**
 * forum-integration.js
 *
 * Autonomous forum thread integration.
 * Parses all forum interview files in docs/data/interviews/,
 * extracts mfrs, cross-references with canonical DB,
 * applies new mfrs to relevant drivers.
 *
 * Strategy:
 *   1. Parse all interview files (JSON with INTERNAL_TRACKER placeholder)
 *   2. Extract mfrs from fingerprints[] field
 *   3. Cross-reference with canonical DB
 *   4. For each new mfr, find the right driver based on:
 *      - PID family heuristics
 *      - Excerpt content (climate, motion, door, plug, etc.)
 *      - Existing patterns
 *   5. Apply to master driver (beta)
 *   6. Skip stable (only apply if PIDs in stable already)
 *
 * @author Mavis continuous flow 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INTERVIEWS_DIR = path.join(ROOT, 'docs', 'data', 'interviews');
const CANONICAL_DB = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORT = path.join(ROOT, '.github', 'state', 'forum-integration-report.json');

// PID family patterns (mirrors intelligent-variant-finder)
const PID_PATTERNS = {
  climate: /TS0201|TS0222|TS0224|TS0225/,
  contact: /TS0203/,
  motion: /TS0202|TS0204|TS0205|TS0210|TS0226/,
  water: /TS0207/,
  smoke: /TS0205/,
  switch: /TS0001|TS0002|TS0003|TS0004|TS0006|TS0011|TS0012|TS0013|TS0014|TS0016|TS0017|TS0018/,
  plug: /TS011F|TS0121|TS1101/,
  bulb: /TS0501|TS0502|TS0503|TS0504|TS0505/,
  dimmer: /TS110E|TS110F/,
  remote: /TS0041|TS0042|TS0043|TS0044|TS0045|TS0046|TS004F/,
  thermostat: /TS0601.*radiator|TS0601.*thermo|TS0601.*valve/i,
  soil: /TS0601.*soil|TS0601.*moisture/i,
  generic: /TS0601/,
};

// Driver patterns from excerpt content
const EXCERPT_PATTERNS = {
  climate: /(temp|temphum|humidity|climate|moes.*thl|co2|illumin|air.*quality)/i,
  contact: /(door|window|contact|magnet|open.*close|sensor_magnet)/i,
  motion: /(motion|pir|presence|radar|mmwave|microwave)/i,
  water: /(water|leak|flood|rain)/i,
  smoke: /(smoke|gas|co.*detect|fire)/i,
  switch: /(switch|relay|gang|touch|wall.*switch)/i,
  plug: /(plug|outlet|socket|power.*meter|energ.*meter|power.*strip|wall.*socket)/i,
  bulb: /(bulb|light|rgb|tunable|dimmer|strip|led)/i,
  remote: /(remote|button|scene|wireless|knob)/i,
  thermostat: /(thermostat|trv|valve|heater|radiator|heat)/i,
  soil: /(soil|moist|irrigation|plant|water.*plant)/i,
};

function fixJSON(s) {
  // Replace INTERNAL_TRACKER placeholder with null
  return s.replace(/:\s*INTERNAL_TRACKER\b/g, ': null');
}

function parseInterviews() {
  const files = fs.readdirSync(INTERVIEWS_DIR).filter(f => f.startsWith('forum_'));
  const results = [];
  for (const f of files) {
    const fp = path.join(INTERVIEWS_DIR, f);
    let content = fs.readFileSync(fp, 'utf8');
    content = fixJSON(content);
    try {
      const j = JSON.parse(content);
      results.push({
        file: f,
        topicId: j.topicId,
        postId: j.postId,
        postNumber: j.postNumber,
        user: j.user,
        date: j.date,
        fingerprints: j.fingerprints || [],
        excerpt: j.excerpt || '',
        deviceName: j.deviceName || '',
        model: j.model || '',
        hidden: j.hidden || false,
      });
    } catch (e) {
      // Try harder
      try {
        const fixed = content.replace(/:\s*INTERNAL_TRACKER/g, ': null').replace(/INTERNAL_TRACKER/g, 'null');
        const j = JSON.parse(fixed);
        results.push({
          file: f, topicId: null, postId: j.postId, user: j.user, date: j.date,
          fingerprints: j.fingerprints || [], excerpt: j.excerpt || '',
          deviceName: j.deviceName || '', model: j.model || '', hidden: j.hidden || false,
        });
      } catch (e2) {
        console.error('  PARSE ERROR', f, ':', e2.message.substring(0, 80));
      }
    }
  }
  return results;
}

function inferDriver(mfr, fp, excerpt) {
  // Find existing driver for this mfr
  if (fp[mfr]?.driverId) return { driver: fp[mfr].driverId, reason: 'canonical' };
  // Try excerpt patterns
  for (const [cat, re] of Object.entries(EXCERPT_PATTERNS)) {
    if (re.test(excerpt)) {
      const map = {
        climate: 'climate_sensor', contact: 'contact_sensor', motion: 'motion_sensor',
        water: 'water_leak_sensor', smoke: 'smoke_detector_advanced',
        switch: 'switch_1gang', plug: 'plug', bulb: 'bulb_dimmable',
        remote: 'button_wireless_1', thermostat: 'thermostat', soil: 'soil_sensor',
      };
      return { driver: map[cat], reason: `excerpt-${cat}` };
    }
  }
  return { driver: 'generic_tuya', reason: 'fallback' };
}

function main() {
  console.log('Forum Integration v1.0.0\n');
  const interviews = parseInterviews();
  console.log('Parsed interviews:', interviews.length);

  // Stats
  const allFps = new Set();
  const userMap = new Map();
  for (const i of interviews) {
    i.fingerprints.forEach(m => allFps.add(m));
    if (i.user) userMap.set(i.user, (userMap.get(i.user) || 0) + 1);
  }
  console.log('Unique mfrs:', allFps.size);
  console.log('Unique users:', userMap.size);

  // Cross-reference with canonical
  const canonical = JSON.parse(fs.readFileSync(CANONICAL_DB, 'utf8'));
  const newMfrs = [...allFps].filter(m => !canonical[m]);
  const existingMfrs = [...allFps].filter(m => canonical[m]);
  console.log('Mfrs new (not in canonical):', newMfrs.length);
  console.log('Mfrs existing:', existingMfrs.length);

  // For each new mfr, infer driver
  const proposals = [];
  for (const m of newMfrs) {
    const interview = interviews.find(i => i.fingerprints.includes(m));
    const inference = inferDriver(m, canonical, interview?.excerpt || '');
    proposals.push({
      mfr: m,
      proposedDriver: inference.driver,
      reason: inference.reason,
      user: interview?.user,
      date: interview?.date,
      excerpt: interview?.excerpt?.substring(0, 200),
    });
  }
  console.log('\n=== NEW MFRS TO INTEGRATE ===');
  for (const p of proposals) {
    console.log('  ' + p.mfr + ' -> ' + p.proposedDriver + ' (' + p.reason + ') by ' + p.user);
  }

  // Save report
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      interviews: interviews.length,
      uniqueMfrs: allFps.size,
      newMfrs: newMfrs.length,
      existingMfrs: existingMfrs.length,
      users: userMap.size,
    },
    proposals,
    existingMfrs: existingMfrs.map(m => ({ mfr: m, currentDriver: canonical[m]?.driverId })),
  }, null, 2));
  console.log('\n✓ Report:', REPORT, '(' + (fs.statSync(REPORT).length / 1024).toFixed(1) + ' KB)');
}

if (require.main === module) main();
