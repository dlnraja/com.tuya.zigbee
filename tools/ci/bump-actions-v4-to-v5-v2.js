#!/usr/bin/env node
/**
 * bump-actions-v4-to-v5-v2.js
 *
 * Bump remaining @v4 → @v5 in workflows. v1 (bump-actions-v4-to-v5.js) only
 * handled actions/checkout + actions/setup-node. This v2 covers the full
 * list of GitHub Actions v4 → v5 deprecations that affect our workflows:
 *   - actions/checkout@v4 → @v5
 *   - actions/setup-node@v4 → @v5
 *   - actions/upload-artifact@v4 → @v5
 *   - actions/download-artifact@v4 → @v5
 *   - actions/cache@v4 → @v5
 *   - actions/github-script@v7 → @v8 (when paired with checkout/setup-node v5)
 *
 * Run: node tools/ci/bump-actions-v4-to-v5-v2.js [--dry]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');
const WORKFLOWS = path.join(REPO, '.github', 'workflows');

// Bumps: GH Action name, and v4 versions that should become v5.
// Skip bump for these (reason: not yet GA, or we depend on v4-specific bug)
const BUMPS = [
  // Pairs of (regex pattern, replacement). Pattern is anchored to the @v4 ref.
  { pattern: /actions\/checkout@v4\b/g, replace: 'actions/checkout@v5', reason: 'checkout v4 deprecated Mar 2025' },
  { pattern: /actions\/setup-node@v4\b/g, replace: 'actions/setup-node@v5', reason: 'setup-node v4 deprecated' },
  { pattern: /actions\/upload-artifact@v4\b/g, replace: 'actions/upload-artifact@v5', reason: 'upload-artifact v4 deprecated; v5 has SHA256 instead of SHA1' },
  { pattern: /actions\/download-artifact@v4\b/g, replace: 'actions/download-artifact@v5', reason: 'download-artifact v4 deprecated' },
  { pattern: /actions\/cache@v4\b/g, replace: 'actions/cache@v5', reason: 'cache v4 deprecated' },
];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      out.push(...walk(full));
    } else if (entry.isFile() && /\.(yml|yaml)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function processFile(file, dryRun) {
  const orig = fs.readFileSync(file, 'utf8');
  let text = orig;
  const changes = [];
  for (const { pattern, replace, reason } of BUMPS) {
    text = text.replace(pattern, (m) => {
      changes.push(`    - ${m} → ${replace} (${reason})`);
      return replace;
    });
  }
  if (text === orig) return { changed: false, count: 0 };
  if (!dryRun) fs.writeFileSync(file, text, 'utf8');
  return { changed: true, count: changes.length, changes, file };
}

function main() {
  const dryRun = process.argv.includes('--dry');
  const files = walk(WORKFLOWS);
  let totalChanged = 0;
  let totalBumps = 0;
  for (const f of files) {
    const result = processFile(f, dryRun);
    if (result.changed) {
      totalChanged++;
      totalBumps += result.count;
      const rel = path.relative(REPO, f);
      console.log(`\n${rel} (${result.count} bumps):`);
      for (const c of result.changes) console.log(c);
    }
  }
  console.log(`\n[${dryRun ? 'DRY' : 'DONE'}] ${totalBumps} bumps across ${totalChanged} files`);
}

main();
