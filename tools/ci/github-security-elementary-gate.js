'use strict';
/**
 * GitHub elementary security + data-leak gate (P2206)
 *
 * Checks:
 * 1. Every .github/workflows/*.yml declares top-level `permissions:`
 * 2. No `echo ${{ secrets.* }}` style secret printing
 * 3. No `pull_request_target` without an explicit ALLOW comment (flag)
 * 4. Staged/tracked files must not include raw Homey diag dumps / Gmail excerpts
 * 5. Optional: warn workflows that grant contents: write without concurrency
 *
 * Usage: node tools/ci/github-security-elementary-gate.js [--staged]
 * Exit 0 = pass, 1 = fail
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const WF_DIR = path.join(ROOT, '.github', 'workflows');

const LEAKY_PATH_RE = [
  /^reports\/.+\/diag-.+-excerpt\.txt$/i,
  /^reports\/.+\/gmail-ci-dump\.json$/i,
  /^reports\/.+\/.*raw.*diag.*\.json$/i,
  /^gmail-dumps\//i,
  /^diagnostics\/raw\//i,
  /^\.tmp\//i,
  /^agent-tools\//i,
  /^reports\/forum-\d+\/.+\.(jpe?g|png|gif|webp)$/i,
];

function listWorkflows() {
  if (!fs.existsSync(WF_DIR)) return [];
  return fs.readdirSync(WF_DIR).filter((f) => /\.ya?ml$/i.test(f));
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function hasTopLevelPermissions(text) {
  // Top-level permissions: before first `jobs:` key
  const jobsIdx = text.search(/^jobs:\s*$/m);
  const head = jobsIdx >= 0 ? text.slice(0, jobsIdx) : text;
  return /^permissions:\s*$/m.test(head) || /^permissions:\s*\{/m.test(head);
}

function findEchoSecrets(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*#/.test(line)) continue;
    if (/echo\s+.*\$\{\{\s*secrets\./i.test(line)) hits.push({ line: i + 1, text: line.trim().slice(0, 120) });
    if (/printenv\s+.*SECRET|env\s*\|\s*grep\s+-i\s+secret/i.test(line)) hits.push({ line: i + 1, text: line.trim().slice(0, 120) });
  }
  return hits;
}

function listTrackedOrStaged(stagedOnly) {
  try {
    const cmd = stagedOnly
      ? 'git diff --cached --name-only --diff-filter=ACMR'
      : 'git ls-files';
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const stagedOnly = process.argv.includes('--staged');
  const errors = [];
  const warnings = [];

  for (const f of listWorkflows()) {
    const full = path.join(WF_DIR, f);
    const text = read(full);
    if (!hasTopLevelPermissions(text)) {
      errors.push(`workflow ${f}: missing top-level permissions: (least privilege)`);
    }
    for (const h of findEchoSecrets(text)) {
      errors.push(`workflow ${f}:${h.line}: possible secret echo → ${h.text}`);
    }
    if (/pull_request_target/.test(text) && !/ALLOW_PULL_REQUEST_TARGET|P2206-ALLOW-PRT/i.test(text)) {
      warnings.push(`workflow ${f}: uses pull_request_target — verify fork PR checkout is not untrusted`);
    }
    if (/permissions:[\s\S]{0,200}contents:\s*write/m.test(text) && !/concurrency:/m.test(text)) {
      warnings.push(`workflow ${f}: contents: write without concurrency: (race / leak surface)`);
    }
  }

  const files = listTrackedOrStaged(stagedOnly);
  for (const f of files) {
    const norm = f.replace(/\\/g, '/');
    for (const re of LEAKY_PATH_RE) {
      if (re.test(norm)) {
        errors.push(`data-leak path ${stagedOnly ? 'staged' : 'tracked'}: ${norm}`);
        break;
      }
    }
  }

  // Known tracked dump that should be purged if still present
  if (files.map((f) => f.replace(/\\/g, '/')).includes('reports/gmail-forum-2026-08-22/gmail-ci-dump.json')) {
    errors.push('tracked reports/gmail-forum-2026-08-22/gmail-ci-dump.json — remove (use TREAT.md only)');
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  GitHub elementary security gate (P2206)');
  console.log('═══════════════════════════════════════════════');
  for (const w of warnings) console.log('  WARN', w);
  for (const e of errors) console.log('  FAIL', e);
  if (errors.length) {
    console.log(`\nFAIL: ${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  }
  console.log(`\nPASS: workflows OK, no leaky paths (${warnings.length} warning(s))`);
  process.exit(0);
}

main();
