#!/usr/bin/env node
// audit-gh-writes.js - find all scripts that POST/PUT to GitHub
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIRS = ['.github/scripts', '.github/workflows', 'tools/ci', 'tools/shadow-mode', '.diag'];

const WRITE_PATTERNS = [
  /\.issues\.createComment/,
  /\.issues\.create\b/,
  /\.issues\.update\b/,
  /\.issues\.addLabels/,
  /\.issues\.removeLabel/,
  /\.issues\.lock\b/,
  /\.issues\.unlock/,
  /\.pulls\.create\b/,
  /\.pulls\.update\b/,
  /\.pulls\.merge\b/,
  /\.repos\.createCommitStatus/,
  /octokit\.(issues|pulls|reactions|repos)\.(create|update|delete|merge|add|remove|lock|unlock)/,
  /gh\s+(issue|pr)\s+(create|close|merge|edit)/,
  /gh\s+api\s+.*-X\s+(POST|PUT|PATCH|DELETE)/,
  /fetch\s*\(.*method:\s*['"]POST['"]/,
];

const results = [];
for (const dir of DIRS) {
  const dirPath = path.join(ROOT, dir);
  if (!fs.existsSync(dirPath)) continue;
  walk(dirPath, results);
}

function walk(dir, results) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p, results);
    } else if (e.isFile() && (p.endsWith('.js') || p.endsWith('.yml') || p.endsWith('.yaml'))) {
      const c = fs.readFileSync(p, 'utf8');
      for (const pat of WRITE_PATTERNS) {
        if (pat.test(c)) {
          // Check if the script targets Johan
          const targetsJohan = c.includes('JohanBendz') && !c.includes('// SAFE') && !c.includes('# SAFE');
          results.push({
            file: p.replace(ROOT + '\\', ''),
            pattern: pat.source.substring(0, 60),
            targetsJohan: targetsJohan ? '⚠️ YES' : 'no',
            size: c.length,
          });
          break;
        }
      }
    }
  }
}

console.log('=== SCRIPTS THAT WRITE TO GITHUB ===');
console.log('Total: ' + results.length);
console.log('');
const targeted = results.filter(r => r.targetsJohan === '⚠️ YES');
console.log('Targeting Johan (DANGEROUS): ' + targeted.length);
for (const r of targeted) {
  console.log('  ⚠️ ' + r.file + ' (' + r.pattern + ')');
}
console.log('');
console.log('Other (target dlnraja or generic): ' + (results.length - targeted.length));
for (const r of results.filter(r => r.targetsJohan === 'no').slice(0, 20)) {
  console.log('  ' + r.file);
}
