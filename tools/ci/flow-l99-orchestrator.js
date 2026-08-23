#!/usr/bin/env node
'use strict';

/**
 * flow-l99-orchestrator.js — Ship F
 * Aggregates existing flow gates into one report (CI only — not Homey bundle).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `flow-l99-${DATE}`);

function run(label, cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: true, timeout: 180000 });
  return {
    label,
    ok: r.status === 0,
    status: r.status,
    stdout: (r.stdout || '').slice(-4000),
    stderr: (r.stderr || '').slice(-2000),
  };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const steps = [
    run('flow-dups', 'node', ['tools/ci/flow-card-dup-gate.js']),
    run('flows-integrity', 'node', ['scripts/validation/verify_flows_integrity.js']),
    run('flow-coherence', 'node', ['tools/ci/flow-coherence-audit.js']),
    run('voice-safety', 'node', ['scripts/validation/check-google-assistant-voice-safety.js']),
  ];

  const fail = steps.filter((s) => !s.ok);
  const summary = {
    generatedAt: new Date().toISOString(),
    outDir: OUT_DIR,
    steps: steps.map((s) => ({ label: s.label, ok: s.ok, status: s.status })),
    failCount: fail.length,
  };

  const md = [
    `# Flow + L99 audit — ${DATE}`,
    '',
    `Failing steps: **${fail.length}** / ${steps.length}`,
    '',
    '| Step | OK |',
    '|------|----|',
    ...steps.map((s) => `| ${s.label} | ${s.ok ? 'yes' : 'NO'} |`),
    '',
    '## Notes',
    '',
    '- Runtime heuristics: `lib/flow/FlowCardHeuristics.js` (no invented `*_1gang_button_pressed`).',
    '- Physical pattern: `{driver}_physical_gang{N}_{on|off}`.',
    '- Memory: do not preload all flow compose into Homey heap — this audit is CI-only.',
    '',
  ];

  for (const s of steps) {
    md.push(`### ${s.label}`, '', '```', (s.stdout || s.stderr || '(no output)').slice(-1500), '```', '');
    fs.writeFileSync(path.join(OUT_DIR, `${s.label}.log`), `${s.stdout}\n${s.stderr}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'FLOW_AUDIT.md'), md.join('\n'));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(fail.length ? 1 : 0);
}

main();
