#!/usr/bin/env node
'use strict';

/**
 * verify-homey-device-updates.js (P2359)
 *
 * Full Device Updates verification loop:
 *  1) firmware-updates-gate (--coverage)
 *  2) dry-run build-firmware-updates (source detect vs catalog)
 *  3) HomeyDeviceUpdates helper smoke
 *  4) write .github/state/homey-device-updates-verify.json
 *
 * Usage: node tools/ci/verify-homey-device-updates.js [--json]
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const JSON_MODE = process.argv.includes('--json');

function run(label, args) {
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    label,
    ok: r.status === 0,
    status: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

function main() {
  const HDU = require('../../lib/ota/HomeyDeviceUpdates');
  const ssot = HDU.loadSsot();

  const gate = run('firmware-updates-gate', [
    path.join('tools', 'ci', 'firmware-updates-gate.js'),
    '--json',
    '--coverage',
  ]);
  let gateReport = null;
  try { gateReport = JSON.parse(gate.stdout); } catch { /* keep null */ }

  const dry = run('build-firmware-updates-dry', [
    path.join('tools', 'ci', 'build-firmware-updates.js'),
  ]);
  const dryMatch = dry.stdout.match(/drivers:\s*(\d+)\s*\|\s*skipped:\s*(\d+)/);
  const dryDrivers = dryMatch ? Number(dryMatch[1]) : null;
  const drySkipped = dryMatch ? Number(dryMatch[2]) : null;

  const helperOk = typeof HDU.userGuidance === 'function'
    && HDU.semverGte('13.2.0', '13.2.0')
    && !HDU.semverGte('13.1.9', '13.2.0');

  const report = {
    timestamp: new Date().toISOString(),
    patch: 'P2359',
    news: ssot._meta?.news || 'https://homey.app/en-fr/news/introducing-device-updates/',
    sdkDocs: ssot._meta?.sdkDocs,
    requirements: ssot.requirements,
    gateOk: gate.ok,
    dryOk: dry.ok,
    helperOk,
    coverage: gateReport?.coverage || null,
    dryRun: { drivers: dryDrivers, skipped: drySkipped },
    errors: [
      ...(gate.ok ? [] : ['firmware-updates-gate failed']),
      ...(dry.ok ? [] : ['build-firmware-updates dry-run failed']),
      ...(helperOk ? [] : ['HomeyDeviceUpdates helper smoke failed']),
    ],
  };

  const stateDir = path.join(ROOT, '.github', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'homey-device-updates-verify.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('═══════════════════════════════════════════════');
    console.log('  Homey Device Updates verify (P2359)');
    console.log('═══════════════════════════════════════════════');
    console.log(`  Gate: ${report.gateOk ? 'OK' : 'FAIL'} | Dry-run: ${report.dryOk ? 'OK' : 'FAIL'} | Helper: ${report.helperOk ? 'OK' : 'FAIL'}`);
    if (report.coverage) {
      console.log(`  Coverage: ${report.coverage.coveragePct}% | OTA drivers: ${report.coverage.driversWithOta?.length || 0}`);
    }
    if (dryDrivers != null) console.log(`  Source detect: ${dryDrivers} safe / ${drySkipped} skipped`);
    if (report.errors.length) {
      for (const e of report.errors) console.log(`  ❌ ${e}`);
      process.exit(1);
    }
    console.log('  ✅ Device Updates coverage + detection + verification OK');
  }

  if (report.errors.length) process.exit(1);
}

main();
