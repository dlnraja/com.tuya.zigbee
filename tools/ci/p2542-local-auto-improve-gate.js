#!/usr/bin/env node
'use strict';

/**
 * P2542 — Gate: cron/automation workflows must force local AI forfait.
 * Contre quoi: remote AI / paid overage / missing SHADOW forum defaults on harvests.
 *
 *   node tools/ci/p2542-local-auto-improve-gate.js
 *   node tools/ci/p2542-local-auto-improve-gate.js --json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows');
const SSOT = path.join(ROOT, 'config', 'architecture', 'local-auto-improve-ssot.json');
const JSON_MODE = process.argv.includes('--json');

const REQUIRED = [
  'AI_FORCE_LOCAL',
  'AI_ALLOW_REMOTE',
  'GMAIL_DIAG_AI_MAX',
];

function hasSchedule(yml) {
  return /^\s*schedule:\s*$/m.test(yml) || /schedule:\s*\n\s*-\s*cron:/m.test(yml);
}

function envTruthy(yml, key, want) {
  // Match top-level or job env assignments
  const re = new RegExp(`${key}\\s*:\\s*['"]?${want}['"]?`, 'i');
  return re.test(yml);
}

function main() {
  const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  const files = fs.readdirSync(WF).filter((f) => f.endsWith('.yml'));
  const cronMissing = [];
  const aiTouchingMissing = [];
  let cronCount = 0;

  for (const f of files) {
    const yml = fs.readFileSync(path.join(WF, f), 'utf8');
    const cron = hasSchedule(yml);
    const aiTouch = /ai-helper|callAI|OPENAI_API|OPENROUTER|GEMINI_API|ai-dp-extract/i.test(yml);
    if (cron) cronCount += 1;

    const force = envTruthy(yml, 'AI_FORCE_LOCAL', 'true');
    const denyRemote = envTruthy(yml, 'AI_ALLOW_REMOTE', 'false');
    const gmail0 = envTruthy(yml, 'GMAIL_DIAG_AI_MAX', '0');

    if (cron && (!force || !denyRemote || !gmail0)) {
      cronMissing.push({
        file: f,
        force,
        denyRemote,
        gmail0,
      });
    }
    if (aiTouch && (!force || !denyRemote)) {
      aiTouchingMissing.push({ file: f, force, denyRemote });
    }
  }

  // Required local artifacts
  const paths = [
    ssot.localPaths.orchestrator,
    ssot.localPaths.solver,
    ssot.localPaths.compress,
    'docs/architecture/LOCAL_AUTO_IMPROVE_SSOT.md',
    'test/critical/p2542-local-auto-improve.test.js',
  ];
  const missingPaths = paths.filter((p) => !fs.existsSync(path.join(ROOT, p)));

  const report = {
    patch: 'P2542',
    cronCount,
    cronMissing,
    aiTouchingMissing,
    missingPaths,
    requiredEnv: REQUIRED,
    ok: cronMissing.length === 0 && aiTouchingMissing.length === 0 && missingPaths.length === 0,
  };

  if (JSON_MODE) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(`p2542-local-auto-improve-gate: cron=${cronCount} missingCronEnv=${cronMissing.length} missingAiEnv=${aiTouchingMissing.length}`);
    if (cronMissing.length) {
      console.log('cron missing forfait env:');
      for (const c of cronMissing.slice(0, 25)) console.log(`  - ${c.file}`);
    }
    if (aiTouchingMissing.length) {
      console.log('AI-touching missing guards:');
      for (const c of aiTouchingMissing) console.log(`  - ${c.file}`);
    }
    if (missingPaths.length) {
      console.log('missing paths:', missingPaths.join(', '));
    }
    console.log(report.ok ? 'PASS' : 'FAIL');
  }

  process.exit(report.ok ? 0 : 1);
}

main();
