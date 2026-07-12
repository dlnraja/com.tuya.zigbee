// brute-force-token-scan.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const HOME = os.homedir();

const PATTERNS = [
  /ghp_[a-zA-Z0-9]{20,}/g,
  /github_pat_[a-zA-Z0-9_]{20,}/g,
  /ghs_[a-zA-Z0-9]{20,}/g,
  /gho_[a-zA-Z0-9]{20,}/g,
];
const MASK = (s) => s.length > 12 ? s.substring(0, 10) + '***' + s.substring(s.length - 4) : '***';

const SCAN_DIRS = [
  HOME,
  path.join(HOME, '.codex'),
  path.join(HOME, '.mavis'),
  path.join(HOME, 'AppData'),
  path.join(HOME, 'Documents'),
  path.join(HOME, 'Tools'),
];

const SKIP = ['node_modules', '.git', 'site-packages', '.cache'];
let scanned = 0;
const found = [];

function walk(dir, depth) {
  if (depth === undefined) depth = 0;
  if (depth > 8) return;
  if (!fs.existsSync(dir)) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP.includes(e.name)) continue;
    if (e.name.startsWith('.') && depth > 0 && e.name !== '.env') continue;
    const p = path.join(dir, e.name);
    try {
      const stat = fs.statSync(p);
      if (e.isDirectory()) {
        walk(p, depth + 1);
      } else if (e.isFile() && stat.size < 500000 && stat.size > 0) {
        scanned++;
        const c = fs.readFileSync(p, 'utf8');
        for (const pat of PATTERNS) {
          const m = c.match(pat);
          if (m) {
            for (const match of m) {
              if (match.length > 20) found.push({ file: p, value: match });
            }
          }
        }
      }
    } catch {}
  }
}

const start = Date.now();
for (const d of SCAN_DIRS) walk(d);
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log('Scanned:', scanned, 'files in', elapsed + 's');
console.log('Found GH tokens:', found.length);
if (found.length > 0) {
  for (const f of found.slice(0, 30)) {
    console.log('  ' + f.file);
    console.log('    ' + MASK(f.value));
  }
}
