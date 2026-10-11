#!/usr/bin/env node
'use strict';
// WHY(2026-10-11): #3507/#3508 "invalid_state" happened when a build of the same app was still
// processing while another run uploaded (master + probes overlapped). Before any upload, poll Athom
// (read-only, scripts/ci/homey-build-status.js) until no recent build is in a non-final state.
// Bounded: ATHOM_IDLE_MAX_MS (default 15 min). Never fails the job: on timeout it warns and continues,
// and writes athom_idle=true|false to GITHUB_OUTPUT so invalid_state retries only follow a real wait.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const appId = process.argv[2] || JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).id;
const maxMs = Number(process.env.ATHOM_IDLE_MAX_MS || 12 * 60 * 1000); // step timeout 25 min: polls themselves can take ~2 min (G1 run 38101398363 was cancelled at 17)
const stepMs = Number(process.env.ATHOM_IDLE_STEP_MS || 30 * 1000);

// WHY(2026-10-11): #3512 sat in waiting_for_files forever after a hung CLI upload. Older than
// STUCK_MS (default 5 min) it will never progress: treat it as final/failed.
const STUCK_MS = Number(process.env.ATHOM_STUCK_MS || 5 * 60 * 1000);
function isStuck(b, now = Date.now()) {
  if (String(b && b.state) !== 'waiting_for_files') {return false;}
  const t = Date.parse(b.stateChangedAt || b.createdAt || b.at || '');
  return Number.isFinite(t) && now - t > STUCK_MS;
}

const FINAL = /^(test|live|draft|processing_failed|revoked|failed|rejected|approved)$/i;

function busyBuilds() {
  try {
    execFileSync('node', [path.join(ROOT, 'scripts/ci/homey-build-status.js'), appId], { stdio: 'ignore', timeout: 120000 });
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', `homey-build-status-${appId}.json`), 'utf8'));
    if (s.pat && s.pat !== 'valid') return null;
    return (s.builds || []).slice(0, 5).filter((b) => b && b.state && !FINAL.test(String(b.state)) && !isStuck(b));
  } catch (_e) { return null; }
}

function decide(builds) { return Array.isArray(builds) && builds.length === 0; }

if (require.main === module) {
  (async () => {
    const t0 = Date.now();
    let idle = false;
    for (;;) {
      const busy = busyBuilds();
      if (busy === null) { console.log('[athom-idle] status unavailable; continuing (not counted as idle)'); break; }
      if (decide(busy)) { idle = true; console.log(`[athom-idle] ${appId} idle after ${Math.round((Date.now() - t0) / 1000)}s`); break; }
      console.log(`[athom-idle] waiting: ${busy.map((b) => `#${b.id} v${b.version} ${b.state}`).join(', ')}`);
      if (Date.now() - t0 + stepMs > maxMs) { console.log(`::warning::[athom-idle] still busy after ${maxMs / 1000}s; continuing`); break; }
      await new Promise((r) => setTimeout(r, stepMs));
    }
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `athom_idle=${idle}\n`);
    if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `ATHOM_IDLE_WAITED=${idle}\n`);
  })();
}
module.exports = { decide, FINAL, isStuck };
