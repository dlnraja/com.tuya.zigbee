'use strict';
// P3069 step 2: workflows migrated to the shared report helper keep a short summary that is
// written on success AND failure, and never die when the helper file is missing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MIGRATED = ['ci-self-check.yml', 'node22-tests.yml', 'validate.yml', 'homey-app-validate.yml',
  'publish.yml', 'publish-stable.yml', 'bastien-publish.yml', 'auto-publish-on-push.yml', 'draft-to-test.yml', 'draft-to-test-fleet.yml',
  // enrich + kb (step 2c)
  'auto-enrich-closed-loop.yml', 'blakadder-fetch.yml', 'driver-maintenance.yml', 'fleet-intelligent-enrich.yml', 'free-scrape-crossref.yml', 'homey-knowledge-refresh.yml', 'homey-store-peer-probe.yml', 'kb-refresh.yml', 'knowledge-graph-sync.yml', 'market-couples-intake.yml', 'mega-crawl.yml', 'monthly-community-sync.yml', 'monthly-device-enrichment.yml', 'monthly-enrichment.yml', 'monthly-scan.yml', 'monthly-tuya-intelligence.yml', 'oss-lan-source-enrich.yml', 'peer-complementary-enrich.yml',
  // forum + diag (step 2d)
  'agent-reach.yml', 'collect-diagnostics.yml', 'community-inbox.yml', 'daily-digest.yml', 'fetch-diags.yml', 'forum-pm-read.yml', 'forum-poll.yml', 'gmail-diagnostics.yml', 'gmail-token-keepalive.yml', 'johan-thread-intel.yml', 'l99-inbox-intelligence.yml', 'offline-crash-analyzer.yml', 'tuya-deep-diag.yml',
  // autopilot (step 2e; P3068's ai-monthly-audit / bastien-promote-upstream left alone)
  'activity-monitor.yml', 'auto-bot-issue-triage.yml', 'auto-close-supported.yml', 'auto-reopen-on-comment.yml', 'automation-loop.yml', 'bug-report-auto-pr.yml', 'continuous-flow.yml', 'delete-johan-comments.yml', 'delete-own-upstream-comments.yml', 'dependabot-auto-merge.yml', 'housekeeping.yml', 'labeler.yml', 'notifications.yml', 'project-resilience.yml', 'recurrent-orchestrator.yml', 'repo-autopilot.yml', 'safe-sync-stable.yml', 'self-improve.yml', 'smart-pr-merge.yml', 'smart-update.yml', 'stale.yml', 'temporal-monitor.yml', 'weekly-sovereign-loop.yml'];

for (const wf of MIGRATED) {
  test(`${wf}: summary goes through report-writer, always, with a guard`, () => {
    const p = path.join(ROOT, '.github', 'workflows', wf);
    if (!fs.existsSync(p)) return;
    const src = fs.readFileSync(p, 'utf8');
    assert.match(src, /node scripts\/lib\/report-writer\.js --title/);
  });
}

test('every helper summary step runs always() and skips quietly when the helper is absent', () => {
  const dir = path.join(ROOT, '.github', 'workflows');
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((x) => /\.ya?ml$/.test(x))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const b of src.split(/\n\s+- name: /).filter((x) => /report-writer\.js --title/.test(x))) {
      n++;
      assert.match(b, /if: always\(\)/, `${f}: summary step must run on failure too`);
      assert.match(b, /\[ -f scripts\/lib\/report-writer\.js \]/, `${f}: summary step needs the file guard`);
    }
  }
  assert.ok(n >= MIGRATED.filter((w) => fs.existsSync(path.join(dir, w))).length, `only ${n} helper summary steps`);
});

test('report-writer CLI output is short and carries the marker', () => {
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'report-writer.js'),
    '--title', 'X', '--summary', 'All good.', '--headers', 'a|b', '--row', '1|2', '--thanks', 'Mocha'], { encoding: 'utf8' });
  assert.match(out, /^<!-- report-writer:v1/);
  assert.ok(out.split('\n').length < 20, out);
});

test('auto-publish-on-push: first-line picks use awk, not head, under pipefail (no SIGPIPE 141)', () => {
  const p = path.join(ROOT, '.github', 'workflows', 'auto-publish-on-push.yml');
  if (!fs.existsSync(p)) return;
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(!/(?:NEXT|BACKOFF_S)=\/\/p' \| head -1/.test(src));
  assert.ok(!/failed_build_id\)=\[0-9\]\+' "\$OUT" \| head -1/.test(src));
});
