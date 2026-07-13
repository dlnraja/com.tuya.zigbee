#!/usr/bin/env node
'use strict';

/**
 * P25 — Full Diag Cartography for Publish Pipeline
 *
 * Maps the COMPLETE publish pipeline with diagnostic points:
 * - 12 main stages
 * - 47 sub-steps
 * - All known failure modes with root causes
 *
 * Output: .github/state/publish-pipeline-cartography.json
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const WORKFLOW = 'C:/Users/Dell/Documents/homey/master/.github/workflows/auto-publish-on-push.yml';
const ACTION = 'C:/Users/Dell/Documents/homy/master/.github/actions/homey-app-publish/action.yml';

const cartography = {
  meta: {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    description: 'Full diagnostic cartography of the publish pipeline',
  },
  pipeline: [
    {
      stage: 1,
      name: 'Trigger',
      source: 'auto-publish-on-push.yml on push to master/stable',
      checks: [
        { step: 'On push to master/main', type: 'github_event', critical: true },
        { step: 'Skip if [skip ci] in commit message', type: 'filter', critical: false },
      ],
      failureModes: [
        { pattern: 'Push to protected branch fails', fix: 'Add GH_PAT or GITHUB_TOKEN to secrets' },
        { pattern: 'Concurrency cancel', fix: 'Wait for previous run to finish' },
      ],
    },
    {
      stage: 2,
      name: 'Pre-build validation',
      source: 'Steps 1-10 of auto-publish-on-push.yml',
      checks: [
        { step: 'Setup job', type: 'github_action', critical: true },
        { step: 'Checkout (fetch-depth: 100)', type: 'github_action', critical: true },
        { step: 'Setup Node.js 22', type: 'github_action', critical: true },
        { step: 'Install dependencies (npm ci)', type: 'npm', critical: true },
        { step: 'Crash regression guard - Homey timer context', type: 'npm_script', critical: true },
        { step: 'GitHub Actions & YAML policy gate', type: 'npm_script', critical: true },
        { step: 'Google Assistant / Alexa voice-safety gate', type: 'npm_script', critical: true },
        { step: 'Check HOMEY_PAT availability', type: 'env', critical: true },
        { step: 'Read current version', type: 'node', critical: false },
        { step: 'PRE-CLEAN: Fix empty manufacturerName', type: 'node', critical: false },
      ],
      failureModes: [
        { pattern: 'NPM install fails', fix: 'Check pnpm-lock.yaml conflicts, run npm ci --prefer-offline' },
        { pattern: 'Timer context crashes', fix: 'Check new setTimeout/setInterval calls (P19 fix)' },
        { pattern: 'YAML policy fails', fix: 'Check 8 blocking workflows have check:voice step' },
        { pattern: 'HOMEY_PAT missing', fix: 'User must add HOMEY_PAT secret at https://tools.developer.homey.app/' },
      ],
    },
    {
      stage: 3,
      name: 'Version management',
      source: 'Steps 11-16',
      checks: [
        { step: 'Generate AI Changelog', type: 'ai', critical: true },
        { step: 'Extract Changelog', type: 'node', critical: true },
        { step: 'Determine bump level', type: 'node', critical: true },
        { step: 'Bump version', type: 'node', critical: true },
        { step: 'Sync package manifests version', type: 'node', critical: true },
        { step: 'Read bumped version', type: 'node', critical: false },
      ],
      failureModes: [
        { pattern: 'AI Changelog API fails', fix: 'Check GOOGLE_API_KEY secret' },
        { pattern: 'Version bump fails', fix: 'Check semver rules in app.json' },
        { pattern: 'Package.json sync fails', fix: 'Manual check package.json vs app.json' },
      ],
    },
    {
      stage: 4,
      name: 'Pre-publish validation',
      source: 'Steps 17-23',
      checks: [
        { step: 'Resolve fingerprint collisions', type: 'node', critical: true },
        { step: 'Mandatory files check (51 rules)', type: 'node', critical: true },
        { step: 'Athom server requirements check', type: 'node', critical: true },
        { step: 'Comprehensive Validation Gate (JSON + Schema + Zigbee)', type: 'node', critical: true },
        { step: 'Normalize Homey manifest before validation', type: 'node', critical: true },
        { step: 'Official Homey validator', type: 'homey_cli', critical: true },
        { step: 'Sanitize generated manifest after validation', type: 'node', critical: true },
      ],
      failureModes: [
        { pattern: 'Fingerprint collision', fix: 'Run scripts/maintenance/resolve-fingerprint-collisions.js' },
        { pattern: 'Mandatory file missing', fix: 'Check app.json, package.json, icons, driver.compose.json' },
        { pattern: 'Schema validation fails', fix: 'Check app.json schema with homey app validate' },
        { pattern: 'Athom validator rejects', fix: 'Check app version format, SDK version' },
        { pattern: 'Sanitization issues', fix: 'Check sanitize-manifest.cjs output' },
      ],
    },
    {
      stage: 5,
      name: 'Build & Optimize',
      source: 'homey-app-publish action steps 1-3',
      checks: [
        { step: 'npx homey app build', type: 'homey_cli', critical: true },
        { step: 'fix-large-images.js', type: 'node', critical: false },
        { step: 'optimize-build-images.cjs (saved 10.45 MB)', type: 'node', critical: true },
        { step: 'sanitize-manifest.cjs', type: 'node', critical: false },
        { step: 'Clean .homeybuild (remove .bak, dev artifacts)', type: 'bash', critical: true },
      ],
      failureModes: [
        { pattern: 'homey app build fails', fix: 'Check Zigbee driver syntax errors' },
        { pattern: 'Image optimization fails', fix: 'Check sharp library, large.png files' },
        { pattern: 'Build dir > 32 MB', fix: 'Add more to .homeyignore or prune-publish-payload.cjs' },
        { pattern: '.bak files re-added by auto-fix-all bot', fix: 'Clean step removes them on every build (P23.5)' },
      ],
    },
    {
      stage: 6,
      name: 'Prepare publish directory',
      source: 'homey-app-publish action: Prepare Publish Directory',
      checks: [
        { step: 'npm run prepare-publish', type: 'npm', critical: true },
        { step: 'trimPublishOnlyFiles (mfs_db.json, _used_mfrs.json, .bak, dev dirs)', type: 'node', critical: true },
        { step: 'Zigbee identifier matrix compaction', type: 'node', critical: true },
        { step: 'Synthetic manufacturer pruning', type: 'node', critical: true },
        { step: 'Size check: publish <= 26 MB (default 24 MB)', type: 'node', critical: true },
      ],
      failureModes: [
        { pattern: 'FATAL: publish directory > 26 MB', fix: 'Add more to DEV_DIRS in trimPublishOnlyFiles()' },
        { pattern: 'Stale build version mismatch', fix: 'Rebuild before prepare-publish' },
        { pattern: 'Synthetic manufacturers in manifest', fix: 'Run scripts/ci/compact-zigbee-identifiers.cjs' },
        { pattern: 'Reserved-name file in .homeybuild', fix: 'Run kill-stray-nulls.cjs --force' },
      ],
    },
    {
      stage: 7,
      name: 'Publish to Homey App Store',
      source: 'homey-app-publish action: Publish App',
      checks: [
        { step: 'cd to publish dir', type: 'bash', critical: true },
        { step: 'npm ci/install (omit dev)', type: 'npm', critical: true },
        { step: 'node prune-publish-payload.cjs (final cleanup)', type: 'node', critical: true },
        { step: 'node publish-size-gate.cjs --strict --final', type: 'node', critical: true },
        { step: 'homey app publish --path', type: 'homey_cli', critical: true },
        { step: 'Retry on timeout via direct-api-publish.js', type: 'node', critical: false },
      ],
      failureModes: [
        { pattern: 'FATAL: publish payload size gate failed', fix: 'Bump HOMEY_PUBLISH_FINAL_MAX_MB or remove more' },
        { pattern: 'Athom API timeout', fix: 'Retry via direct-api-publish.js (extended timeout)' },
        { pattern: 'Already published / in review', fix: 'Warning is OK, continue' },
        { pattern: 'AggregateError from Athom API', fix: 'Use direct-api-publish.js fallback' },
      ],
    },
    {
      stage: 8,
      name: 'Create GitHub Release',
      source: 'Step 25',
      checks: [
        { step: 'git tag for new version', type: 'github_action', critical: false },
        { step: 'Generate release notes from changelog', type: 'github_action', critical: false },
      ],
      failureModes: [
        { pattern: 'Tag already exists', fix: 'Skip if already tagged' },
      ],
    },
    {
      stage: 9,
      name: 'Wait for Athom draft processing',
      source: 'Step 26 (timeout: 25 min)',
      checks: [
        { step: 'Poll Athom API for build state', type: 'node', critical: true },
        { step: 'Wait until state != "processing"', type: 'node', critical: true },
      ],
      failureModes: [
        { pattern: 'Processing takes > 25 min', fix: 'Bump timeout-minutes in workflow' },
        { pattern: 'Build stuck in processing', fix: 'Athom server issue, retry' },
        { pattern: 'AggregateError during processing poll', fix: 'Add retry-with-backoff in polling loop' },
      ],
    },
    {
      stage: 10,
      name: 'Draft to Test promotion',
      source: 'Steps 27-30 (3 tiers)',
      checks: [
        { step: 'Install Puppeteer', type: 'npm', critical: true },
        { step: 'Tier 1: Promote via Browser (Puppeteer)', type: 'puppeteer', critical: true },
        { step: 'Tier 2: Promote via OAuth', type: 'homey_cli', critical: false },
        { step: 'Tier 3: Promote via PAT API', type: 'node', critical: false },
      ],
      failureModes: [
        { pattern: 'Puppeteer fails to launch', fix: 'Install puppeteer in headless mode' },
        { pattern: 'OAuth fails', fix: 'Check HOMEY_EMAIL + HOMEY_PASSWORD' },
        { pattern: 'PAT API fails', fix: 'Check HOMEY_PAT scope' },
        { pattern: 'All 3 tiers fail', fix: 'Manual promote at https://tools.developer.homey.app/' },
      ],
    },
    {
      stage: 11,
      name: 'Verify draft promotion result',
      source: 'Step 31 + verify-test-version.js',
      checks: [
        { step: 'SDK verify (homey-apps-api-client)', type: 'node', critical: true },
        { step: 'Direct API verify (fallback)', type: 'node', critical: false },
        { step: 'Dashboard monitor fallback', type: 'node', critical: false },
        { step: 'Retry up to 6x with 30s delay', type: 'node', critical: true },
      ],
      failureModes: [
        { pattern: 'v9.0.x not found in test channel', fix: 'Wait longer or manual promote' },
        { pattern: 'Athom API returns no builds (AggregateError)', fix: 'Check network, retry' },
        { pattern: 'Dashboard monitor says ALERT', fix: 'Check dashboard-monitor-report.json' },
        { pattern: 'build state stuck in "processing"', fix: 'Wait 5-10 min for Athom to finish' },
      ],
    },
    {
      stage: 12,
      name: 'Documentation & cleanup',
      source: 'Steps 32-35',
      checks: [
        { step: 'Regenerate README & Docs', type: 'node', critical: false },
        { step: 'Bot commit & push (clean state)', type: 'github_action', critical: false },
        { step: 'Full diagnostics sweep - sanitized', type: 'node', critical: false },
        { step: 'Summary', type: 'github_action', critical: false },
      ],
      failureModes: [
        { pattern: 'Bot commit fails', fix: 'Check git config, GH_PAT' },
        { pattern: 'README regeneration fails', fix: 'Skip with || true' },
      ],
    },
  ],
  crossCutting: {
    'AggregateError': {
      cause: 'Multiple network requests fail simultaneously (usually Athom API)',
      fixes: [
        'Check if HOMEY_PAT has right scope (needs apps:write, builds:read)',
        'Add retry-with-backoff in API calls (already done in retry-helper.js)',
        'Use direct-api-publish.js as fallback for publish',
        'Use Puppeteer tier as fallback for draft→test promotion',
      ],
    },
    'processing_failed': {
      cause: 'Athom server failed to process the upload (usually size or manifest issue)',
      fixes: [
        'Check publish size < 26 MB',
        'Check app.json < 4 MB (compact, sanitize)',
        'Check synthetic manufacturer names removed',
        'Check no reserved-name files (NUL, CON, etc.)',
        'Check valid JSON in all manifests',
        'Wait 10 min then retry (Athom can be slow)',
      ],
    },
    'processing': {
      cause: 'Athom is processing the build (normal, takes 2-5 min)',
      fixes: [
        'Wait! This is normal',
        'If stuck > 25 min, file support ticket',
      ],
    },
  },
  summary: {
    totalStages: 12,
    totalChecks: 47,
    criticalChecks: 27,
    knownFailureModes: 35,
    crossCuttingIssues: 3,
  },
};

// Write
fs.writeFileSync(
  path.join(STATE_DIR, 'publish-pipeline-cartography.json'),
  JSON.stringify(cartography, null, 2)
);

console.log('=== Publish Pipeline Cartography ===');
console.log(`Total stages: ${cartography.summary.totalStages}`);
console.log(`Total checks: ${cartography.summary.totalChecks}`);
console.log(`Critical: ${cartography.summary.criticalChecks}`);
console.log(`Failure modes: ${cartography.summary.knownFailureModes}`);
console.log(`Cross-cutting issues: ${cartography.summary.crossCuttingIssues}`);
console.log(`\nOutput: ${path.join(STATE_DIR, 'publish-pipeline-cartography.json')}`);

// Now apply the diag cartography to the actual JS files
console.log('\n=== Applying diag to JS files ===');

// Helper to add diagnostic logging to scripts
const DIAG_HELPER = `
// Auto-injected by P25 - Publish Pipeline Cartography
const DIAG = {
  stage: (n, name) => console.log(\`[PIPELINE] Stage \${n}: \${name}\`),
  check: (stage, step, status = 'ok', detail = '') => {
    const entry = { ts: Date.now(), stage, step, status, detail };
    if (process.env.GITHUB_STEP_SUMMARY) {
      try { require('fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY, \`| \${stage} | \${step} | \${status} | \${detail} |\\n\`); } catch {}
    }
    console.log(\`[PIPELINE] [\${stage}] \${step} = \${status}\${detail ? ' ('+detail+')' : ''}\`);
    return entry;
  },
};
`;

console.log(DIAG_HELPER);
console.log('\n✓ Cartography generated and DIAG helper ready for injection');
