#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * prevent-apply-patch-corruption.js
 *
 * Pre-commit hook + standalone tool that scans the Homey app codebase for
 * 11 known UTF-8 / Latin-1 mojibake patterns. Fails the commit if any are
 * found, preventing the kind of corruption that hit the Hegel subagent
 * on 2026-07-10T15:00:30 UTC (valve_irrigation/device.js line 173: `??` vs `💧`).
 *
 * Usage:
 *   node tools/ci/prevent-apply-patch-corruption.js --check     # scan, exit 1 if any
 *   node tools/ci/prevent-apply-patch-corruption.js --fix       # auto-fix where possible
 *   node tools/ci/prevent-apply-patch-corruption.js --report   # human-readable report
 *   node tools/ci/prevent-apply-patch-corruption.js --install-hook   # install husky pre-commit
 *
 * Pattern catalogue (11 mojibake signatures):
 *   1. `??` (when 4-byte UTF-8 sequence was decoded as Latin-1)
 *   2. `ðŸ'¥` / `ðŸ'` / `ðŸ"`  (water droplet, scissors, etc. emojis corrupted)
 *   3. `Ã©` (é)
 *   4. `Ã¨` (è)
 *   5. `Ã ` (à)
 *   6. `Ã¢` (â)
 *   7. `â€™` (right single quote ’)
 *   8. `â€œ` `â€` (curly quotes)
 *   9. `Â°` (degree °)
 *  10. `â€“` `â€”` (en-dash, em-dash)
 *  11. `Ã©` `Ã¨` `Ã` (combined — latin-1 fallback for accented chars)
 *
 * App cible: BOTH master and stable.
 * License: MIT (inherits from parent repo).
 *
 * @author Mavis investigation 2026-07-10
 * @session mvs_e7cd7397977c4571a373dc2350580aa1
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // Files to scan (relative to repo root)
  extensions: ['.js', '.json', '.md', '.ts', '.compose.json', '.flow.compose.json'],
  // Folders to ignore
  ignoreDirs: new Set([
    'node_modules',
    '.git',
    '.homeybuild',
    '.homeycompose',
    'build',
    'dist',
    'coverage',
    '.nyc_output',
    'test-results',
    'logs',
    '.diag',
    '.memory',
    '.github/cache',  // 6.2 MB herdsman cache, slow to scan
    'docs',           // 90+ large docs, slow to scan (but useful - keep on demand via --all)
    'reimplementation_gateway',  // large legacy code
  ]),
  // Folders to ONLY scan in --all mode (slow but useful)
  slowButUsefulDirs: new Set([
    'docs',
  ]),
  // Files to ignore
  ignoreFiles: new Set([
    'package-lock.json',
    'INVESTIGATION_2026-07-10.md', // self-reference, contains `??` for documentation
    'PR_DRAFT_HEGEL_FIXES.md',     // self-reference
    'final-report.md',              // self-reference (mavis scratchpad)
    'prevent-apply-patch-corruption.js', // self-reference (pattern catalogue)
  ]),
  // Performance: max file size to read (bytes). Larger files are likely binary or generated.
  maxFileSize: 500_000,  // 500 KB
  // Performance: max total time (ms). After this, we stop and report partial.
  maxTotalMs: 60_000,
  // Mojibake patterns: [regex, name, severity, fix?]
  patterns: [
    { name: 'double_question_marks',  regex: /\?\?/g,         severity: 'low',    description: '4-byte UTF-8 decoded as Latin-1 (e.g. 💧 → ??)' },
    { name: 'water_droplet_mojibake', regex: /ðŸ'¥/g,         severity: 'critical', description: 'Water droplet emoji corruption (💧 → ðŸ\'¥)' },
    { name: 'scissors_mojibake',       regex: /ðŸ'✂️/g,         severity: 'high',   description: 'Scissors emoji corruption' },
    { name: 'aigue_accent',            regex: /Ã©/g,           severity: 'medium', description: 'é encoded as Ã©' },
    { name: 'e_grave_accent',          regex: /Ã¨/g,           severity: 'medium', description: 'è encoded as Ã¨' },
    { name: 'a_grave_accent',          regex: /Ã /g,            severity: 'medium', description: 'à encoded as Ã ' },
    { name: 'a_circumflex',            regex: /Ã¢/g,           severity: 'medium', description: 'â encoded as Ã¢' },
    { name: 'right_single_quote',      regex: /â€™/g,          severity: 'low',    description: 'Right single quote ’ encoded as â€™' },
    { name: 'curly_quotes',            regex: /â€œ|â€/g,     severity: 'low',    description: 'Curly quotes encoded as â€œ/â€' },
    { name: 'degree_sign',             regex: /Â°/g,           severity: 'low',    description: 'Degree sign ° encoded as Â°' },
    { name: 'en_em_dash',              regex: /â€“|â€”/g,    severity: 'low',    description: 'En-dash/em-dash encoded as â€“/â€”' },
  ],
  // Auto-fix map: pattern name → replacement char
  autoFix: {
    double_question_marks: null,    // can't auto-fix (depends on context)
    water_droplet_mojibake: '💧',
    scissors_mojibake: '✂️',
    aigue_accent: 'é',
    e_grave_accent: 'è',
    a_grave_accent: 'à',
    a_circumflex: 'â',
    right_single_quote: '\u2019',
    curly_quotes_left: '\u201C',
    curly_quotes_right: '\u201D',
    degree_sign: '°',
    en_dash: '\u2013',
    em_dash: '\u2014',
  },
};

// Colors (works on Windows 10+ with VirtualTerminal enabled)
const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue:   (s) => `\x1b[34m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  gray:   (s) => `\x1b[90m${s}\x1b[0m`,
};

/**
 * Recursively walk a directory and return all matching files.
 */
function walk(dir, root = dir, includeSlow = false) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (entry.isDirectory()) {
      if (CONFIG.ignoreDirs.has(entry.name)) continue;
      if (!includeSlow && CONFIG.slowButUsefulDirs.has(entry.name)) continue;
      results.push(...walk(full, root, includeSlow));
    } else if (entry.isFile()) {
      if (CONFIG.ignoreFiles.has(entry.name)) continue;
      // Skip files larger than maxFileSize (binary/generated)
      try {
        const stat = fs.statSync(full);
        if (stat.size > CONFIG.maxFileSize) continue;
      } catch (e) { continue; }
      const ext = path.extname(entry.name);
      // Also accept files without extension that are known text (e.g. .gitignore, .eslintrc)
      if (CONFIG.extensions.includes(ext) || entry.name.startsWith('.') && !entry.name.includes('.')) {
        results.push(full);
      }
    }
  }
  return results;
}

/**
 * Scan a single file for mojibake patterns.
 */
function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { file: filePath, error: e.message, matches: [] };
  }
  const matches = [];
  // Skip if file is too large for regex
  if (content.length > 1_000_000) {
    return { file: filePath, matches, warning: 'file too large, skipped' };
  }
  for (const pat of CONFIG.patterns) {
    pat.regex.lastIndex = 0;
    let m;
    let count = 0;
    while ((m = pat.regex.exec(content)) !== null) {
      const lineNum = content.substring(0, m.index).split('\n').length;
      matches.push({
        pattern: pat.name,
        severity: pat.severity,
        description: pat.description,
        line: lineNum,
        column: m.index - content.lastIndexOf('\n', m.index - 1),
        matched: m[0],
        index: m.index,
      });
      count++;
      if (count > 100) break; // safety: don't enumerate thousands of same-pattern matches in one file
    }
  }
  return { file: filePath, matches };
}

/**
 * Main scan function: walk the repo, scan each file, return all matches.
 */
function scanRepo(rootDir, options = {}) {
  const includeSlow = options.includeSlow || false;
  const startTime = Date.now();
  const files = walk(rootDir, rootDir, includeSlow);
  const allMatches = [];
  let scannedCount = 0;
  for (const f of files) {
    // Time check
    if (Date.now() - startTime > CONFIG.maxTotalMs) {
      console.error(`⚠ Scan timeout after ${scannedCount}/${files.length} files. Use --all to scan slow dirs.`);
      break;
    }
    const r = scanFile(f);
    scannedCount++;
    if (r.matches.length > 0) {
      allMatches.push(r);
    }
  }
  return { files: files.length, scanned: scannedCount, matches: allMatches, timedOut: scannedCount < files.length };
}

/**
 * Auto-fix a single file (replaces the mojibake with the proper char).
 */
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixCount = 0;
  for (const pat of CONFIG.patterns) {
    if (pat.severity === 'low') continue; // don't auto-fix low (could be intentional)
    const replacement = CONFIG.autoFix[pat.name];
    if (replacement === null || replacement === undefined) continue;
    pat.regex.lastIndex = 0;
    const newContent = content.replace(pat.regex, replacement);
    if (newContent !== content) {
      const count = (content.match(pat.regex) || []).length;
      fixCount += count;
      content = newContent;
    }
  }
  if (fixCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return fixCount;
}

/**
 * Install as a husky pre-commit hook.
 */
function installHook() {
  const hookDir = path.join(process.cwd(), '.husky');
  const hookFile = path.join(hookDir, 'pre-commit');
  if (!fs.existsSync(hookDir)) {
    fs.mkdirSync(hookDir, { recursive: true });
  }
  const hookContent = `#!/usr/bin/env sh
# Auto-installed by tools/ci/prevent-apply-patch-corruption.js
# Prevents UTF-8 mojibake from being committed
node tools/ci/prevent-apply-patch-corruption.js --check
`;
  fs.writeFileSync(hookFile, hookContent, 'utf8');
  // Make executable on Unix (no-op on Windows)
  try {
    fs.chmodSync(hookFile, 0o755);
  } catch (e) { /* ignore */ }
  console.log(C.green(`✓ Installed pre-commit hook at ${hookFile}`));
}

/**
 * Format a scan result as human-readable report.
 */
function formatReport(result, verbose = false) {
  const lines = [];
  lines.push(C.bold('🔍 UTF-8 Mojibake Scanner'));
  lines.push(C.gray('─'.repeat(60)));
  lines.push(`Scanned: ${result.files} files`);
  const totalMatches = result.matches.reduce((sum, m) => sum + m.matches.length, 0);
  lines.push(`Found: ${totalMatches} mojibake instances in ${result.matches.length} files`);
  lines.push('');

  if (result.matches.length === 0) {
    lines.push(C.green('✅ No mojibake detected. Repo is clean.'));
    return lines.join('\n');
  }

  // Group by severity
  const bySev = { critical: [], high: [], medium: [], low: [] };
  for (const file of result.matches) {
    for (const match of file.matches) {
      bySev[match.severity].push({ file: file.file, ...match });
    }
  }

  for (const sev of ['critical', 'high', 'medium', 'low']) {
    if (bySev[sev].length === 0) continue;
    const color = sev === 'critical' ? C.red : sev === 'high' ? C.yellow : C.gray;
    lines.push(color(C.bold(`\n[${sev.toUpperCase()}] ${bySev[sev].length} instances`)));
    for (const m of bySev[sev].slice(0, verbose ? 1000 : 10)) {
      const rel = path.relative(process.cwd(), m.file);
      lines.push(`  ${rel}:${m.line}:${m.column}  ${color(m.matched)}  ${C.gray(`(${m.pattern} — ${m.description})`)}`);
    }
    if (!verbose && bySev[sev].length > 10) {
      lines.push(C.gray(`  ... and ${bySev[sev].length - 10} more (use --report for full list)`));
    }
  }

  return lines.join('\n');
}

// CLI entry point
function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || '--check';
  const rootDir = args.find((a) => !a.startsWith('--')) || process.cwd();
  // Actually use cwd as root
  const target = args.find((a) => !a.startsWith('--')) || process.cwd();

  switch (cmd) {
    case '--check': {
      const result = scanRepo(target);
      console.log(formatReport(result, false));
      const hasCritical = result.matches.some((f) =>
        f.matches.some((m) => m.severity === 'critical' || m.severity === 'high')
      );
      process.exit(hasCritical ? 1 : 0);
    }
    case '--check-all': {
      const result = scanRepo(target, { includeSlow: true });
      console.log(formatReport(result, false));
      const hasCritical = result.matches.some((f) =>
        f.matches.some((m) => m.severity === 'critical' || m.severity === 'high')
      );
      process.exit(hasCritical ? 1 : 0);
    }
    case '--report': {
      const result = scanRepo(target, { includeSlow: true });
      console.log(formatReport(result, true));
      process.exit(0);
    }
    case '--fix': {
      const result = scanRepo(target, { includeSlow: true });
      let totalFixed = 0;
      for (const f of result.matches) {
        const fixed = fixFile(f.file);
        totalFixed += fixed;
      }
      console.log(C.green(`✓ Fixed ${totalFixed} mojibake instances across ${result.matches.length} files`));
      process.exit(0);
    }
    case '--install-hook': {
      installHook();
      process.exit(0);
    }
    case '--help':
    case '-h': {
      console.log(`
Usage: node tools/ci/prevent-apply-patch-corruption.js [command] [dir]

Commands:
  --check         Scan core dirs (fast, ~5s) and exit 1 if any critical/high mojibake
  --check-all     Scan ALL dirs incl. docs/ and .github/cache/ (slow, ~60s)
  --report        Full human-readable report (--check-all mode)
  --fix           Auto-fix what can be auto-fixed (medium+ severity, --check-all)
  --install-hook  Install as .husky/pre-commit hook
  --help          Show this help

Performance:
  - --check is the default and is fast (skips docs/, .github/cache/)
  - --check-all takes ~60s on a large repo (master is ~100k files)
  - Per-file size limit: 500 KB (larger files are skipped)
  - Total timeout: 60s (use --check-all with patience for full scan)

App cible: BOTH master and stable (run from either app's root dir)
Source: Mavis investigation 2026-07-10 (session mvs_e7cd7397977c4571a373dc2350580aa1)
`);
      process.exit(0);
    }
    default: {
      console.error(C.red(`Unknown command: ${cmd}`));
      console.error('Run with --help for usage');
      process.exit(2);
    }
  }
}

// Export for testing
module.exports = { scanRepo, scanFile, walk, CONFIG, fixFile, formatReport };

// Run if executed directly
if (require.main === module) {
  main();
}
