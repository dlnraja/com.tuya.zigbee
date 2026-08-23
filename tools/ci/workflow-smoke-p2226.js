#!/usr/bin/env node
'use strict';

/**
 * workflow-smoke-p2226.js — parse + dry-run key workflows / scripts (P2226)
 * Does not call live Gmail without secrets. SHADOW forum.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

const WORKFLOWS = [
  '.github/workflows/project-resilience.yml',
  '.github/workflows/forum-poll.yml',
  '.github/workflows/auto-enrich-closed-loop.yml',
  '.github/workflows/fetch-diags.yml',
  '.github/workflows/gmail-diagnostics.yml',
  '.github/workflows/gmail-token-keepalive.yml',
];

function loadYaml(rel) {
  const yaml = require('js-yaml');
  const fp = path.join(ROOT, rel);
  const doc = yaml.load(fs.readFileSync(fp, 'utf8'));
  if (!doc || !doc.name) throw new Error(`invalid workflow: ${rel}`);
  if (!doc.defaults?.run?.shell) throw new Error(`missing defaults.run.shell: ${rel}`);
  if (!doc.permissions) throw new Error(`missing permissions: ${rel}`);
  return doc;
}

function runNode(rel, args = [], timeout = 120000) {
  const res = spawnSync(process.execPath, [path.join(ROOT, rel), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: {
      ...process.env,
      FORUM_AUTO_POST: '0',
      SHADOW_FORUM: '1',
      GMAIL_ALLOW_LOCAL_FALLBACK: '1',
    },
  });
  return { ok: res.status === 0, status: res.status, tail: `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-500) };
}

function main() {
  const results = { workflows: [], scripts: [], ok: true };
  console.log('[smoke] YAML workflows');
  for (const w of WORKFLOWS) {
    try {
      const doc = loadYaml(w);
      results.workflows.push({ file: w, ok: true, name: doc.name });
      console.log('  ✓', w, '→', doc.name);
    } catch (err) {
      results.workflows.push({ file: w, ok: false, error: err.message });
      results.ok = false;
      console.log('  ✗', w, err.message);
    }
  }

  const scripts = [
    ['tools/ci/inventory-features-bugs.js', ['--write-report']],
    ['tools/ci/project-resilience-orchestrator.js', ['--write-report', '--critical-first', '--critical-only']],
    ['.github/scripts/gmail-auth-cascade.js', ['--json']],
    ['tools/ci/ai-plan-guard.js', ['--preflight']],
  ];
  console.log('[smoke] scripts');
  for (const [script, args] of scripts) {
    if (!fs.existsSync(path.join(ROOT, script))) {
      results.scripts.push({ script, ok: false, error: 'missing' });
      results.ok = false;
      console.log('  ✗ missing', script);
      continue;
    }
    const r = runNode(script, args);
    results.scripts.push({ script, ok: r.ok, status: r.status });
    console.log(`  ${r.ok ? '✓' : '✗'}`, script, 'exit', r.status);
    if (!r.ok) results.ok = false;
  }

  const outDir = path.join(ROOT, 'reports', `workflow-smoke-${new Date().toISOString().slice(0, 10)}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'SMOKE.json'), `${JSON.stringify(results, null, 2)}\n`);
  console.log('[smoke]', results.ok ? 'PASS' : 'FAIL', outDir);
  process.exit(results.ok ? 0 : 2);
}

main();
