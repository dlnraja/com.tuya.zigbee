#!/usr/bin/env node
// search-tokens.js - thoroughly search for GH tokens
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const SEARCH_DIRS = [
  path.join(HOME, '.codex'),
  path.join(HOME, '.mavis'),
  path.join(HOME, 'AppData', 'Roaming', 'MiniMax Agent'),
  path.join(HOME, 'AppData', 'Local', 'MiniMax Agent'),
  path.join(HOME, 'AppData', 'Roaming', 'MiniMax'),
  path.join(HOME, '.config'),
  path.join(HOME, '.local', 'share'),
  'C:\\Users\\Dell\\Documents\\homey',
];

const PATTERNS = [
  /ghp_[a-zA-Z0-9]{20,}/g,
  /github_pat_[a-zA-Z0-9_]{20,}/g,
  /ghs_[a-zA-Z0-9]{20,}/g,
  /gho_[a-zA-Z0-9]{20,}/g,
  /HOM[AE]Y_PAT[=:\s]+[a-zA-Z0-9_-]+/gi,
  /HOMEY_[A-Z_]+:\s*[a-zA-Z0-9_-]+/g,
];

const MASK = (s) => s.length > 12 ? s.substring(0, 7) + '***' + s.substring(s.length - 4) : '***';

const results = [];
let scanned = 0;
let filesRead = 0;

function walk(dir, depth = 0) {
  if (depth > 6) return;
  if (!fs.existsSync(dir)) return;
  try {
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') && e.name !== '.env') continue;
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p, depth + 1);
      } else if (e.isFile() && e.size < 5_000_000) {
        filesRead++;
        try {
          const c = fs.readFileSync(p, 'utf8');
          for (const pat of PATTERNS) {
            const matches = c.match(pat);
            if (matches) {
              for (const m of matches) {
                results.push({ file: p, pattern: pat.source.substring(0, 30), value: MASK(m) });
              }
            }
          }
        } catch {}
      }
    }
  } catch {}
}

for (const d of SEARCH_DIRS) {
  scanned++;
  walk(d);
}

console.log('Scanned dirs:', scanned, '| Files read:', filesRead);
console.log('Found tokens:', results.length);
if (results.length > 0) {
  // Dedup
  const seen = new Set();
  const unique = results.filter(r => {
    const key = r.file + r.value;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  for (const r of unique.slice(0, 30)) {
    console.log('  ' + r.file);
    console.log('    pattern: ' + r.pattern);
    console.log('    value: ' + r.value);
  }
}
