#!/usr/bin/env node
'use strict';

/**
 * P2547 — External app + Homey SDK3 inspiration SSOT gate.
 * Contre quoi: wipe SSOT, drop Sdk3ZclSafe, reintroduce blind /2 in data-collector,
 * or lose markdown SDK3 sync URLs.
 *
 *   node tools/ci/p2547-external-sdk3-inspiration-gate.js
 *   node tools/ci/p2547-external-sdk3-inspiration-gate.js --json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SSOT = path.join(ROOT, 'config', 'architecture', 'external-app-sdk3-inspiration-ssot.json');
const JSON_MODE = process.argv.includes('--json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  const errors = [];
  if (!fs.existsSync(SSOT)) {
    errors.push('missing SSOT');
  }

  let ssot = {};
  try {
    ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  } catch (e) {
    errors.push(`SSOT parse: ${e.message}`);
  }

  if (ssot._meta?.patch !== 'P2547') errors.push('SSOT patch != P2547');
  if (ssot._meta?.dualApp !== 'BOTH') errors.push('SSOT dualApp != BOTH');
  if (!ssot.doctrine?.noInventPid) errors.push('doctrine.noInventPid missing');
  if (!ssot.doctrine?.noForumPost) errors.push('doctrine.noForumPost missing');
  if (!Array.isArray(ssot.externalApps) || ssot.externalApps.length < 5) {
    errors.push('externalApps too short');
  }
  if (!Array.isArray(ssot.officialSdk3?.rules) || ssot.officialSdk3.rules.length < 6) {
    errors.push('officialSdk3.rules too short');
  }
  const covered = ssot.johanOpenIssuesCoverage2026_09_17?.covered || [];
  if (covered.length < 8) errors.push('Johan coverage matrix too short');

  const requiredPaths = [
    'lib/utils/Sdk3ZclSafe.js',
    'docs/architecture/EXTERNAL_APP_SDK3_INSPIRATION_SSOT.md',
    '.cursor/rules/sdk3-external-inspiration-always.mdc',
    'test/critical/p2547-external-sdk3-inspiration.test.js',
    '.github/scripts/sync-sdk3-docs.js',
  ];
  for (const rel of requiredPaths) {
    if (!fs.existsSync(path.join(ROOT, rel))) errors.push(`missing ${rel}`);
  }

  // Runtime: no blind /2 on batteryPercentageRemaining in data-collector
  const collector = read('lib/utils/data-collector.js');
  if (/batteryPercentageRemaining[\s\S]{0,400}value\s*\/\s*2/.test(collector)
    || /Math\.round\(\s*value\s*\/\s*2\s*\)/.test(collector)) {
    errors.push('data-collector still blind /2 on ZCL battery (P216)');
  }
  if (!/normalizeZclBatteryPercent/.test(collector)) {
    errors.push('data-collector missing normalizeZclBatteryPercent');
  }

  const safe = read('lib/utils/Sdk3ZclSafe.js');
  for (const name of ['catchZcl', 'scheduleDeferredInit', 'setCapabilityCaught', 'INIT_COMMUNICATION_DELAY_MS']) {
    if (!safe.includes(name)) errors.push(`Sdk3ZclSafe missing ${name}`);
  }

  const sync = read('.github/scripts/sync-sdk3-docs.js');
  if (!/\.md/.test(sync) && !/zigbee\.md/.test(sync)) {
    // Prefer markdown endpoints — soft fail if neither mentioned after P2547 update
    errors.push('sync-sdk3-docs.js should prefer .md SDK3 URLs');
  }

  const pkg = JSON.parse(read('package.json'));
  if (!pkg.scripts?.['check:p2547']) errors.push('package.json missing check:p2547');
  if (pkg.dependencies?.['homey-meshdriver']) errors.push('homey-meshdriver must not be a dependency');
  if (!pkg.dependencies?.['homey-zigbeedriver']) errors.push('homey-zigbeedriver dependency missing');

  const report = {
    patch: 'P2547',
    ok: errors.length === 0,
    errors,
    externalApps: (ssot.externalApps || []).map((a) => a.id),
    johanCovered: covered.length,
  };

  if (JSON_MODE) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    if (report.ok) {
      console.log(`P2547 OK — ${report.externalApps.length} apps, ${report.johanCovered} Johan couples locked`);
    } else {
      console.error('P2547 FAIL');
      for (const e of errors) console.error(` - ${e}`);
    }
  }
  process.exit(report.ok ? 0 : 1);
}

main();
