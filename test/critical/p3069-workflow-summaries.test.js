'use strict';
// P3069 step 2: workflows migrated to the shared report helper keep a short summary that is
// written on success AND failure, and never die when the helper file is missing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
// stable-v5: every workflow that carries the shared helper summary on this branch (P3069 step 2 port)
const MIGRATED = ['activity-monitor.yml', 'agent-reach.yml', 'auto-bot-issue-triage.yml', 'auto-close-supported.yml', 'auto-enrich-closed-loop.yml', 'auto-fix-and-publish.yml', 'auto-publish-on-push.yml', 'auto-reopen-on-comment.yml', 'bastien-publish.yml', 'blakadder-fetch.yml', 'bug-report-auto-pr.yml', 'build-error-diag.yml', 'ci-self-check.yml', 'code-quality.yml', 'collect-diagnostics.yml', 'community-inbox.yml', 'continuous-flow.yml', 'delete-johan-comments.yml', 'delete-own-upstream-comments.yml', 'dependabot-auto-merge.yml', 'deploy-pages.yml', 'doc-coverage.yml', 'draft-to-test-fleet.yml', 'draft-to-test.yml', 'driver-maintenance.yml', 'e2e-dashboard-test.yml', 'fetch-diags.yml', 'fleet-intelligent-enrich.yml', 'forum-pm-read.yml', 'forum-poll.yml', 'free-scrape-crossref.yml', 'gmail-diagnostics.yml', 'gmail-token-keepalive.yml', 'homey-app-validate.yml', 'housekeeping.yml', 'kb-refresh.yml', 'knowledge-graph-sync.yml', 'l99-inbox-intelligence.yml', 'labeler.yml', 'market-couples-intake.yml', 'mega-crawl.yml', 'monthly-community-sync.yml', 'monthly-device-enrichment.yml', 'monthly-enrichment.yml', 'monthly-scan.yml', 'monthly-tuya-intelligence.yml', 'nightly-audit.yml', 'node22-tests.yml', 'notifications.yml', 'offline-crash-analyzer.yml', 'platform-budget.yml', 'pr-gate.yml', 'project-resilience.yml', 'publish-diagnose.yml', 'publish-self-heal.yml', 'publish-stable.yml', 'publish.yml', 'recurrent-orchestrator.yml', 'safe-sync-stable.yml', 'self-improve.yml', 'shadow-policy-check.yml', 'smart-pr-merge.yml', 'smart-update.yml', 'stale.yml', 'syntax-check.yml', 'temporal-monitor.yml', 'tuya-deep-diag.yml', 'upstream-guard.yml', 'validate.yml', 'verified-publish-and-diagnostics.yml', 'version-health.yml', 'weekly-sovereign-loop.yml'];

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
    '--title', 'X', '--summary', 'All good.', '--headers', 'a|b', '--row', '1|2', '--thanks', 'Mocha'],
    // In GitHub Actions the CLI appends to $GITHUB_STEP_SUMMARY instead of printing; drop it so the
    // test reads stdout the same way locally and in CI (and never writes into the real summary).
    { encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'GITHUB_STEP_SUMMARY')) });
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
