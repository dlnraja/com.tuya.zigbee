#!/usr/bin/env node
/**
 * audit-multigang-flows.cjs — Rule M3 compliance auditor
 * ---------------------------------------------------------------
 * Rule M3 (CRITICAL_MISTAKES): every multi-gang driver that declares
 * capabilities `onoff.gang2` ... `onoff.gang8` (or legacy `onoff.2`)
 * MUST register flow triggers `${driver}_physical_gang{N}_{on|off}`
 * for each gang ≥ 2. Missing flows = UNLINKED_GANG_FLOW violation
 * (NEXUS_AUTONOMOUS audit) → user cannot build "gang N turned on"
 * flows.
 *
 * This auditor scans the generated app.json and reports all drivers
 * that have gang capabilities but lack the corresponding flow triggers.
 * Read-only — does not modify files. Pair with the multigang refactor.
 *
 * Usage:
 *   node scripts/maintenance/audit-multigang-flows.cjs              # scan .homeybuild/app.json
 *   node scripts/maintenance/audit-multigang-flows.cjs app.json     # scan a specific manifest
 * ---------------------------------------------------------------
 */
'use strict';

const fs = require('fs');
const path = require('path');

const manifestPath = process.argv[2]
  || (fs.existsSync(path.join(process.cwd(), '.homeybuild', 'app.json'))
      ? path.join(process.cwd(), '.homeybuild', 'app.json')
      : path.join(process.cwd(), 'app.json'));

if (!fs.existsSync(manifestPath)) {
  console.error('Manifest not found:', manifestPath);
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const drivers = manifest.drivers || [];

const GANG_CAP_RE = /^onoff\.(?:gang)?([2-9])$/;
let compliant = 0;
const violations = [];

for (const d of drivers) {
  const caps = d.capabilities || [];
  // Extract gang numbers from capability names.
  const gangNums = caps
    .map(c => {
      const m = typeof c === 'string' ? c.match(GANG_CAP_RE) : null;
      return m ? parseInt(m[1], 10) : null;
    })
    .filter(n => n !== null);
  if (gangNums.length === 0) continue; // single-gang, skip

  const flowTriggers = ((d.flow || {}).triggers || []).map(t => t.id || t);
  // For each gang ≥ 2, check that a physical_gang flow exists.
  const missingGangs = [];
  for (const n of gangNums) {
    const hasFlow = flowTriggers.some(id =>
      new RegExp(`gang${n}_(on|off)|physical_gang${n}`, 'i').test(id)
    );
    if (!hasFlow) missingGangs.push(n);
  }
  if (missingGangs.length === 0) {
    compliant++;
  } else {
    violations.push({
      driver: d.id,
      gangCaps: caps.filter(c => GANG_CAP_RE.test(c)),
      missingGangs,
      totalFlows: flowTriggers.length,
      sampleFlows: flowTriggers.slice(0, 3),
    });
  }
}

console.log('========================================');
console.log(' audit-multigang-flows.cjs (Rule M3)');
console.log('========================================');
console.log(`Manifest: ${manifestPath}`);
console.log(`Multi-gang drivers: ${compliant + violations.length}`);
console.log(`Compliant: ${compliant}`);
console.log(`Violations (missing gang flows): ${violations.length}`);
console.log('----------------------------------------');
if (violations.length) {
  for (const v of violations) {
    console.log(`  ${v.driver}`);
    console.log(`    gang caps: ${v.gangCaps.join(', ')}`);
    console.log(`    MISSING physical_gang flows for gang(s): ${v.missingGangs.join(', ')}`);
    console.log(`    existing flows: ${v.totalFlows} (samples: ${v.sampleFlows.join(', ') || 'none'})`);
  }
}
console.log('----------------------------------------');
console.log('Fix: for each violating driver, add flow triggers');
console.log('  `${driverId}_physical_gang{N}_on`  and  `_off`');
console.log('  in driver.flow.compose.json, and register them in device.js via');
console.log('  this.homey.flow.getTriggerCard(id).registerRunListener(...).');
process.exit(violations.length > 0 ? 1 : 0);
