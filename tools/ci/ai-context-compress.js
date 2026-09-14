#!/usr/bin/env node
'use strict';

/**
 * P2491 — Smart AI / bot context compression
 *
 * WHY: GHA bots were shipping ~59KB rules on every remote AI call.
 * Contre quoi: forfait + GH API burn; prefer pointers + signal lines.
 *
 *   const { compressUserText, buildSlimSystemPrompt, loadCompressSsot } = require('./ai-context-compress');
 *   node tools/ci/ai-context-compress.js --self-test
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SSOT = path.join(ROOT, 'config', 'security', 'ai-context-compress-ssot.json');
const SMART_MAP = path.join(ROOT, 'config', 'architecture', 'project-smart-map.json');

function loadJson(fp, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadCompressSsot() {
  return loadJson(SSOT, {});
}

function loadSmartMap() {
  return loadJson(SMART_MAP, {});
}

function envFlag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return /^(1|true|yes)$/i.test(String(v));
}

function envInt(name, fallback) {
  const n = parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Keep sacred couples, UUIDs, crash signals; drop secret-ish / empty noise.
 */
function compressUserText(text, opts = {}) {
  const ssot = opts.ssot || loadCompressSsot();
  const maxChars = opts.maxChars
    || envInt('AI_USER_MAX_CHARS', Number(ssot.defaults?.AI_USER_MAX_CHARS || 6000));
  const raw = String(text || '');
  if (raw.length <= maxChars && !opts.force) {
    // Still strip secrets even when short
  }

  const drop = (ssot.compress?.dropLinePatterns || []).map((p) => {
    try { return new RegExp(p, 'i'); } catch { return null; }
  }).filter(Boolean);

  const prefer = (ssot.compress?.preferLinesWith || []).map((s) => String(s).toLowerCase());
  const keepRe = (ssot.compress?.keepPatterns || []).map((p) => {
    try { return new RegExp(p, 'gi'); } catch { return null; }
  }).filter(Boolean);

  const lines = raw.split(/\r?\n/);
  const kept = [];
  const signals = [];

  for (const line of lines) {
    if (drop.some((re) => re.test(line))) continue;
    const low = line.toLowerCase();
    const isPrefer = prefer.some((p) => low.includes(p));
    const isKeep = keepRe.some((re) => {
      re.lastIndex = 0;
      return re.test(line);
    });
    if (isPrefer || isKeep) {
      signals.push(line);
    } else if (line.trim().length > 0) {
      kept.push(line);
    }
  }

  // Prefer signal lines first, then fill with remaining until budget
  const ordered = [...signals, ...kept.filter((l) => !signals.includes(l))];
  let out = ordered.join('\n');

  // Extract unique FP/PID headers even if truncated
  const fps = [...new Set((raw.match(/_TZ[A-Z0-9]+_[a-z0-9]+/gi) || []).map((x) => x))];
  const pids = [...new Set(raw.match(/\bTS[0-9]{4}[A-Z]?\b/g) || [])];
  const header = [];
  if (fps.length) header.push(`FPS: ${fps.slice(0, 12).join(', ')}`);
  if (pids.length) header.push(`PIDS: ${pids.slice(0, 8).join(', ')}`);

  if (out.length > maxChars) {
    out = out.slice(0, maxChars) + '\n…[compressed]';
  }

  const prefixed = header.length ? `${header.join('\n')}\n---\n${out}` : out;
  return prefixed.length > maxChars + 200
    ? prefixed.slice(0, maxChars + 200) + '\n…[compressed]'
    : prefixed;
}

/**
 * Slim system prompt from project-smart-map (default).
 * Full LOADED_RULES only when AI_FULL_CONTEXT=1.
 */
