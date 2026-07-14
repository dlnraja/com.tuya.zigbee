// fix-yaml-separators-v2.js — P53 (updated P55.1 for stable)
// Remove the extra `---` separator that P54 D1 commit 8565cb363 added
// between `defaults:` and the next section (name: or comment block) in 11
// workflows.
//
// The bot added:
//   defaults:
//     run:
//       shell: bash
//
//   ---            <-- BAD: extra separator
//   # comment
//   name: ...
//
// GHA workflow files should have at most ONE `---` separator (at the start
// of the document). Multiple separators break YAML parsing.
//
// Run: node tools/ci/fix-yaml-separators-v2.js
//      node tools/ci/fix-yaml-separators-v2.js --apply
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIR = path.join(ROOT, '.github', 'workflows');
const APPLY = process.argv.includes('--apply');

// Workflows affected by P54 D1
const AFFECTED = [
  'activity-monitor.yml',
  'autonomous-verification.yml',
  'continuous-flow.yml',
  'delete-johan-comments.yml',
  'delete-own-upstream-comments.yml',
  'e2e-dashboard-test.yml',
  'offline-crash-analyzer.yml',
  'recurrent-orchestrator.yml',
  'shadow-policy-check.yml',
  'temporal-monitor.yml',
  'upstream-guard.yml',
];

console.log('=== Fix extra --- separators in 11 workflows (P54 D1 regression) ===\n');
let fixed = 0, ok = 0, missing = 0;

for (const f of AFFECTED) {
  const full = path.join(DIR, f);
  if (!fs.existsSync(full)) {
    console.log('  [MISSING]', f);
    missing++;
    continue;
  }
  let content = fs.readFileSync(full, 'utf8');
  // Find pattern: `defaults:` ... (any lines) ... `---` (then anything)
  // The `---` line should be removed. We use a non-capturing group for the
  // first part and capture the rest to preserve it.
  const re = /(defaults:\s*\n(?:\s+\S.*\n)*\n)[ \t]*---\s*\n/;
  const match = content.match(re);
  if (!match) {
    console.log('  [NO MATCH]', f, '(pattern not found - may already be fixed)');
    ok++;
    continue;
  }
  // Replace: keep $1 (the defaults block), drop the `---` line.
  const newContent = content.replace(re, '$1');
  if (APPLY) {
    fs.writeFileSync(full, newContent);
    console.log('  [FIXED]', f);
    fixed++;
  } else {
    console.log('  [WOULD FIX]', f);
    fixed++;
  }
}

console.log(`\n${APPLY ? 'FIXED' : 'WOULD FIX'}: ${fixed}, ok: ${ok}, missing: ${missing}`);
if (!APPLY && fixed > 0) console.log('Run with --apply to actually fix');
