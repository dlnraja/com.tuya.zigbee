#!/usr/bin/env node
'use strict';

/**
 * P2562 — Gate: EVERY workflow forces local learn + forfait (no cloud AI).
 * Contre quoi: workflows without LOCAL_SMART_LEARN / AI_FORCE_LOCAL.
 *
 *   node tools/ci/p2562-local-workflow-learn-gate.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows');
const JSON_MODE = process.argv.includes('--json');

function envOk(yml, key, want) {
  return new RegExp(`${key}\\s*:\\s*['"]?${want}['"]?`, 'i').test(yml);
}

function main() {
  const files = fs.readdirSync(WF).filter((f) => f.endsWith('.yml'));
  const missing = [];
  for (const f of files) {
    const yml = fs.readFileSync(path.join(WF, f), 'utf8');
    const force = envOk(yml, 'AI_FORCE_LOCAL', 'true');
    const deny = envOk(yml, 'AI_ALLOW_REMOTE', 'false');
    const learn = envOk(yml, 'LOCAL_SMART_LEARN', 'true');
    const energy = envOk(yml, 'LOCAL_ENERGY_LEARN', 'true');
    if (!force || !deny || !learn || !energy) {
      missing.push({ file: f, force, deny, learn, energy });
    }
  }

  const paths = [
    'tools/ci/LocalWorkflowLearner.js',
    'tools/ci/local-workflow-learn.js',
    'lib/telemetry/LocalSmartEnergyLearner.js',
    'config/architecture/local-workflow-learn-ssot.json',
    'test/critical/p2562-local-workflow-learn.test.js',
  ];
  const missingPaths = paths.filter((p) => !fs.existsSync(path.join(ROOT, p)));

  const report = {
    patch: 'P2562',
    workflowCount: files.length,
    missingEnv: missing,
    missingPaths,
    ok: missing.length === 0 && missingPaths.length === 0,
  };

  if (JSON_MODE) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(`p2562-local-workflow-learn: workflows=${files.length} missingEnv=${missing.length}`);
    for (const m of missing.slice(0, 30)) console.log(`  - ${m.file}`);
    if (missingPaths.length) console.log('missing paths:', missingPaths.join(', '));
    console.log(report.ok ? 'PASS' : 'FAIL');
  }
  process.exit(report.ok ? 0 : 1);
}

main();