function buildSlimSystemPrompt(baseRules, opts = {}) {
  const ssot = opts.ssot || loadCompressSsot();
  const map = opts.map || loadSmartMap();
  const maxSys = opts.maxChars
    || envInt('AI_SYS_MAX_CHARS', Number(ssot.defaults?.AI_SYS_MAX_CHARS || 4500));
  const full = envFlag('AI_FULL_CONTEXT', false) || opts.fullContext === true;

  if (full && opts.loadedRules) {
    const blob = `${baseRules || ''}\n\n${opts.architecture || ''}\n\n${opts.loadedRules}`;
    return blob.length > maxSys * 4 ? blob.slice(0, maxSys * 4) + '\n…[truncated-full]' : blob;
  }

  const mapJson = JSON.stringify({
    tip: map.tip,
    dualApp: map.dualApp,
    identity: map.identity,
    truth: map.truth,
    publish: map.publish?.ssot,
    forum: map.forum?.policy,
    ai: map.aiEfficiency?.default,
    gates: map.gates,
    localSolver: map.localSolver,
  }, null, 0);

  const core = String(baseRules || '').slice(0, Math.min(3200, maxSys - 800));
  const slim = [
    '## Project smart map (P2491 — pointers only)',
    mapJson,
    '',
    '## Core rules (compressed)',
    core,
    '',
    '## Hard constraints',
    '- Sacred couple = mfr+pid; never invent pid',
    '- Forum SHADOW only; never POST',
    '- Prefer local-intelligent-solver over remote AI',
    '- Classify BOTH|MASTER_ONLY|STABLE_ONLY before patch',
  ].join('\n');

  return slim.length > maxSys ? slim.slice(0, maxSys) + '\n…[sys-compressed]' : slim;
}

function remoteAiAllowed(opts = {}) {
  if (opts.forceAI === true) return true;
  if (envFlag('AI_FORCE_LOCAL', true)) return false;
  if (envFlag('SKIP_AI', false) || envFlag('AI_SKIP', false)) return false;
  if (!envFlag('AI_ALLOW_REMOTE', false)) return false;
  return true;
}

function ensembleAllowed() {
  return envFlag('AI_ENSEMBLE', false);
}

function defaultMaxTokens() {
  const ssot = loadCompressSsot();
  return envInt('AI_MAX_TOKENS_DEFAULT', Number(ssot.defaults?.AI_MAX_TOKENS_DEFAULT || 800));
}

function selfTest() {
  const sample = [
    'User diag garbage',
    'networkKey: SECRET_SHOULD_DROP',
    'Authorization: Bearer abc',
    'Error: capability_id_not_available_on_device',
    'mfr=_TZ3000_mrpevh8p pid=TS0041',
    'Driver Not Initialized: motionsensor',
    'lorem ipsum '.repeat(500),
  ].join('\n');

  const out = compressUserText(sample, { maxChars: 800 });
  const sys = buildSlimSystemPrompt('Core project rules short.', { maxChars: 2000 });
  const checks = [
    !/SECRET_SHOULD_DROP/i.test(out),
    !/Bearer abc/i.test(out),
    /mrpevh8p/i.test(out),
    /TS0041/.test(out),
    /capability_id_not_available/.test(out),
    /project-smart-map|smart map/i.test(sys) || /P2491/.test(sys),
    sys.length < 4500,
    !remoteAiAllowed({}),
  ];
  const ok = checks.every(Boolean);
  console.log(ok ? 'P2491 ai-context-compress self-test OK' : 'P2491 FAIL');
  console.log(JSON.stringify({
    userChars: out.length,
    sysChars: sys.length,
    remoteDefault: remoteAiAllowed({}),
    ensembleDefault: ensembleAllowed(),
  }));
  if (!ok) process.exit(1);
}

module.exports = {
  loadCompressSsot,
  loadSmartMap,
  compressUserText,
  buildSlimSystemPrompt,
  remoteAiAllowed,
  ensembleAllowed,
  defaultMaxTokens,
  envFlag,
};

if (require.main === module) {
  if (process.argv.includes('--self-test') || process.argv.includes('--json')) {
    selfTest();
  } else {
    console.log('Usage: node tools/ci/ai-context-compress.js --self-test');
  }
}
