#!/usr/bin/env node
'use strict';

/*
 * GitHub Actions policy gate.
 *
 * This complements YAML syntax validation with the CI/CD rules learned from
 * real failures: voice-safety checks must run before publish/validation,
 * smart PR merge must verify the head reached master before reporting success,
 * and diagnostics that read private sources must be redacted.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '../..');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const SMART_MERGE_SCRIPT = path.join(ROOT, '.github', 'scripts', 'smart-pr-merge.js');

const BLOCKING_WORKFLOWS_REQUIRING_VOICE = new Set([
  'auto-publish-on-push.yml',
  'code-quality.yml',
  'publish.yml',
  'publish-stable.yml',
  'syntax-check.yml',
  'unified-ci.yml',
  'validate.yml',
  'verified-publish-and-diagnostics.yml',
]);

const errors = [];
const warnings = [];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function workflowFiles() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs.readdirSync(WORKFLOWS_DIR)
    .filter(name => /\.ya?ml$/i.test(name))
    .sort()
    .map(name => path.join(WORKFLOWS_DIR, name));
}

function hasRun(content, pattern) {
  return pattern.test(content);
}

function parseWorkflow(file, content) {
  try {
    return yaml.load(content);
  } catch (err) {
    errors.push(`${rel(file)}: YAML parse failed: ${err.message}`);
    return null;
  }
}

function addError(file, message) {
  errors.push(`${rel(file)}: ${message}`);
}

function addWarning(file, message) {
  warnings.push(`${rel(file)}: ${message}`);
}

function validateWorkflow(file) {
  const name = path.basename(file);
  const content = read(file);
  const doc = parseWorkflow(file, content);
  if (!doc) return;

  if (BLOCKING_WORKFLOWS_REQUIRING_VOICE.has(name) && !hasRun(content, /npm\s+run\s+check:voice\b/)) {
    addError(file, 'critical validation/publish workflow must run npm run check:voice');
  }

  if (name === 'auto-publish-on-push.yml' && !hasRun(content, /npm\s+run\s+check:yaml\b/)) {
    addError(file, 'auto-publish must run npm run check:yaml before publishing');
  }

  if (name === 'smart-pr-merge.yml') {
    if (/continue-on-error:\s*true[\s\S]{0,400}git\s+push\s+origin\s+HEAD/.test(content)) {
      addError(file, 'smart merge must not continue after an unverified git push');
    }
    if (!hasRun(content, /Verify smart merge result/)) {
      addError(file, 'smart merge workflow must keep a verification step');
    }
  }

  if (/fetch-gmail-diagnostics\.js|homey-device-diagnostics\.js|collect-diagnostics\.js|dashboard-monitor\.js/.test(content)
      && !/privacy-redactor\.js/.test(content)) {
    addWarning(file, 'diagnostic workflow reads private sources but does not run privacy-redactor.js');
  }

  if (/scripts\/automation\/fetch-gmail-diags\.js/.test(content)) {
    addError(file, 'workflow uses legacy Gmail diagnostics fetcher; use .github/scripts/fetch-gmail-diagnostics.js with privacy and history gates');
  }

  if (/fetch-gmail-diagnostics\.js/.test(content) && !/(diagnostic-history-gate\.js|check:diag-history)/.test(content)) {
    addWarning(file, 'Gmail diagnostics workflow should run diagnostic-history-gate.js after privacy-redactor.js');
  }

  if (/git\s+push[^\n]*\|\|\s*(?:true|echo\b|:)/.test(content)) {
    addWarning(file, 'git push is masked with a best-effort fallback; use verified push for integration-critical writes');
  }

  if (/gh\s+pr\s+close/.test(content) && /merged/i.test(content)) {
    addError(file, 'workflow must not close a PR as merged; use gh pr merge plus commit reachability verification');
  }

  const jobs = doc.jobs && typeof doc.jobs === 'object' ? doc.jobs : {};
  for (const [jobName, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object') continue;
    const steps = Array.isArray(job.steps) ? job.steps : [];
    for (const step of steps) {
      if (!step || typeof step !== 'object') continue;
      if (typeof step.uses === 'string') {
        if (/^actions\/checkout@v4$/.test(step.uses) || /^actions\/setup-node@v4$/.test(step.uses)) {
          addWarning(file, `job ${jobName} uses ${step.uses}; prefer v5 in active workflows`);
        }
      }
    }
  }
}

function validateSmartMergeScript() {
  if (!fs.existsSync(SMART_MERGE_SCRIPT)) {
    errors.push(`${rel(SMART_MERGE_SCRIPT)}: missing`);
    return;
  }

  const content = read(SMART_MERGE_SCRIPT);
  if (!/function\s+verifyIntegrated\s*\(/.test(content)) {
    errors.push(`${rel(SMART_MERGE_SCRIPT)}: missing verifyIntegrated guard`);
  }
  if (/gh\(`pr close/.test(content)) {
    errors.push(`${rel(SMART_MERGE_SCRIPT)}: must not use gh pr close to report a merge`);
  }
  if (/git\(`push origin HEAD`\)/.test(content)) {
    errors.push(`${rel(SMART_MERGE_SCRIPT)}: unqualified git push origin HEAD can create false merges`);
  }
  if (!/merge-base --is-ancestor/.test(content)) {
    errors.push(`${rel(SMART_MERGE_SCRIPT)}: must verify merged head with merge-base --is-ancestor`);
  }
}

const files = workflowFiles();
for (const file of files) validateWorkflow(file);
validateSmartMergeScript();

const report = {
  timestamp: new Date().toISOString(),
  workflowsChecked: files.length,
  errors: errors.length,
  warnings: warnings.length,
  errorDetails: errors,
  warningDetails: warnings,
};

console.log(JSON.stringify(report, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
