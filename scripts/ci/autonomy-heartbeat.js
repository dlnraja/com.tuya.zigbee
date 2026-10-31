#!/usr/bin/env node
'use strict';
// P3097: checks that each core automation succeeded within its window (hours) and re-dispatches
// stale ones once. Publish workflows are reported only, never dispatched here (P3036 cap lives there).
const { execFileSync } = require('child_process');

const CORE = [
  // [workflow file, max hours since last success, dispatch allowed]
  ['fetch-diags.yml', 30, true],
  ['gmail-diagnostics.yml', 30, true],
  ['forum-poll.yml', 30, true],
  ['auto-enrich-closed-loop.yml', 30, true],
  ['recurrent-orchestrator.yml', 50, true],
  ['safe-sync-stable.yml', 50, true],
  ['bastien-promote-upstream.yml', 30, true],
  ['repo-autopilot.yml', 50, true],
  ['storage-cleanup.yml', 50, true],
  ['kb-refresh.yml', 24 * 9, true],
  ['homey-knowledge-refresh.yml', 24 * 9, true],
  ['version-health.yml', 24 * 5, true],
  ['publish-self-heal.yml', 30, false],
];

function gh(args) { return execFileSync('gh', args, { encoding: 'utf8' }); }

function lastSuccess(wf) {
  const out = gh(['run', 'list', '--workflow', wf, '--status', 'success', '--limit', '1', '--json', 'updatedAt']);
  const arr = JSON.parse(out || '[]');
  return arr.length ? new Date(arr[0].updatedAt) : null;
}

function main() {
  const now = Date.now();
  const lines = ['| workflow | last success (UTC) | age h | action |', '|---|---|---|---|'];
  let stale = 0;
  for (const [wf, maxH, canDispatch] of CORE) {
    let when = null; let action = 'ok';
    try { when = lastSuccess(wf); } catch (e) { action = 'list-error'; }
    const age = when ? (now - when.getTime()) / 3600000 : Infinity;
    if (action === 'ok' && age > maxH) {
      stale++;
      if (canDispatch) {
        try { gh(['workflow', 'run', wf]); action = 'stale -> re-dispatched'; } catch (e) { action = 'stale, dispatch failed'; }
      } else action = 'stale (publish: report only)';
    }
    lines.push(`| ${wf} | ${when ? when.toISOString() : 'never'} | ${Number.isFinite(age) ? age.toFixed(1) : '-'} | ${action} |`);
  }
  const md = `## Autonomy heartbeat\n\n${lines.join('\n')}\n\nStale: ${stale}\n`;
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) require('fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (require.main === module) main();
module.exports = { CORE };
