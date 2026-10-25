'use strict';

/**
 * P3019c: files whose content is specific to ONE branch (master / stable-v5 / bastien-home).
 *
 * WHY: the P2607 Bastien→master promote copied docs/knowledge/** with Bastien bytes, so commit
 * 78ddb62aa5 replaced master's METHOD_COVERAGE.md / CROSS_APP_METHODS.md / UNKNOWN_COMMANDS.md
 * with the Bastien versions (different driver set, different method rows). These files describe
 * the branch they live on: they are either generated from that branch's own drivers/lib, or
 * hand-curated per branch. A cross-branch sync must never copy them; it regenerates the
 * generated ones on the target branch instead (from the target's own code).
 *
 * Shared by every cross-branch sync/promote script (bastien-promote-upstream, apply-safe-sync…).
 */

/** Exact repo-relative paths that are always branch-specific. */
const BRANCH_SPECIFIC_PATHS = Object.freeze([
  'docs/knowledge/KB/METHOD_COVERAGE.md', // generated: scripts/kb/method-coverage.js
  'docs/knowledge/KB/CROSS_APP_METHODS.md', // curated per branch (driver lines differ)
  'docs/knowledge/KB/UNKNOWN_COMMANDS.md', // curated per branch (driver lines differ)
  'docs/knowledge/KB/DP_ENDPOINT_COVERAGE.md', // generated per branch (DP × endpoint matrix)
  'docs/knowledge/DEVICE_TRUTH.md', // generated: tools/ci/build-device-truth.js (reads drivers/)
  'docs/knowledge/device-truth.json', // generated: tools/ci/build-device-truth.js
  'docs/knowledge/KB/CODE_REFERENCE.md', // P3032 generated: scripts/kb/code-reference.js (reads this tree)
  'docs/knowledge/KB/DOC_COVERAGE.md', // P3032 generated: scripts/kb/doc-coverage.js (reads this tree)
]);

/** Patterns for any other generated per-branch coverage matrix (future *_COVERAGE.md files). */
const BRANCH_SPECIFIC_PATTERNS = Object.freeze([
  /^docs\/knowledge\/(?:KB\/)?[A-Z0-9_]+_COVERAGE\.(?:md|json)$/,
]);

/**
 * Regenerators run on the TARGET branch after a promote/sync. Each script lives in the target
 * tree and reads that tree's own code, so the output describes the target branch. Additive:
 * a missing script is skipped, never created.
 */
const REGENERATORS = Object.freeze([
  Object.freeze({ script: 'scripts/kb/method-coverage.js', outputs: Object.freeze(['docs/knowledge/KB/METHOD_COVERAGE.md']) }),
  // P3018 generator: reads the target tree's drivers, catalogue and interviews (deterministic).
  Object.freeze({ script: 'scripts/kb/dp-endpoint-coverage.js', outputs: Object.freeze(['docs/knowledge/KB/DP_ENDPOINT_COVERAGE.md']) }),
  // P3032 generators: code reference and doc coverage, both read the target tree only.
  Object.freeze({ script: 'scripts/kb/code-reference.js', outputs: Object.freeze(['docs/knowledge/KB/CODE_REFERENCE.md']) }),
  Object.freeze({ script: 'scripts/kb/doc-coverage.js', outputs: Object.freeze(['docs/knowledge/KB/DOC_COVERAGE.md']) }),
]);

function normalize(rel) {
  return String(rel || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function isBranchSpecific(rel) {
  const r = normalize(rel);
  if (BRANCH_SPECIFIC_PATHS.includes(r)) {return true;}
  return BRANCH_SPECIFIC_PATTERNS.some((re) => re.test(r));
}

/**
 * Run the regenerators inside rootDir. Returns the outputs that the git index sees as changed,
 * so the caller can stage them with its own commit. Never throws.
 */
function regenerateBranchDocs(rootDir, opts = {}) {
  const fs = require('fs');
  const path = require('path');
  const { execFileSync } = require('child_process');
  const exec = opts.execFileSync || execFileSync;
  const changed = [];
  const ran = [];
  for (const g of REGENERATORS) {
    const abs = path.join(rootDir, g.script);
    if (!fs.existsSync(abs)) {continue;}
    try {
      exec(process.execPath, [abs], { cwd: rootDir, stdio: 'pipe' });
      ran.push(g.script);
    } catch (e) {
      console.warn(`[branch-specific-paths] regenerate ${g.script} failed: ${e.message}`);
      continue;
    }
    for (const out of g.outputs) {
      try {
        const st = exec('git', ['status', '--porcelain', '--', out], { cwd: rootDir, encoding: 'utf8' });
        if (String(st || '').trim()) {changed.push(out);}
      } catch { /* not a git tree: nothing to stage */ }
    }
  }
  return { ran, changed };
}

module.exports = {
  BRANCH_SPECIFIC_PATHS,
  BRANCH_SPECIFIC_PATTERNS,
  REGENERATORS,
  isBranchSpecific,
  regenerateBranchDocs,
};
