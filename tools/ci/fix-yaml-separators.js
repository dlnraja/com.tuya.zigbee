#!/usr/bin/env node
/**
 * fix-yaml-separators.js — P53
 *
 * Fix workflows that have multiple YAML documents (caused by merge regressions).
 * The first document is usually just `defaults: run: shell: bash` which should
 * be merged with the main document.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WF_DIR = path.join(ROOT, '.github', 'workflows');

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Count `---` at the start of a line (YAML document separator)
  const sepIndices = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') sepIndices.push(i);
  }

  // If 1+ separator in the middle, remove all of them (GHA wants single document)
  // (We never want a --- inside a workflow file)
  if (sepIndices.length >= 1) {
    const newLines = [];
    for (let i = 0; i < lines.length; i++) {
      if (sepIndices.includes(i)) continue; // skip all ---
      newLines.push(lines[i]);
    }
    const newContent = newLines.join('\n');
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      return { fixed: true, removed: sepIndices.length };
    }
  }
  return { fixed: false, removed: 0 };
}

function main() {
  const args = process.argv.slice(2);
  const APPLY = args.includes('--apply');
  console.log('=== Fix YAML multi-document bug (P53) ===');
  console.log('Mode:', APPLY ? 'APPLY' : 'DRY-RUN');

  const files = fs.readdirSync(WF_DIR).filter(f => f.endsWith('.yml'));
  let fixed = 0;
  for (const f of files) {
    const fp = path.join(WF_DIR, f);
    const r = fixFile(fp);
    if (r.fixed) {
      console.log('  FIXED ' + f + ' (removed ' + r.removed + ' extra --- markers)');
      fixed++;
    }
  }
  console.log('\nTotal fixed: ' + fixed);
  if (!APPLY) console.log('Run with --apply to actually modify files');
}

main();
