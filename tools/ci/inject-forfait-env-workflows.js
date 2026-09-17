#!/usr/bin/env node
'use strict';

/**
 * P2562 — Inject forfait + local-learn env into ALL workflows (not only cron/AI).
 * Complementary: merges into existing top-level env; never wipes other keys.
 *
 *   node tools/ci/inject-forfait-env-workflows.js --dry-run
 *   node tools/ci/inject-forfait-env-workflows.js --apply
 *   node tools/ci/inject-forfait-env-workflows.js --apply --all
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows');
const APPLY = process.argv.includes('--apply');
const ALL = process.argv.includes('--all') || true; // P2562 default: every workflow

const INJECT = {
  AI_PLAN_MODE: 'forfait',
  AI_FORCE_LOCAL: 'true',
  AI_ALLOW_REMOTE: 'false',
  AI_ALLOW_PAID: 'false',
  AI_ENSEMBLE: 'false',
  AI_MAP_REDUCE: 'false',
  AI_FULL_CONTEXT: 'false',
  GMAIL_DIAG_AI_MAX: '0',
  // P2562 — local habit learning (energy + CI workflows)
  LOCAL_SMART_LEARN: 'true',
  LOCAL_ENERGY_LEARN: 'true',
};

function hasSchedule(yml) {
  return /schedule:\s*\n\s*-\s*cron:/m.test(yml) || /^\s*schedule:\s*$/m.test(yml);
}

function keyCorrect(yml, key, value) {
  return new RegExp(`${key}\\s*:\\s*['"]?${value}['"]?`, 'i').test(yml);
}

function missingKeys(yml) {
  return Object.entries(INJECT)
    .filter(([k, v]) => !keyCorrect(yml, k, v))
    .map(([k]) => k);
}

function needsInject(yml) {
  if (ALL) return missingKeys(yml).length > 0;
  const cron = hasSchedule(yml);
  const aiTouch = /ai-helper|callAI|OPENAI_API|OPENROUTER|GEMINI_API|ai-dp-extract/i.test(yml);
  if (!cron && !aiTouch) return false;
  return missingKeys(yml).length > 0;
}

function ensureTopLevelEnv(yml) {
  const jobsIdx = yml.search(/^jobs:\s*$/m);
  if (jobsIdx === -1) return yml;

  const head = yml.slice(0, jobsIdx);
  const tail = yml.slice(jobsIdx);
  const miss = missingKeys(yml);
  if (!miss.length) return yml;

  const addLines = miss.map((k) => `  ${k}: '${INJECT[k]}'`);

  const envMatch = head.match(/^env:\s*\n((?:[ \t]+.+\n)*)/m);
  if (envMatch) {
    let body = envMatch[1] || '';
    for (const k of miss) {
      body = body.replace(new RegExp(`^[ \\t]*${k}\\s*:.*\\n`, 'm'), '');
      body += `  ${k}: '${INJECT[k]}'\n`;
    }
    const newEnv = `env:\n${body}`;
    return `${head.replace(/^env:\s*\n((?:[ \t]+.+\n)*)/m, newEnv)}${tail}`;
  }

  return `${head.replace(/\s*$/, '\n')}# P2562 forfait + local-smart-learn (all workflows)\nenv:\n${addLines.join('\n')}\n\n${tail}`;
}

function main() {
  const files = fs.readdirSync(WF).filter((f) => f.endsWith('.yml'));
  const changed = [];
  for (const f of files) {
    const p = path.join(WF, f);
    const yml = fs.readFileSync(p, 'utf8');
    if (!needsInject(yml)) continue;
    const next = ensureTopLevelEnv(yml);
    if (next === yml) continue;
    changed.push({ file: f, added: missingKeys(yml) });
    if (APPLY) fs.writeFileSync(p, next);
  }
  console.log(`inject-forfait-env: ${APPLY ? 'APPLIED' : 'dry-run'} all=${ALL} changed=${changed.length}/${files.length}`);
  for (const c of changed.slice(0, 80)) {
    console.log(`  - ${c.file} (+${c.added.join(',')})`);
  }
}

main();
