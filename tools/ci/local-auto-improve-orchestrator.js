#!/usr/bin/env node
'use strict';

/**
 * P2542 — Local auto-improve orchestrator (ZERO remote AI).
 * WHY: Crons/agents must self-heal enrichments with heuristics only — forfait safe.
 *
 *   node tools/ci/local-auto-improve-orchestrator.js
 *   node tools/ci/local-auto-improve-orchestrator.js --quick
 *   node tools/ci/local-auto-improve-orchestrator.js --json
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const QUICK = process.argv.includes('--quick');
const JSON_MODE = process.argv.includes('--json');
const APPLY = process.argv.includes('--apply');

function runNode(rel, args = [], { soft = true } = {}) {
  const script = path.join(ROOT, rel);
  if (!fs.existsSync(script)) {
    return { ok: false, skipped: true, reason: 'missing', rel };
  }
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      AI_FORCE_LOCAL: 'true',
      AI_ALLOW_REMOTE: 'false',
      AI_ALLOW_PAID: 'false',
      AI_PLAN_MODE: 'forfait',
      AI_ENSEMBLE: 'false',
      AI_MAP_REDUCE: 'false',
      AI_FULL_CONTEXT: 'false',
      GMAIL_DIAG_AI_MAX: '0',
      LOCAL_SMART_LEARN: 'true',
      LOCAL_ENERGY_LEARN: 'true',
      FORUM_AUTO_POST: '0',
      SHADOW_FORUM: '1',
    },
    timeout: QUICK ? 120000 : 300000,
  });
  const ok = r.status === 0;
  if (!ok && !soft) {
    throw new Error(`${rel} failed: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
  }
  return {
    ok,
    skipped: false,
    rel,
    status: r.status,
    outTail: String(r.stdout || r.stderr || '').split('\n').slice(-8).join('\n'),
  };
}

function main() {
  const steps = [
    { rel: 'tools/ci/ai-plan-guard.js', args: ['--preflight'], soft: true },
    { rel: 'tools/ci/ai-context-compress.js', args: ['--self-test'], soft: false },
    { rel: 'tools/ci/local-intelligent-solver.js', args: [], soft: true },
    // P2562: local habit learn for workflows (observe this orchestrator run)
    {
      rel: 'tools/ci/local-workflow-learn.js',
      args: [
        '--observe=local-auto-improve-orchestrator',
        '--ok=1',
        `--ms=${QUICK ? 60000 : 180000}`,
      ],
      soft: true,
    },
    { rel: 'tools/ci/prune-fp-collision-bleed.js', args: ['--check'], soft: true },
    {
      rel: 'tools/ci/align-mfs-db-intelligent.js',
      args: APPLY ? ['--apply'] : ['--check'],
      soft: true,
    },
    { rel: 'tools/ci/p2520-complementary-variant-enrich-gate.js', args: [], soft: true },
    { rel: 'tools/ci/l99-dual-app-enrich-gates.js', args: ['--track=auto'], soft: true },
  ];

  if (!QUICK) {
    steps.push(
      { rel: 'tools/ci/case-variant-fixer.js', args: APPLY ? ['--apply'] : [], soft: true },
      { rel: 'tools/ci/discovery-lineage-enrich-gate.js', args: [], soft: true },
      { rel: 'tools/ci/battery-button-intelligence-gate.js', args: [], soft: true },
    );
  }

  const results = [];
  for (const s of steps) {
    try {
      results.push(runNode(s.rel, s.args, { soft: s.soft !== false }));
    } catch (e) {
      results.push({ ok: false, rel: s.rel, error: String(e.message || e) });
      if (s.soft === false) break;
    }
  }

  const summary = {
    patch: 'P2542',
    mode: 'local-only',
    quick: QUICK,
    apply: APPLY,
    ok: results.every((r) => r.ok || r.skipped),
    hardOk: results.filter((r) => r.rel.includes('ai-context-compress')).every((r) => r.ok),
    results,
    ts: new Date().toISOString(),
  };

  const outDir = path.join(ROOT, 'reports', 'local-auto-improve-latest');
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`);
  } catch { /* ignore */ }

  if (JSON_MODE) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    console.log(`local-auto-improve: hardOk=${summary.hardOk} steps=${results.length} quick=${QUICK}`);
    for (const r of results) {
      const tag = r.skipped ? 'skip' : r.ok ? 'ok' : 'warn';
      console.log(`  [${tag}] ${r.rel}${r.error ? ` — ${r.error}` : ''}`);
    }
  }

  process.exit(summary.hardOk ? 0 : 1);
}

main();
