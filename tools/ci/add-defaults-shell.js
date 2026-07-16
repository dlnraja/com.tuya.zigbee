#!/usr/bin/env node
/**
 * P72.2 — Add `defaults.run.shell: bash` to workflows that are missing it.
 * Prevents PowerShell failures on Windows runners.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const WF_DIR = path.join(ROOT, '.github', 'workflows');

const files = [
  'nightly-audit.yml',
  'publish-diagnose.yml',
  'publish-self-heal.yml',
  'smart-update.yml',
];

for (const f of files) {
  const fp = path.join(WF_DIR, f);
  if (!fs.existsSync(fp)) {
    console.log(`SKIP ${f} (not found)`);
    continue;
  }
  let content = fs.readFileSync(fp, 'utf8');
  if (content.includes('defaults:\n  run:\n    shell: bash') || content.includes('shell: bash')) {
    console.log(`OK ${f} (already has defaults.run.shell)`);
    continue;
  }
  // Find the line after `permissions:` block (ends at first empty line after non-indented content).
  // Simpler: insert after first occurrence of `permissions:\n  contents: read` (or any permissions: block end).
  // The block ends with the last permission line; insert defaults: after the empty line following.
  // Use regex: match `^permissions:\n((  \w+: \w+(\n|  \w+: \w+\n)*)\n)` and insert defaults after.
  const re = /(permissions:\n(?:\s+\w+:\s*\w+\n)*)/m;
  const m = content.match(re);
  if (!m) {
    console.log(`SKIP ${f} (no permissions block found)`);
    continue;
  }
  const insert = m[0] + 'defaults:\n  run:\n    shell: bash\n\n';
  content = content.replace(re, insert);
  fs.writeFileSync(fp, content, 'utf8');
  console.log(`FIXED ${f}`);
}
