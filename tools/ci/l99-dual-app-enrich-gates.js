#!/usr/bin/env node
'use strict';

/**
 * L99 dual-app enrich gates — regular CI enrichment
 *
 * WHY: Two apps (master 9.0 / Universal Tuya vs stable 5.12 / .stable).
 * Run BOTH reliability gates always; MASTER_ONLY feature gates when on master
 * (or FORCE_MASTER_GATES=1). Soft by default in enrich; --hard fails CI.
 *
 * Usage:
 *   node tools/ci/l99-dual-app-enrich-gates.js
 *   node tools/ci/l99-dual-app-enrich-gates.js --hard
 *   node tools/ci/l99-dual-app-enrich-gates.js --track=master|stable|auto
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SSOT = path.join(ROOT, 'config', 'architecture', 'dual-app-tracks.json');

const HARD = process.argv.includes('--hard');
const trackArg = (process.argv.find((a) => a.startsWith('--track=')) || '').split('=')[1] || 'auto';

function loadTracks() {
  try {
    return JSON.parse(fs.readFileSync(SSOT));
  } catch {
    return { tracks: {} };
  }
}

function detectTrack() {
  if (trackArg === 'master' || trackArg === 'stable') {return trackArg;}
  try {
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose', 'app.json')));
    const id = compose.id || '';
    if (id.endsWith('.stable')) {return 'stable';}
    if (id === 'com.dlnraja.tuya.zigbee') {return 'master';}
  } catch (e) { /* fall through */ }
  const ref = process.env.GITHUB_REF_NAME || '';
  if (ref === 'stable-v5' || ref.startsWith('stable')) {return 'stable';}
  return 'master';
}

function runNode(relScript, args = []) {
  const script = path.join(ROOT, relScript);
  if (!fs.existsSync(script)) {
    return { ok: true, skipped: true, name: relScript, detail: 'missing' };
  }
  const isTest = /[\\/]test[\\/]/.test(relScript) || /\.test\.js$/.test(relScript);
  const argv = isTest ? ['--test', script, ...args] : [script, ...args];
  const r = spawnSync(process.execPath, argv, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  const ok = r.status === 0;
  return {
    ok,
    skipped: false,
    name: relScript + (args.length ? ` ${args.join(' ')}` : ''),
    detail: out.split('\n').slice(-3).join(' | ').slice(0, 240),
    status: r.status,
  };
}

function runNpm(script) {
  const r = spawnSync('npm', ['run', script, '--silent'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    timeout: 120000,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  return {
    ok: r.status === 0,
    skipped: false,
    name: `npm run ${script}`,
    detail: out.split('\n').slice(-2).join(' | ').slice(0, 240),
    status: r.status,
  };
}

const track = detectTrack();
const tracks = loadTracks();
const meta = tracks.tracks?.[track] || {};
const forceMaster = process.env.FORCE_MASTER_GATES === '1';

console.log(`l99-dual-app-enrich-gates: track=${track} appId=${meta.appId || '?'} hard=${HARD}`);

/** BOTH — reliability / schema / brand scrub (every branch) */
const BOTH = [
  () => runNode('tools/ci/energy-compose-gate.js'),
  () => runNode('tools/ci/adaptive-double-division-gate.js'),
  () => runNode('scripts/validation/check-energy-divisor.js'),
  () => runNode('tools/ci/smart-features-brand-scrub-gate.js'),
  () => runNode('test/critical/l99-energy-jump-divisor.test.js'),
];

/** MASTER_ONLY — feature / daylight / infra (master soak) */
const MASTER_ONLY = [
  () => runNode('test/critical/l99-daylight-atmosphere.test.js'),
  () => runNode('test/hue-smart-features.test.js'),
  () => {
    if (fs.existsSync(path.join(ROOT, 'tools/ci/flow-l99-orchestrator.js'))) {
      return runNode('tools/ci/flow-l99-orchestrator.js');
    }
    return { ok: true, skipped: true, name: 'flow-l99-orchestrator', detail: 'missing' };
  },
];

const results = [];
for (const fn of BOTH) {
  results.push({ tag: 'BOTH', ...fn() });
}

if (track === 'master' || forceMaster) {
  for (const fn of MASTER_ONLY) {
    results.push({ tag: 'MASTER_ONLY', ...fn() });
  }
} else {
  console.log('l99-dual: skipping MASTER_ONLY feature gates on stable track (purpose=reliability)');
}

const failed = results.filter((r) => !r.skipped && !r.ok);
const reportDir = path.join(ROOT, 'reports', `l99-dual-${new Date().toISOString().slice(0, 10)}`);
try {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'enrich-gates.json'), JSON.stringify({
    at: new Date().toISOString(),
    track,
    appId: meta.appId || null,
    hard: HARD,
    results,
    classification: tracks.l99RecentClassification || {},
  }, null, 2));
} catch { /* optional */ }

console.log('---');
for (const r of results) {
  const mark = r.skipped ? 'SKIP' : (r.ok ? 'OK' : 'FAIL');
  console.log(`[${r.tag}] ${mark} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
}

if (failed.length) {
  console.error(`l99-dual-app-enrich-gates: ${failed.length} failure(s)`);
  if (HARD) {process.exit(1);}
  console.error('(soft mode — enrich continues; use --hard on unified-ci)');
  process.exit(0);
}

console.log('l99-dual-app-enrich-gates: all green');
process.exit(0);
