// fix-yaml-separators-v2.js — P53
// Remove the extra `---` separator that P54 D1 commit 8565cb363 added
// between `defaults:` and `name:` in 11 workflows.
//
// The bot added:
//   defaults:
//     run:
//       shell: bash
//
//   ---            <-- BAD: extra separator
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
  // Find the pattern: `defaults:` ... `---` ... `name:`
  // Replace with just `defaults:` ... `name:` (no separator)
  const re = /(defaults:\s*\n(?:\s+\w+:.*\n)*[ \t]*---\s*\n)(name:)/;
  const match = content.match(re);
  if (!match) {
    console.log('  [NO MATCH]', f, '(pattern not found - may already be fixed)');
    ok++;
    continue;
  }
  const newContent = content.replace(re, '$1'); // Remove the `---` line
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
