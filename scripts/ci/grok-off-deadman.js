#!/usr/bin/env node
'use strict';
// P3111 (01/11/2026 Paris, t673u): dead-man switch for "Grok Bot unplugged" mode.
// Weekly: every scheduled autonomous workflow listed below must have succeeded within its window.
// If any is stale, ONE issue (title DEADMAN_TITLE) is created or edited in place; when all are healthy
// again the issue is closed with a comment. Read-only on code: never dispatches, never publishes,
// never posts outside this repo. Kill switch: config/autonomy-paused or config/autonomy-paused.watch.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DEADMAN_TITLE = 'Dead-man: autonomous workflow stale (Grok-off readiness)';
const DEADMAN_LABEL = 'autonomy-deadman';

// [duty, workflow file, max days since last success]. Scheduled workflows only (event-driven ones can
// be legitimately idle). Mirrors docs/rules/GROK_OFF_READINESS.md.
const DUTIES = [
  ['CI health / reprise', 'autonomy-watchdog.yml', 3],
  ['CI health (weekly self-check)', 'ci-self-check.yml', 10],
  ['Mails projet (Gmail diags)', 'gmail-diagnostics.yml', 3],
  ['Mails projet (inbox triage)', 'l99-inbox-intelligence.yml', 3],
  ['Mails projet (Gmail token keepalive)', 'gmail-token-keepalive.yml', 3],
  ['Diagnostics fetch', 'fetch-diags.yml', 3],
  ['Bastien diag auto-replies', 'diag-autoreply-bastien.yml', 3],
  ['Crash triage', 'crash-triage.yml', 3],
  ['Forum scan', 'forum-poll.yml', 3],
  ['Enrich loop', 'auto-enrich-closed-loop.yml', 3],
  ['Enrich loop (fleet)', 'fleet-intelligent-enrich.yml', 3],
  ['Reprise (orchestrator)', 'recurrent-orchestrator.yml', 4],
  ['Reprise (autopilot)', 'repo-autopilot.yml', 4],
  ['Promotion soak -> stable', 'safe-sync-stable.yml', 4],
  ['Promotion soak -> bastien', 'bastien-promote-upstream.yml', 3],
  ['Veille upstream', 'upstream-watch.yml', 3],
  ['Etat Athom (publish self-heal)', 'publish-self-heal.yml', 3],
  ['Etat Athom (bisect / outcomes)', 'publish-hold-bisect.yml', 3],
  ['Etat Athom (build history ledger)', 'athom-build-history.yml', 3],
  ['Bases de connaissances (KB)', 'kb-refresh.yml', 10],
  ['Bases de connaissances (Homey KB)', 'homey-knowledge-refresh.yml', 10],
  ['Bases de connaissances (Blakadder)', 'blakadder-fetch.yml', 3],
  ['Envois master par etapes (auto-fix-and-publish)', 'auto-fix-and-publish.yml', 3],
  ['Garde donnees perso (in watchdog)', 'autonomy-watchdog.yml', 3],
  ['Digest hebdo', 'autonomy-digest.yml', 10],
];

function paused(root = ROOT) {
  return fs.existsSync(path.join(root, 'config', 'autonomy-paused'))
    || fs.existsSync(path.join(root, 'config', 'autonomy-paused.watch'));
}

function evaluate(rows, now) {
  // rows: [{duty, wf, maxDays, last (ms|null), exists}]
  return rows.map((r) => {
    if (!r.exists) return { ...r, state: 'absent' };
    const age = r.last == null ? Infinity : (now - r.last) / 86400000;
    return { ...r, ageDays: age, state: age > r.maxDays ? 'STALE' : 'ok' };
  });
}

function render(res, now) {
  const lines = ['| duty | workflow | last success (UTC) | age d | window d | state |', '|---|---|---|---|---|---|'];
  for (const r of res) {
    const last = r.last ? new Date(r.last).toISOString().slice(0, 16) : 'never';
    const age = Number.isFinite(r.ageDays) ? r.ageDays.toFixed(1) : '-';
    lines.push(`| ${r.duty} | ${r.wf} | ${last} | ${age} | ${r.maxDays} | ${r.state} |`);
  }
  return `Checked ${new Date(now).toISOString().slice(0, 16)} UTC by grok-off-deadman.yml (P3111).\n\n${lines.join('\n')}\n\n`
    + 'Each stale line: open its Actions page, read the red step, fix or pause it (config/autonomy-paused.<feature>). '
    + 'This issue closes itself when every line is ok again.\n';
}

function gh(args, input) { return execFileSync('gh', args, { encoding: 'utf8', input }); }

function main() {
  const now = Date.now();
  if (paused()) { console.log('kill switch on: dead-man skipped'); return; }
  const seen = new Set();
  const rows = [];
  for (const [duty, wf, maxDays] of DUTIES) {
    const exists = fs.existsSync(path.join(ROOT, '.github', 'workflows', wf));
    let last = null;
    if (exists && !seen.has(wf)) {
      try {
        const a = JSON.parse(gh(['run', 'list', '--workflow', wf, '--status', 'success', '--limit', '1', '--json', 'updatedAt']) || '[]');
        last = a.length ? Date.parse(a[0].updatedAt) : null;
      } catch (e) { last = null; }
    }
    seen.add(wf);
    rows.push({ duty, wf, maxDays, last, exists });
  }
  // duplicate workflow rows reuse the first lookup
  const byWf = {}; for (const r of rows) if (r.last != null) byWf[r.wf] = r.last;
  for (const r of rows) if (r.last == null && byWf[r.wf]) r.last = byWf[r.wf];
  const res = evaluate(rows, now);
  const stale = res.filter((r) => r.state === 'STALE');
  const body = render(res, now);
  console.log(body);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Dead-man\n\n${body}`);
  if (process.env.DEADMAN_DRY_RUN === '1') return;
  const open = JSON.parse(gh(['issue', 'list', '--state', 'open', '--search', `in:title "${DEADMAN_TITLE}"`, '-L', '5', '--json', 'number,title']))
    .find((i) => i.title === DEADMAN_TITLE);
  if (stale.length) {
    if (open) gh(['issue', 'edit', String(open.number), '--body-file', '-'], body);
    else {
      try { gh(['label', 'create', DEADMAN_LABEL, '--color', 'B60205', '--force']); } catch (e) { /* label optional */ }
      gh(['issue', 'create', '--title', DEADMAN_TITLE, '--label', DEADMAN_LABEL, '--body-file', '-'], body);
    }
  } else if (open) {
    gh(['issue', 'close', String(open.number), '--comment', 'All autonomous workflows healthy again (P3111 dead-man).']);
  }
}

if (require.main === module) main();
module.exports = { DUTIES, DEADMAN_TITLE, evaluate, render, paused };
