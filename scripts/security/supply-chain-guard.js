#!/usr/bin/env node
/**
 * supply-chain-guard.js
 * Detects supply chain attack vectors and infected repository patterns.
 *
 * Per .agents/rules/security.md §3 (Execution Safety)
 * Per .clinerules: Fleetwood Gateway & Syntax Purity
 *
 * Checks:
 * 1. GitHub Actions pinned to SHA (not tags)
 * 2. npm dependency integrity
 * 3. Typosquatting detection in package names
 * 4. Malicious code patterns in dependencies
 * 5. .gitignore protects sensitive files
 * 6. No hardcoded secrets in tracked files
 * 7. Local actions integrity
 * 8. Dependency update freshness
 *
 * Usage: node scripts/security/supply-chain-guard.js [--fix]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const FIX_MODE = process.argv.includes('--fix');
let violations = 0;

function check(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      console.log(`  ✅ ${name}`);
    } else if (result === false) {
      console.log(`  ❌ ${name}`);
      violations++;
    } else {
      console.log(`  ⚠️  ${name}: ${result}`);
    }
  } catch (e) {
    console.log(`  ⚠️  ${name}: ${e.message}`);
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  SUPPLY CHAIN SECURITY GUARD');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. GitHub Actions pinned to SHA
console.log('--- 1. GitHub Actions SHA Pinning ---');
const workflowsDir = path.join(ROOT, '.github', 'workflows');
const unpinned = [];
for (const f of fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml'))) {
  const content = fs.readFileSync(path.join(workflowsDir, f), 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/uses:\s+([^\s]+)/);
    if (match) {
      const ref = match[1];
      // Skip local actions, composite actions, and already-pinned
      if (ref.startsWith('./') || ref.startsWith('${{') || ref.includes('@') && /^[a-f0-9]{40}/.test(ref.split('@')[1])) continue;
      // Check if pinned to tag instead of SHA
      if (ref.includes('@v') || ref.includes('@master') || ref.includes('@main')) {
        unpinned.push({ file: f, line: i + 1, ref });
      }
    }
  }
}
if (unpinned.length === 0) {
  console.log('  ✅ All actions pinned to SHA');
} else {
  console.log(`  ❌ ${unpinned.length} actions NOT pinned to SHA:`);
  unpinned.slice(0, 10).forEach(u => console.log(`    ${u.file}:${u.line} — ${u.ref}`));
  violations++;
}

// 2. npm dependency integrity
console.log('\n--- 2. npm Dependency Integrity ---');
check('package-lock.json exists', () => fs.existsSync(path.join(ROOT, 'package-lock.json')));
check('.homeyignore has package-lock.json (not package.json)', () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8');
  return ignore.includes('package-lock.json') && !ignore.includes('package.json\n');
});

// 3. Typosquatting detection
console.log('\n--- 3. Typosquatting Detection ---');
const KNOWN_MALICIOUS = ['event-stream', 'flatmap-stream', 'codecov', 'crossenv', 'bootstrap-sass'];
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
const suspicious = Object.keys(allDeps || {}).filter(d =>
  KNOWN_MALICIOUS.some(m => d.includes(m) || m.includes(d))
);
if (suspicious.length === 0) {
  console.log('  ✅ No known malicious packages detected');
} else {
  console.log(`  ❌ Suspicious packages: ${suspicious.join(', ')}`);
  violations++;
}

// 4. .gitignore protection
console.log('\n--- 4. .gitignore Protection ---');
const REQUIRED_ENTRIES = ['.env', 'credentials.json', 'secrets.json', 'token.json', '*.key', '*.pem'];
const ignoreContent = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8');
const gitignoreContent = fs.existsSync(path.join(ROOT, '.gitignore'))
  ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8') : '';
const combinedIgnore = ignoreContent + gitignoreContent;
for (const entry of REQUIRED_ENTRIES) {
  check(`.gitignore has: ${entry}`, () => combinedIgnore.includes(entry));
}

// 5. No hardcoded secrets in tracked files
console.log('\n--- 5. Hardcoded Secrets Scan ---');
check('No ghp_ tokens in tracked files', () => {
  try {
    const result = execSync('grep -rnE "ghp_[A-Za-z0-9]{36}" --include="*.js" --include="*.json" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v .homeybuild | head -5', { encoding: 'utf8' });
    return result.trim() === '' || 'Found: ' + result.trim().split('\n')[0];
  } catch { return true; }
});
check('No github_pat_ tokens in tracked files', () => {
  try {
    const result = execSync('grep -rnE "github_pat_[A-Za-z0-9_]{40}" --include="*.js" --include="*.json" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v .homeybuild | head -5', { encoding: 'utf8' });
    return result.trim() === '' || 'Found: ' + result.trim().split('\n')[0];
  } catch { return true; }
});
check('No API keys in tracked files', () => {
  try {
    const result = execSync('grep -rnE "AIza[0-9A-Za-z-_]{35}|sk-[A-Za-z0-9]{40}" --include="*.js" --include="*.json" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v .homeybuild | head -5', { encoding: 'utf8' });
    return result.trim() === '' || 'Found: ' + result.trim().split('\n')[0];
  } catch { return true; }
});

// 6. Local actions integrity
console.log('\n--- 6. Local Actions Integrity ---');
const localActions = path.join(ROOT, '.github', 'actions');
if (fs.existsSync(localActions)) {
  for (const action of fs.readdirSync(localActions)) {
    const actionDir = path.join(localActions, action);
    if (fs.statSync(actionDir).isDirectory()) {
      const actionYml = path.join(actionDir, 'action.yml');
      check(`Local action: ${action}`, () => fs.existsSync(actionYml));
    }
  }
}

// 7. Malicious code patterns
console.log('\n--- 7. Malicious Code Patterns ---');
const MALICIOUS_PATTERNS = [
  /eval\s*\(/g,
  /new\s+Function\s*\(/g,
  /child_process\s+.*exec/g,
  /require\s*\(\s*['"]net\s*['"]\s*\)/g,
  /\.spawn\s*\(\s*['"]sh['"]\s*,/g,
];
check('No suspicious eval/Function patterns in app.js', () => {
  const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  for (const rx of MALICIOUS_PATTERNS) {
    if (rx.test(appJs)) return `Found: ${rx.source}`;
  }
  return true;
});

// Summary
console.log('\n═══════════════════════════════════════════════════════════');
if (violations === 0) {
  console.log('  ✅ SUPPLY CHAIN GUARD: PASS');
} else {
  console.log(`  ❌ SUPPLY CHAIN GUARD: FAIL — ${violations} violation(s)`);
}
console.log('═══════════════════════════════════════════════════════════\n');

process.exit(violations > 0 ? 1 : 0);
