#!/usr/bin/env node
'use strict';
// P3074: keep the maintainer's personal profile data (CV / LinkedIn exports, personal
// mailbox, phone) out of the repository. Fails on a tracked path or file content that
// matches the patterns below. Personal address and phone are compared by SHA-256 so
// this file does not carry them in plaintext.
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PATTERNS = [
  /myskills/i,
  /linkedin[_-]?cv/i,
  /linkedin[_-]?about/i,
  /linkedin\.com\/in\//i,
];
const HASHED = new Set([
  '83d41ed4fe9de6ca44d4295fc71fd5f0450bc457dc425433e697a8ed8098d19f',
  'fb96c5d5fb2337e86c2d353b4e1e9d4c50dba97e023d0bbaca3ce9bfdae4f77c',
  'dab391ff711549dfccb1335a62f3a59af2487b40d443108bb8d4c9d38c53b8b4',
]);
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const PHONE_RE = /(?:\+33[ .-]?|\b0)[1-9](?:[ .-]?\d{2}){4}\b/g;
const SELF = new Set(['tools/ci/personal-data-guard.js', 'test/p3074-personal-data-guard.test.js']);
const SKIP_PATH = /(^|\/)(node_modules\/|\.git\/)|\.(png|jpe?g|gif|webp|ico|zip|gz|pdf)$/i;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function normPhone(p) { const d = p.replace(/\D/g, ''); return d.startsWith('33') ? '0' + d.slice(2) : d; }

function scanText(text) {
  const out = [];
  for (const re of PATTERNS) if (re.test(text)) out.push(String(re));
  for (const m of text.match(EMAIL_RE) || []) if (HASHED.has(sha(m.toLowerCase()))) { out.push('personal-email'); break; }
  for (const m of text.match(PHONE_RE) || []) if (HASHED.has(sha(normPhone(m)))) { out.push('personal-phone'); break; }
  return out;
}
function scanPath(p) { return PATTERNS.filter((re) => re.test(p)).map(String); }

function trackedFiles(root) {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
}

function run(root) {
  const findings = [];
  for (const f of trackedFiles(root)) {
    if (SELF.has(f)) continue;
    const hits = scanPath(f).map((h) => 'path:' + h);
    if (!SKIP_PATH.test(f)) {
      let t = null; try { t = fs.readFileSync(path.join(root, f), 'utf8'); } catch { /* deleted or unreadable */ }
      if (t && !t.includes('\u0000')) hits.push(...scanText(t));
    }
    if (hits.length) findings.push({ file: f, hits });
  }
  return findings;
}

module.exports = { scanText, scanPath, run, normPhone };

if (require.main === module) {
  const res = run(process.cwd());
  for (const r of res) console.log(`FOUND ${r.hits.join(', ')} in ${r.file}`);
  if (res.length) { console.error(`personal-data-guard: ${res.length} file(s) with personal profile data`); process.exit(1); }
  console.log('personal-data-guard: clean');
}
