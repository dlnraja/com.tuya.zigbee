#!/usr/bin/env node
'use strict';

/**
 * harden-wifi-local.js (P2367)
 * WiFi local-first hardening orchestrator:
 * 1. wifi-local-first-gate (compose/settings)
 * 2. UDP discovery key parity tests
 * 3. QuirkRegistry + WiFiDPRegistry smoke
 *
 * Usage:
 *   node tools/ci/harden-wifi-local.js
 *   node tools/ci/harden-wifi-local.js --apply
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'reports', 'wifi-local-harden-latest.json');

function runNode(args, label) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  return { label, ok: r.status === 0, status: r.status, tail: (r.stdout || r.stderr || '').slice(-800) };
}

function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    phases: [],
  };

  report.phases.push(runNode(['tools/ci/wifi-local-first-gate.js'], 'wifi-local-first-gate'));
  report.phases.push(runNode(['--test', 'test/critical/wifi-local-first-resolver.test.js'], 'wifi-local-first-resolver'));
  report.phases.push(runNode(['--test', 'test/critical/p2367-wifi-local-harden.test.js'], 'p2367-wifi-local-harden'));

  const failed = report.phases.filter((p) => !p.ok);
  report.pass = failed.length === 0;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('=== harden-wifi-local (P2367) ===');
  for (const p of report.phases) {
    console.log(p.ok ? `  ✓ ${p.label}` : `  ✗ ${p.label} (exit ${p.status})`);
  }
  console.log(`Report: ${OUT}`);
  process.exit(report.pass ? 0 : 1);
}

main();
