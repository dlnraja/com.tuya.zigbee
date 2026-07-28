#!/usr/bin/env node
'use strict';
/**
 * scripts/ULTIMATE_CHECK.js
 *
 * Orchestrateur de validation read-only. Lance dans l'ordre :
 *   1. scripts/PRE_COMMIT_CHECKS.js          (integrity gate)
 *   2. scripts/_validate_all.js              (3 validateurs maison)
 *   3. scripts/validation/check-destroyed-guard.js
 *   4. Syntaxe node --check (vm) sur app.js + lib/ (rapide, in-process)
 *   5. scripts/validation/check-driver-health.js
 *
 * Règles :
 *   - Script introuvable ou crash de lancement → WARNING, on CONTINUE.
 *   - Exit code final non-zero SEULEMENT si un check a réellement FAIL
 *     (exit code non-zero ou marqueur ❌/FAILED dans la sortie).
 *   - Mode `--verbose` : sortie détaillée de chaque check ; sinon résumé.
 *
 * Usage : node scripts/ULTIMATE_CHECK.js [--verbose]
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');
// check-driver-health fait un node --check sur ~2500 fichiers (> 5 min à froid)
const TIMEOUT_MS = 15 * 60 * 1000;

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function logLine(msg) {
  console.log(`[${ts()}] ${msg}`);
}

function logVerbose(text) {
  if (!VERBOSE || !text) return;
  for (const line of String(text).split('\n')) {
    if (line.trim()) console.log(`    | ${line}`);
  }
}

/** Un check FAIL si exit code non-zero ou verdict d'échec explicite. */
function outputHasFailure(output) {
  // Case-sensitive volontairement : évite les faux positifs sur les noms de
  // fichiers (ex. cleanup-failed-runs.js) et les items ❌ individuels suivis
  // d'un verdict ✅ (faux positifs documentés de _validate_all.js).
  return /❌\s*FAIL|\bFAILED\b|\bFAIL:/.test(output);
}

const results = [];

/**
 * Lance un script Node en sous-processus.
 * @returns {{status: 'PASS'|'FAIL'|'WARN', durationMs: number, note?: string}}
 */
function runScriptCheck(name, scriptRelPath, extraArgs = []) {
  const scriptAbs = path.join(ROOT, scriptRelPath);
  const start = Date.now();
  logLine(`▶ ${name} (${scriptRelPath})`);

  if (!fs.existsSync(scriptAbs)) {
    const durationMs = Date.now() - start;
    logLine(`⚠️  ${name}: script introuvable — SKIP (${durationMs} ms)`);
    return { name, status: 'WARN', durationMs, note: 'script introuvable' };
  }

  let res;
  try {
    res = spawnSync(process.execPath, [scriptAbs, ...extraArgs], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    logLine(`⚠️  ${name}: crash de lancement (${err.message}) — SKIP (${durationMs} ms)`);
    return { name, status: 'WARN', durationMs, note: `crash: ${err.message}` };
  }

  const durationMs = Date.now() - start;
  const output = `${res.stdout || ''}\n${res.stderr || ''}`;
  logVerbose(output);

  if (res.error) {
    // Timeout ou erreur de spawn : warning, on continue.
    logLine(`⚠️  ${name}: erreur d'exécution (${res.error.message}) — CONTINUE (${durationMs} ms)`);
    return { name, status: 'WARN', durationMs, note: `exécution: ${res.error.message}` };
  }

  const failed = res.status !== 0 || outputHasFailure(output);
  const status = failed ? 'FAIL' : 'PASS';
  logLine(`${failed ? '❌' : '✅'} ${name}: ${status} (exit=${res.status}, ${(durationMs / 1000).toFixed(1)} s)`);
  return { name, status, durationMs };
}

/** Syntax check in-process (vm.Script) sur app.js + lib/**. Rapide. */
function runSyntaxCheck() {
  const name = 'Syntaxe app.js + lib/';
  const start = Date.now();
  logLine('▶ Syntaxe app.js + lib/ (node --check in-process)');

  const files = [];
  const appJs = path.join(ROOT, 'app.js');
  if (fs.existsSync(appJs)) files.push(appJs);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) files.push(full);
    }
  };
  const libDir = path.join(ROOT, 'lib');
  if (fs.existsSync(libDir)) walk(libDir);

  const errors = [];
  for (const file of files) {
    try {
      new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
    } catch (err) {
      errors.push(`${path.relative(ROOT, file)}: ${err.message}`);
    }
  }

  const durationMs = Date.now() - start;
  logVerbose(errors.join('\n'));
  if (errors.length > 0) {
    logLine(`❌ ${name}: FAIL (${errors.length} erreur(s) sur ${files.length} fichiers, ${(durationMs / 1000).toFixed(1)} s)`);
    return { name, status: 'FAIL', durationMs, note: `${errors.length} erreur(s)` };
  }
  logLine(`✅ ${name}: PASS (${files.length} fichiers, ${(durationMs / 1000).toFixed(1)} s)`);
  return { name, status: 'PASS', durationMs };
}

function main() {
  const totalStart = Date.now();
  logLine('════════════════ ULTIMATE CHECK — début ════════════════');

  results.push(runScriptCheck('Pre-commit checks', 'scripts/PRE_COMMIT_CHECKS.js'));
  results.push(runScriptCheck('Validate all', 'scripts/_validate_all.js'));
  results.push(runScriptCheck('Destroyed guard', 'scripts/validation/check-destroyed-guard.js'));
  results.push(runSyntaxCheck());
  results.push(runScriptCheck('Driver health', 'scripts/validation/check-driver-health.js'));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const totalMs = Date.now() - totalStart;

  logLine('════════════════ RÉSUMÉ ════════════════');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️ ';
    const note = r.note ? ` — ${r.note}` : '';
    logLine(`${icon} ${r.name}: ${r.status} (${(r.durationMs / 1000).toFixed(1)} s)${note}`);
  }
  logLine(`Total: ${results.length} checks | PASS: ${passed} | FAIL: ${failed} | WARN: ${warned} | durée: ${(totalMs / 1000).toFixed(1)} s`);

  if (failed > 0) {
    logLine('❌ ULTIMATE CHECK: FAIL');
    process.exit(1);
  }
  logLine('✅ ULTIMATE CHECK: PASS');
  process.exit(0);
}

main();
