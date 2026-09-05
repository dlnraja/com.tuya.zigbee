#!/usr/bin/env node
'use strict';

/**
 * sacred-couple-dry-gate.js
 *
 * Best-effort dry-run of sacred-couple / FP apply scripts.
 * Never passes --apply. Missing scripts or missing input artifacts are skips.
 *
 * Usage:
 *   node tools/ci/sacred-couple-dry-gate.js
 *   node tools/ci/sacred-couple-dry-gate.js --json
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const JSON_MODE = process.argv.includes('--json');
const STATE_OUT = path.join(ROOT, '.github', 'state', 'sacred-couple-dry-gate.json');

const JOBS = [
  {
    id: 'p101-lot2',
    script: 'tools/ci/apply-p101-sacred-lot2.js',
    args: [],
  },
  {
    id: 'blakadder-new',
    script: 'tools/ci/apply-blakadder-new.js',
    args: [],
    optionalInput: '.github/state/blakadder/blakadder-only.json',
  },
  {
    id: 'issue-439',
    script: 'tools/ci/apply-issue-439-fps.js',
    args: [],
    // Prefer state artifact when present; script itself also soft-falls back (P204)
    optionalInput: null,
  },
  {
    id: 'canonical-gaps',
    script: 'tools/ci/apply-canonical-gaps-final.js',
    args: ['--dry'],
    optionalInput: '.github/state/mfr-pid-cross-ref.json',
  },
];

function runJob(job) {
  const abs = path.join(ROOT, job.script);
  if (!fs.existsSync(abs)) {
    return { id: job.id, status: 'skip', reason: 'script_missing' };
  }
  if (job.optionalInput) {
    const input = path.join(ROOT, job.optionalInput);
    if (!fs.existsSync(input)) {
      return { id: job.id, status: 'skip', reason: 'input_missing', input: job.optionalInput };
    }
  }
  const result = spawnSync(process.execPath, [abs, ...job.args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
    env: process.env,
  });
  const status = result.status === 0 ? 'ok' : 'error';
  return {
    id: job.id,
    status,
    exitCode: result.status,
    signal: result.signal || null,
    stdoutTail: String(result.stdout || '').slice(-800),
    stderrTail: String(result.stderr || '').slice(-400),
  };
}

function main() {
  const results = JOBS.map(runJob);
  const summary = {
    timestamp: new Date().toISOString(),
    mode: 'dry-run',
    results,
    ok: results.every((r) => r.status === 'ok' || r.status === 'skip'),
  };

  try {
    fs.mkdirSync(path.dirname(STATE_OUT), { recursive: true });
    fs.writeFileSync(STATE_OUT, JSON.stringify(summary, null, 2));
  } catch (e) {
    console.warn('[sacred-couple-dry-gate] could not write state:', e.message);
  }

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(summary) + '\n');
  } else {
    console.log('[sacred-couple-dry-gate] dry-run apply scripts');
    for (const r of results) {
      console.log(`  - ${r.id}: ${r.status}${r.reason ? ` (${r.reason})` : ''}`);
    }
  }

  // Best-effort gate: never hard-fail the pipeline on dry-run skips/errors.
  process.exit(0);
}

main();
