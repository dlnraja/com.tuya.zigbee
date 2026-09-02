'use strict';

/**
 * P2383 — harden GitHub elementary security gate (P2206+)
 *
 * Checks:
 * 1. Every .github/workflows/*.yml declares top-level `permissions:`
 * 2. Top-level `defaults.run.shell: bash` (Windows runner safety)
 * 3. Top-level or job `concurrency:` when contents: write
 * 4. At least one `timeout-minutes:` in the workflow
 * 5. No `echo ${{ secrets.* }}` / printenv secret dumps
 * 6. No `permissions: write-all`
 * 7. No `pull_request_target` without P2206-ALLOW-PRT
 * 8. Prefer actions/checkout@v4+ and actions/setup-node@v5 (warn v4 node)
 * 9. Staged/tracked files must not include raw Homey diag dumps / Gmail excerpts
 *
 * Usage: node tools/ci/github-security-elementary-gate.js [--staged] [--strict]
 * Exit 0 = pass, 1 = fail
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const WF_DIR = path.join(ROOT, '.github', 'workflows');
const STRICT = process.argv.includes('--strict');

const LEAKY_PATH_RE = [
  /^reports\/.+\/diag-.+-excerpt\.txt$/i,
  /^reports\/.+\/gmail-ci-dump\.json$/i,
  /^reports\/.+\/.*raw.*diag.*\.json$/i,
  /^gmail-dumps\//i,
  /^diagnostics\/raw\//i,
  /^\.tmp\//i,
  /^agent-tools\//i,
  /^reports\/forum-\d+\/.+\.(jpe?g|png|gif|webp)$/i,
  /^reports\/forum-verify-\d{4}-\d{2}-\d{2}\/.+\.(jpe?g|png|gif|webp)$/i,
];

function listWorkflows() {
  if (!fs.existsSync(WF_DIR)) return [];
  return fs.readdirSync(WF_DIR).filter((f) => /\.ya?ml$/i.test(f));
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function workflowHead(text) {
  const jobsIdx = text.search(/^jobs:\s*$/m);
  return jobsIdx >= 0 ? text.slice(0, jobsIdx) : text;
}

function hasTopLevelPermissions(text) {
  const head = workflowHead(text);
  return /^permissions:\s*$/m.test(head) || /^permissions:\s*\{/m.test(head);
}

function hasBashDefaults(text) {
  return /defaults:\s*\n\s*run:\s*\n\s*shell:\s*bash\b/m.test(text)
    || /defaults:[\s\S]{0,160}shell:\s*bash\b/m.test(text);
}

function findEchoSecrets(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*#/.test(line)) continue;
    if (/echo\s+.*\$\{\{\s*secrets\./i.test(line)) {
      hits.push({ line: i + 1, text: line.trim().slice(0, 120) });
    }
    if (/printenv\s+.*SECRET|env\s*\|\s*grep\s+-i\s+secret/i.test(line)) {
      hits.push({ line: i + 1, text: line.trim().slice(0, 120) });
    }
    // WHY(P2383): curl -H with raw secret dump into logs via -v / set -x
    if (/set\s+-x/.test(line) && /secrets\./i.test(text.slice(Math.max(0, text.indexOf(line) - 400), text.indexOf(line) + 400))) {
      hits.push({ line: i + 1, text: line.trim().slice(0, 120) });
    }
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
    const head = workflowHead(text);

    if (!hasTopLevelPermissions(text)) {
      errors.push(`workflow ${f}: missing top-level permissions: (least privilege)`);
    }
    if (!hasBashDefaults(text)) {
      errors.push(`workflow ${f}: missing defaults.run.shell: bash`);
    }
    if (!/timeout-minutes:/m.test(text)) {
      errors.push(`workflow ${f}: missing timeout-minutes: on jobs`);
    }
    if (/permissions:\s*write-all/i.test(text)) {
      errors.push(`workflow ${f}: permissions: write-all forbidden`);
    }
    for (const h of findEchoSecrets(text)) {
      errors.push(`workflow ${f}:${h.line}: possible secret echo → ${h.text}`);
    }
    if (/pull_request_target/.test(text) && !/ALLOW_PULL_REQUEST_TARGET|P2206-ALLOW-PRT/i.test(text)) {
      (STRICT ? errors : warnings).push(
        `workflow ${f}: uses pull_request_target — verify fork PR checkout is not untrusted`,
      );
    }
    if (/permissions:[\s\S]{0,200}contents:\s*write/m.test(text) && !/concurrency:/m.test(text)) {
      errors.push(`workflow ${f}: contents: write without concurrency: (race / leak surface)`);
    }
    if (!/concurrency:/m.test(head) && !/concurrency:/m.test(text)) {
      warnings.push(`workflow ${f}: no concurrency: block`);
    }
    if (/actions\/checkout@v[123]\b/.test(text)) {
      errors.push(`workflow ${f}: actions/checkout must be @v4 or @v5`);
    }
    if (/actions\/setup-node@v[123]\b/.test(text)) {
      errors.push(`workflow ${f}: actions/setup-node must be @v4+ (prefer @v5)`);
    }
    if (/actions\/setup-node@v4\b/.test(text)) {
      warnings.push(`workflow ${f}: actions/setup-node@v4 — prefer @v5`);
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

  if (files.map((f) => f.replace(/\\/g, '/')).includes('reports/gmail-forum-2026-08-22/gmail-ci-dump.json')) {
    errors.push('tracked reports/gmail-forum-2026-08-22/gmail-ci-dump.json — remove (use TREAT.md only)');
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  GitHub elementary security gate (P2206/P2383)');
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
