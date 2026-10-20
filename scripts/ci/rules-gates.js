#!/usr/bin/env node
'use strict';
/**
 * Shared rules-gate runner: one list, one runner, used by the `rules-gates` composite action
 * (.github/actions/rules-gates) and by scripts/ci/safe-auto-commit.js.
 *
 * WHY: the same 3–6 gate scripts were copy-pasted as separate steps in many workflows, each with
 * its own subset and order. Keeping the list here means a new rules gate is added once.
 *
 * Profiles:
 *   core — sacred-couple matrix, anti-bot, regression lessons, P214 protocol, flow titleFormatted args.
 *          Safe to run mid-pipeline (does not assume app.json is already rebuilt from compose).
 *   full — core + compose ↔ app.json fingerprint sync (run right before committing, after a sync).
 *
 * Usage: node scripts/ci/rules-gates.js [--profile=core|full] [--only=id,id] [--strip] [--soft]
 *   --strip  run the anti-bot gate with --strip (removes known bot regressions before checking)
 *   --soft   report failures as warnings, exit 0
 * Missing gate files are skipped (branches can lag), never fatal.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG_LINES = 200;

// Order matters: anti-bot first (it may strip), sacred-couple matrix second.
const RULES_GATES = [
  { id: 'anti-bot', file: 'tools/ci/anti-bot-regression-gate.js', profiles: ['core', 'full'] },
  { id: 'p2138', file: 'tools/ci/p2138-sacred-couple-matrix-gate.js', profiles: ['core', 'full'] },
  { id: 'regression-lessons', file: 'tools/ci/regression-lessons-gate.js', profiles: ['core', 'full'] },
  { id: 'p214', file: 'tools/ci/p214-intelligent-protocol-gate.js', profiles: ['core', 'full'] },
  { id: 'flow-title', file: 'tools/ci/flow-titleformatted-args-gate.js', profiles: ['core', 'full'] },
  // Spec 002 + 2026-10-11 rules: no new mandatory non-native cluster, one exact couple per driver;
  // also runs scripts/gates/init-non-native-guard.js and the dual-couple-legacy check.
  { id: 'native-matrix', file: 'scripts/gates/native-matrix-gate.js', profiles: ['core', 'full'] },
  { id: 'compose-sync', file: 'tools/ci/compose-appjson-fingerprint-sync-gate.js', profiles: ['full'] },
];

function select({ profile = 'core', only = '' } = {}) {
  const ids = String(only || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length) return RULES_GATES.filter((g) => ids.includes(g.id));
  return RULES_GATES.filter((g) => g.profiles.includes(profile));
}

function runGate(g, { strip = false, cwd = ROOT, timeout = 600000 } = {}) {
  const abs = path.join(cwd, g.file);
  if (!fs.existsSync(abs)) return { id: g.id, file: g.file, status: 'skipped', code: null, tail: 'missing on this branch' };
  const args = [abs];
  if (strip && g.id === 'anti-bot') args.push('--strip');
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  const tail = out.split('\n').slice(-8).join(' | ');
  // `log` keeps the last LOG_LINES lines so a failing gate shows as much as the old direct step did
  // (bounded so a noisy gate cannot flood the job log).
  const log = r.status === 0 ? '' : out.split('\n').slice(-LOG_LINES).join('\n');
  return { id: g.id, file: g.file, status: r.status === 0 ? 'pass' : 'fail', code: r.status, tail, log };
}

function main(argv = process.argv.slice(2)) {
  const opt = (k) => (argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
  const strip = argv.includes('--strip');
  const soft = argv.includes('--soft');
  const gates = select({ profile: opt('profile') || 'core', only: opt('only') });
  const results = gates.map((g) => {
    const r = runGate(g, { strip });
    console.log(`${r.status === 'pass' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌'} ${r.id} (${r.file})${r.status === 'fail' ? ` exit ${r.code}: ${r.tail}` : ''}`);
    if (r.status === 'fail' && r.log) {
      console.log(`::group::${r.id} output (last ${LOG_LINES} lines)`);
      console.log(r.log);
      console.log('::endgroup::');
    }
    return r;
  });
  const failed = results.filter((r) => r.status === 'fail');
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = ['### 🛡️ Rules gates', '', '| Gate | Result |', '|---|---|',
      ...results.map((r) => `| \`${r.id}\` | ${r.status}${r.code ? ` (exit ${r.code})` : ''} |`), ''];
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, rows.join('\n') + '\n'); } catch { /* best effort */ }
  }
  for (const f of failed) console.log(`::${soft ? 'warning' : 'error'}::rules gate ${f.id} failed (exit ${f.code})`);
  return failed.length && !soft ? 1 : 0;
}

module.exports = { RULES_GATES, LOG_LINES, select, runGate };
if (require.main === module) process.exitCode = main();
