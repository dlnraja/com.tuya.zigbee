#!/usr/bin/env node
// scripts/security/secret-scan.js
// Scan all tracked/staged files for hardcoded secrets, tokens, credentials
// Exit 1 if any leak found — run in CI pre-commit/pre-push gate
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Patterns ────────────────────────────────────────────────────────────────
const PATTERNS = [
  // High-confidence: these look like real tokens/keys
  { name: 'GitHub PAT (ghp_)',       re: /ghp_[A-Za-z0-9]{36,}/g },
  { name: 'GitHub PAT (github_pat)', re: /github_pat_[A-Za-z0-9_]{40,}/g },
  { name: 'GitHub OAuth token',      re: /gho_[A-Za-z0-9]{36,}/g },
  { name: 'GitHub App token',        re: /ghs_[A-Za-z0-9]{36,}/g },
  { name: 'OpenAI key',              re: /sk-[A-Za-z0-9]{40,}/g },
  { name: 'Google API key',          re: /AIza[0-9A-Za-z-_]{35}/g },
  { name: 'AWS Access Key',          re: /AKIA[0-9A-Z]{16}/g },
  { name: 'Slack token',             re: /xox[baprs]-[0-9a-zA-Z\-]{10,}/g },
  { name: 'Private key block',       re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  // Medium-confidence: only flag when value is a QUOTED STRING LITERAL
  // This avoids false positives from variable references like `password: myVar` or `apiKey=o.apiKey`
  { name: 'Hardcoded password',      re: /(?:password|passwd|pwd)\s*[:=]\s*["'][^\s"'$\{<>|]{8,}["']/gi },
  { name: 'Hardcoded secret value',  re: /(?:\bsecret\b|\bapi_key\b|\bapiKey\b)\s*[:=]\s*["'][^\s"'$\{<>|]{8,}["']/g },
  { name: 'Homey refresh token',     re: /"refresh_token"\s*:\s*"[A-Za-z0-9._-]{20,}"/g },
];

// ─── Allowlist (safe false positives) ────────────────────────────────────────
const ALLOWLIST = [
  /\$\{\{?\s*(secrets|env)\./,          // GitHub Actions secret references
  /process\.env\./,                      // Node env references
  /\$\{process\.env/,
  /this\.homey\.(settings|manifest)/,    // Homey SDK settings access
  /this\.homey\.app\./,                  // Homey SDK app access
  /homey\.settings\.get/,                // Homey settings getter
  /getSecret|setSetting|getSetting/,     // Homey SDK setting methods
  /\bexample\b/i,                        // example/sample values
  /\bplaceholder\b/i,
  /\bdummy\b/i,
  /\byour[_-]?token\b/i,
  /\byour[_-]?api[_-]?key\b/i,
  /HOMEY_PAT_PLACEHOLDER/,
  /sk-\.\.\./,                           // truncated example
  /\*{4,}/,                              // masked: ****
  /# .*(token|secret|key)/i,             // commented docs
  /\/\/.*secret/i,                       // inline comment about secrets
  /require\(['"]/,                       // require statements mentioning secret
  /\.env\.example/,                      // example env files
  /getToken\(\)/,                        // method call, not value
  /secrets\.NAME/,                       // docs placeholder
];

// ─── Dirs / extensions to skip ───────────────────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.homeybuild', 'temp', 'tmp',
  'quarantine', 'screenshots', 'screenshots-debug',
  'promote-screenshots', 'push-promote-screenshots',
  'backup', '.archive', 'coverage', '.cache',
  'reports',        // auto-generated repomix/audit docs — not production code
  'docs',           // documentation — contains code examples
  '.github/cache',  // external cache
  '.agents',        // external agent skill docs — intentional code examples
]);
const SCAN_EXTENSIONS = new Set(['.js', '.ts', '.json', '.yml', '.yaml', '.env', '.sh', '.md']);

// ─── Walk ────────────────────────────────────────────────────────────────────
function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) { walk(fp, cb); }
    else if (SCAN_EXTENSIONS.has(path.extname(e.name).toLowerCase())) { cb(fp); }
  }
}

function isAllowed(match, context) {
  const combined = match + ' ' + context;
  return ALLOWLIST.some(re => re.test(combined));
}

// ─── Main ────────────────────────────────────────────────────────────────────
const ROOT = process.cwd();
const MODE = process.argv[2] || 'full'; // 'staged' | 'full'
let filesToScan = [];

if (MODE === 'staged') {
  try {
    const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
    filesToScan = staged.trim().split('\n').filter(Boolean)
      .filter(f => SCAN_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map(f => path.join(ROOT, f))
      .filter(f => fs.existsSync(f));
    console.log(`Scanning ${filesToScan.length} staged files…`);
  } catch { filesToScan = []; }
} else {
  walk(ROOT, f => filesToScan.push(f));
  console.log(`Scanning ${filesToScan.length} files…`);
}

let totalLeaks = 0;
const leakReport = [];

for (const fp of filesToScan) {
  let content;
  try { content = fs.readFileSync(fp, 'utf8'); } catch { continue; }
  const rel = path.relative(ROOT, fp);
  const lines = content.split('\n');
  
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      const lineNum = content.substring(0, m.index).split('\n').length;
      const lineContent = lines[lineNum - 1] || '';
      if (isAllowed(m[0], lineContent)) continue;
      leakReport.push({ file: rel, line: lineNum, pattern: name, excerpt: m[0].substring(0, 30) + '…' });
      totalLeaks++;
    }
    re.lastIndex = 0;
  }
}

if (leakReport.length > 0) {
  console.error('\n🚨 SECRET LEAK DETECTED 🚨');
  console.error('══════════════════════════════════════════════');
  leakReport.forEach(l => {
    console.error(`  ❌ [${l.pattern}] ${l.file}:${l.line}`);
    console.error(`     ${l.excerpt}`);
  });
  console.error('══════════════════════════════════════════════');
  console.error(`Total: ${totalLeaks} potential secret(s) found.`);
  console.error('→ Remove hardcoded values and use ${{ secrets.NAME }} or process.env.NAME instead.');
  process.exit(1);
} else {
  console.log(`✅ No secrets found in ${filesToScan.length} files.`);
  process.exit(0);
}
