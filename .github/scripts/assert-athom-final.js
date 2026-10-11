#!/usr/bin/env node
'use strict';
// WHY(2026-10-11): runs went GREEN while Athom ended processing_failed (#3506-#3511, every step
// continue-on-error). Final gate: read Athom's state for THIS version and fail the run unless it
// reached test/live. Bounded poll (ATHOM_FINAL_MAX_MS, default 10 min) while still processing.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OK = /^(test|live|approved)$/i;
const BAD = /^(processing_failed|failed|rejected|revoked)$/i;

function verdict(builds, version) {
  const mine = (builds || []).filter((b) => String(b.version) === String(version));
  if (!mine.length) {return { done: false, ok: false, reason: `no Athom build for v${version} yet` };}
  if (mine.some((b) => OK.test(String(b.state)))) {return { done: true, ok: true, reason: `v${version} in ${mine.find((b) => OK.test(String(b.state))).state}` };}
  if (mine.every((b) => BAD.test(String(b.state)))) {return { done: true, ok: false, reason: `v${version} ${mine.map((b) => `#${b.id} ${b.state}`).join(', ')}` };}
  return { done: false, ok: false, reason: `v${version} ${mine.map((b) => `#${b.id} ${b.state}`).join(', ')}` };
}

if (require.main === module) {
  const root = process.cwd();
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const version = process.env.HOMEY_EXPECTED_VERSION || app.version;
  const maxMs = Number(process.env.ATHOM_FINAL_MAX_MS || 600000);
  (async () => {
    const t0 = Date.now();
    let v = { done: false, ok: false, reason: 'status unavailable' };
    for (;;) {
      try {
        execFileSync('node', [path.join(root, 'scripts/ci/homey-build-status.js'), app.id], { stdio: 'ignore', timeout: 120000 });
        const s = JSON.parse(fs.readFileSync(path.join(root, 'data', 'status', `homey-build-status-${app.id}.json`), 'utf8'));
        v = verdict(s.builds, version);
      } catch (e) { v = { done: false, ok: false, reason: `status error: ${e.message}` }; }
      if (v.done || Date.now() - t0 > maxMs) {break;}
      await new Promise((r) => setTimeout(r, 30000));
    }
    const line = `[athom-final] ${v.ok ? 'OK' : 'NOT IN TEST'}: ${v.reason}`;
    console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY) {fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### ${line}\n`);}
    if (!v.ok) {console.log(`::error::${line}`); process.exit(1);}
  })();
}
module.exports = { verdict };
