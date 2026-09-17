#!/usr/bin/env node
'use strict';

/**
 * P2562 — CLI for LocalWorkflowLearner (all GHA workflows).
 *
 *   node tools/ci/local-workflow-learn.js --observe "Auto-Publish on Push" --ok=1 --ms=120000
 *   node tools/ci/local-workflow-learn.js --recommend auto-publish-on-push.yml
 *   node tools/ci/local-workflow-learn.js --snapshot
 *   node tools/ci/local-workflow-learn.js --from-env   # uses GITHUB_* env
 */

const path = require('path');
const LocalWorkflowLearner = require('./LocalWorkflowLearner');

const ROOT = path.resolve(__dirname, '..', '..');
const learner = new LocalWorkflowLearner({ root: ROOT });

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.slice(name.length + 3);
}

function has(flag) {
  return process.argv.includes(`--${flag}`);
}

function main() {
  if (has('snapshot')) {
    const snap = learner.snapshot();
    process.stdout.write(`${JSON.stringify(snap, null, 2)}\n`);
    return;
  }

  if (has('from-env')) {
    const name = process.env.GITHUB_WORKFLOW
      || process.env.GITHUB_WORKFLOW_REF
      || process.env.GITHUB_JOB
      || 'unknown';
    const conclusion = process.env.WORKFLOW_CONCLUSION
      || process.env.JOB_CONCLUSION
      || (process.env.GITHUB_ACTIONS ? 'unknown' : 'local');
    const ok = String(process.env.WORKFLOW_OK || '').toLowerCase();
    const ms = Number(process.env.WORKFLOW_DURATION_MS || 0) || undefined;
    const row = learner.observe(name, {
      ok: ok === '1' || ok === 'true' || conclusion === 'success',
      conclusion,
      durationMs: ms,
      extras: {
        runId: process.env.GITHUB_RUN_ID || null,
        sha: (process.env.GITHUB_SHA || '').slice(0, 12) || null,
        ref: process.env.GITHUB_REF_NAME || null,
      },
    });
    const rec = learner.recommend(name);
    process.stdout.write(`${JSON.stringify({ observed: row, recommend: rec }, null, 2)}\n`);
    return;
  }

  if (has('recommend') || arg('recommend')) {
    const id = arg('recommend') || arg('id') || process.argv[process.argv.indexOf('--recommend') + 1];
    const rec = learner.recommend(id);
    process.stdout.write(`${JSON.stringify(rec, null, 2)}\n`);
    // Soft exit codes for CI soft-skip decisions (never hard-fail by default)
    if (has('exit-hint') && rec.action === 'soft_skip_or_heal') process.exit(2);
    return;
  }

  const id = arg('observe') || arg('id');
  if (id || has('observe')) {
    const okRaw = arg('ok', '1');
    const ms = Number(arg('ms', '0')) || undefined;
    const conclusion = arg('conclusion', okRaw === '1' || okRaw === 'true' ? 'success' : 'failure');
    const row = learner.observe(id || 'unknown', {
      ok: okRaw === '1' || okRaw === 'true',
      conclusion,
      durationMs: ms,
    });
    process.stdout.write(`${JSON.stringify({ observed: row, recommend: learner.recommend(id || 'unknown') }, null, 2)}\n`);
    return;
  }

  console.log('Usage: --observe <id> --ok=0|1 [--ms=N] | --recommend <id> | --snapshot | --from-env');
  process.exit(1);
}

main();
