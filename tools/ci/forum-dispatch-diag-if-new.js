#!/usr/bin/env node
'use strict';

/**
 * Dispatch Tuya Deep Diagnostics for at most one UUID harvested from PMs.
 *
 * WHY: Field crash UUIDs often arrive in Homey Community private messages,
 * never on public T140352. Waiting for a human to paste them delays soak.
 * HOW: `gh workflow run tuya-deep-diag.yml -f report_id=<uuid>`
 * WHO: CI bot on master. Never posts to Discourse.
 * WHEN: after forum-pm-read harvest (scheduled 07:50 / 19:50 UTC).
 * AGAINST: cancel-in-progress killing an in-flight diag; UUID spam.
 * Max 1 UUID per run; skip if a deep-diag job is already in_progress.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const INBOX = path.join(ROOT, '.github', 'state', 'forum', 'pm-inbox.json');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function log(msg) {
  console.log(`[forum-dispatch-diag] ${msg}`);
}

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', shell: false });
  return {
    ok: r.status === 0,
    stdout: String(r.stdout || '').trim(),
    stderr: String(r.stderr || '').trim(),
    status: r.status,
  };
}

function loadUuids() {
  try {
    const j = JSON.parse(fs.readFileSync(INBOX, 'utf8'));
    return [...new Set([].concat(j.summary?.diagnosticUuids || []).filter((u) => UUID_RE.test(u)))];
  } catch {
    return [];
  }
}

function main() {
  if (process.env.FORUM_AUTO_POST === '1') {
    console.error('REFUSE: forum-dispatch-diag-if-new.js never posts (T157628).');
    process.exit(2);
  }
  if (process.env.FORUM_PM_DISPATCH_DIAG === '0') {
    log('FORUM_PM_DISPATCH_DIAG=0 — skip');
    process.exit(0);
  }
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN && !process.env.GH_PAT) {
    log('No GITHUB_TOKEN — skip dispatch');
    process.exit(0);
  }

  const uuids = loadUuids();
  if (!uuids.length) {
    log('No diagnostic UUIDs in pm-inbox.json — skip');
    process.exit(0);
  }

  const listed = gh([
    'run', 'list',
    '--workflow', 'tuya-deep-diag.yml',
    '--limit', '8',
    '--json', 'status,displayTitle,createdAt,databaseId',
  ]);
  if (listed.ok) {
    try {
      const runs = JSON.parse(listed.stdout || '[]');
      if (runs.some((r) => r.status === 'in_progress' || r.status === 'queued')) {
        log('Deep-diag already in_progress/queued — skip (do not cancel)');
        process.exit(0);
      }
    } catch {
      /* list parse failed — still try one dispatch */
    }
  }

  const uuid = uuids[0];
  log(`Dispatching tuya-deep-diag for ${uuid} (${uuids.length} harvested)`);
  const dispatched = gh([
    'workflow', 'run', 'tuya-deep-diag.yml',
    '-f', `report_id=${uuid}`,
    '--ref', process.env.GITHUB_REF_NAME || 'master',
  ]);
  if (!dispatched.ok) {
    log(`dispatch failed: ${dispatched.stderr || dispatched.stdout || dispatched.status}`);
    process.exit(0);
  }
  log('Dispatched (read-only recovery; never posts on forum)');
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\nDispatched Tuya Deep Diagnostics for \`${uuid}\` (PM harvest, never posted).\n`
    );
  }
}

main();
