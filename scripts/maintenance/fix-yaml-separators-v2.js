// fix-yaml-separators-v2.js — P54
// Remove the `---` separator that P54 D1 commit 8565cb363 added
// between `defaults:` and `name:` in 11 workflows. This `---` in the
// MIDDLE of the file makes yaml.load() see 2 documents, breaking the
// GHA workflow validator.
//
// Run: node fix-yaml-separators-v2.js
//      node fix-yaml-separators-v2.js --apply
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIR = path.join(ROOT, '.github', 'workflows');
const APPLY = process.argv.includes('--apply');

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.yml'));
let fixed = 0, ok = 0;

for (const f of files) {
  const full = path.join(DIR, f);
  let content = fs.readFileSync(full, 'utf8');
  // Find the pattern: empty line, then `---`, then empty line, then `name:`
  // This is the P54 D1 regression
  const re = /\n\n---\n(name:)/;
  const match = content.match(re);
  if (!match) {
    ok++;
    continue;
  }
  const newContent = content.replace(re, '\n\n$1');
  if (APPLY) {
    fs.writeFileSync(full, newContent);
    console.log('  [FIXED]', f);
    fixed++;
  } else {
    console.log('  [WOULD FIX]', f);
    fixed++;
  }
}

console.log(`\n${APPLY ? 'FIXED' : 'WOULD FIX'}: ${fixed}, ok: ${ok}`);
if (!APPLY && fixed > 0) console.log('Run with --apply to actually fix');
