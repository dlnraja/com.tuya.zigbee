#!/usr/bin/env node
/**
 * code-quality-check.js - Comprehensive Code Quality Verification
 * ================================================================
 * Checks all JS files for:
 *   1. Syntax errors (node --check)
 *   2. Banned patterns (console.log, raw setCapabilityValue)
 *   3. Empty catch blocks
 *   4. Timer leaks (setInterval without cleanup)
 *   5. Missing destroy guards (_destroyed check in async callbacks)
 *   6. CaseInsensitiveMatcher violations (manual .toLowerCase() on manufacturerName)
 *   7. Unsafe setCapabilityValue (without safe wrapper)
 *   8. Linear battery formulas
 *   9. Deprecated import paths (HybridSwitchBase, HybridSensorBase, etc.)
 *  10. Missing titleFormatted with [[device]] in flow cards
 *
 * Usage: node scripts/automation/code-quality-check.js
 * Exit code: 0 = clean, 1 = errors found, 2 = warnings only
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

// ── ANSI colors ──────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ── Report accumulators ──────────────────────────────────────────
const report = {
  errors: [],
  warnings: [],
  info: [],
  stats: {
    filesScanned: 0,
    syntaxErrors: 0,
    bannedPatterns: 0,
    emptyCatch: 0,
    timerLeaks: 0,
    missingDestroyGuard: 0,
    caseInsensitiveViolations: 0,
    unsafeSetCapability: 0,
    linearBattery: 0,
    deprecatedImports: 0,
    titleFormattedBugs: 0,
  },
};

function log(msg) { console.log(`${CYAN}[CODE-QUALITY]${RESET} ${msg}`); }
function err(msg) { report.errors.push(msg); console.error(`${RED}[ERROR]${RESET} ${msg}`); }
function warn(msg) { report.warnings.push(msg); console.warn(`${YELLOW}[WARN]${RESET} ${msg}`); }
function info(msg) { report.info.push(msg); }

// ── Exclude patterns ─────────────────────────────────────────────
const EXCLUDED_DIRS = [
  'node_modules', '.git', 'backup', '.archive', 'tmp', 'dumps',
  'data', 'scripts', '.github', 'docs', 'tools', 'scratch',
];
const EXCLUDED_FILES = [
  'package-lock.json', '.env.example',
];

function shouldExclude(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (EXCLUDED_FILES.some(f => rel.endsWith(f))) return true;
  return EXCLUDED_DIRS.some(d => rel.startsWith(d + path.sep) || rel.includes(path.sep + d + path.sep));
}

// ── Collect all JS files ─────────────────────────────────────────
function collectJsFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(entry.name)) {
          files.push(...collectJsFiles(fullPath));
        }
      } else if (entry.name.endsWith('.js') && !shouldExclude(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (e) { /* skip unreadable dirs */ }
  return files;
}

// ── 1. Syntax Check ──────────────────────────────────────────────
function checkSyntax(files) {
  log('Phase 1: Checking JS syntax (node --check)...');
  let syntaxErrors = 0;
  for (const f of files) {
    try {
      execSync(`node --check "${f}" 2>&1`, { encoding: 'utf8', timeout: 10000 });
    } catch (e) {
      const output = (e.stdout || '') + (e.stderr || '');
      err(`Syntax error in ${path.relative(ROOT, f)}: ${output.trim().split('\n')[0]}`);
      syntaxErrors++;
    }
  }
  report.stats.syntaxErrors = syntaxErrors;
  if (syntaxErrors === 0) log(`  All ${files.length} files passed syntax check.`);
}

// ── 2. Banned Patterns ───────────────────────────────────────────
function checkBannedPatterns(files) {
  log('Phase 2: Checking banned patterns...');

  const bannedPatterns = [
    {
      name: 'console.log (use this.log instead)',
      regex: /\bconsole\.log\s*\(/g,
      isBanned: (fileContent, match, filePath) => {
        // Allow in scripts/ directory
        if (filePath.includes(path.sep + 'scripts' + path.sep)) return false;
        // Allow in test files
        if (filePath.includes('.test.')) return false;
        return true;
      },
    },
    {
      name: 'console.error (use this.error instead)',
      regex: /\bconsole\.error\s*\(/g,
      isBanned: (fileContent, match, filePath) => {
        if (filePath.includes(path.sep + 'scripts' + path.sep)) return false;
        if (filePath.includes('.test.')) return false;
        return true;
      },
    },
    {
      name: 'console.warn (use this.warn instead)',
      regex: /\bconsole\.warn\s*\(/g,
      isBanned: (fileContent, match, filePath) => {
        if (filePath.includes(path.sep + 'scripts' + path.sep)) return false;
        if (filePath.includes('.test.')) return false;
        return true;
      },
    },
    {
      name: 'Raw setCapabilityValue (use safeSetCapabilityValue)',
      regex: /(?<!\w|\.)setCapabilityValue\s*\(/g,
      isBanned: (fileContent, match, filePath) => {
        // Only ban in drivers/ and lib/ files
        const rel = path.relative(ROOT, filePath);
        if (!rel.startsWith('drivers' + path.sep) && !rel.startsWith('lib' + path.sep)) return false;
        // Allow safeSetCapabilityValue, _safeSetCapability, this._safeSetCapability
        // Already handled by negative lookbehind
        // Allow safeSetCapability (the wrapper itself)
        if (filePath.endsWith('TuyaZigbeeDevice.js') || filePath.endsWith('BaseUnifiedDevice.js')) return false;
        return true;
      },
    },
    {
      name: 'Linear battery formula ((voltage - 2.5) / 0.5 pattern)',
      regex: /\(\s*voltage\s*-\s*[\d.]+\s*\)\s*\/\s*[\d.]+/g,
      isBanned: () => true,
    },
    {
      name: 'readFileSync with utf8 encoding (use Buffer-based loading)',
      regex: /readFileSync\s*\([^)]*,\s*['"]utf-?8['"]\s*\)/g,
      isBanned: (fileContent, match, filePath) => {
        // Only ban in lib/ files (critical for memory)
        const rel = path.relative(ROOT, filePath);
        return rel.startsWith('lib' + path.sep);
      },
    },
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      for (const pattern of bannedPatterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            if (pattern.isBanned(content, match, f)) {
              const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
              warn(`${pattern.name} in ${path.relative(ROOT, f)}:${lineNum}`);
              report.stats.bannedPatterns++;
            }
          }
        }
      }
    } catch (e) { /* skip unreadable */ }
  }
}

// ── 3. Empty Catch Blocks ────────────────────────────────────────
function checkEmptyCatch(files) {
  log('Phase 3: Checking for empty catch blocks...');
  const emptyCatchRegex = /catch\s*\([^)]*\)\s*\{\s*\}/g;
  const emptyCatchRegex2 = /catch\s*\(\s*\)\s*\{\s*\}/g;

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (emptyCatchRegex.test(line) || emptyCatchRegex2.test(line)) {
          warn(`Empty catch block in ${path.relative(ROOT, f)}:${i + 1}`);
          report.stats.emptyCatch++;
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 4. Timer Leaks ───────────────────────────────────────────────
function checkTimerLeaks(files) {
  log('Phase 4: Checking for potential timer leaks...');

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      // Only check drivers/ and lib/devices/ for timer issues
      if (!rel.startsWith('drivers' + path.sep) && !rel.startsWith('lib' + path.sep)) continue;

      // Check for setInterval without clearTimeout in destroy/uninit
      const setIntervalCount = (content.match(/\bsetInterval\s*\(/g) || []).length;
      if (setIntervalCount > 0) {
        const clearIntervalCount = (content.match(/\bclearInterval\s*\(/g) || []).length;
        const hasDestroy = content.includes('_destroyDevice') || content.includes('onDeleted') || content.includes('onUninit');
        if (clearIntervalCount < setIntervalCount && hasDestroy) {
          warn(`Potential timer leak: ${setIntervalCount} setInterval vs ${clearIntervalCount} clearInterval in ${rel}`);
          report.stats.timerLeaks++;
        }
      }

      // Check for setTimeout without clearTimeout in destroy
      const setTimeoutCount = (content.match(/\bsetTimeout\s*\(/g) || []).length;
      if (setTimeoutCount > 3) {
        const clearTimeoutCount = (content.match(/\bclearTimeout\s*\(/g) || []).length;
        const hasDestroy = content.includes('_destroyDevice') || content.includes('onDeleted') || content.includes('onUninit');
        if (clearTimeoutCount < setTimeoutCount && hasDestroy) {
          warn(`Potential timer leak: ${setTimeoutCount} setTimeout vs ${clearTimeoutCount} clearTimeout in ${rel}`);
          report.stats.timerLeaks++;
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 5. Missing Destroy Guards ────────────────────────────────────
function checkDestroyGuards(files) {
  log('Phase 5: Checking for missing destroy guards...');

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      // Only check driver device.js files
      if (!rel.startsWith('drivers' + path.sep) || !rel.endsWith('device.js')) continue;

      // If the file has async callbacks or timers, it should have _destroyed guard
      const hasAsyncCallback = content.includes('this.setCapabilityValue') ||
                               content.includes('setCapabilityValue(') ||
                               content.includes('registerCapabilityListener');
      const hasTimer = content.includes('setInterval') || content.includes('setTimeout');
      const hasDestroyGuard = content.includes('_destroyed');

      if ((hasAsyncCallback || hasTimer) && !hasDestroyGuard) {
        warn(`Missing _destroyed guard in driver ${rel} (has async callbacks/timers)`);
        report.stats.missingDestroyGuard++;
      }
    } catch (e) { /* skip */ }
  }
}

// ── 6. CaseInsensitiveMatcher Violations ─────────────────────────
function checkCaseInsensitiveViolations(files) {
  log('Phase 6: Checking for CaseInsensitiveMatcher violations...');

  // Pattern: manual .toLowerCase() used on manufacturerName/modelId comparisons
  const violations = [
    { regex: /manufacturerName\s*===?\s*[^.]+\.toLowerCase\(\)/g, desc: 'Direct toLowerCase on manufacturerName comparison' },
    { regex: /\.manufacturerName\s*[=!]==?\s*[^.]+\.toLowerCase/g, desc: 'Direct toLowerCase on manufacturerName comparison' },
    { regex: /manufacturer.*\.toLowerCase\(\)\s*===/g, desc: 'toLowerCase before strict equality (use CaseInsensitiveMatcher)' },
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      // Skip CaseInsensitiveMatcher itself and test files
      if (rel.includes('CaseInsensitiveMatcher')) continue;
      if (rel.includes('.test.')) continue;

      for (const v of violations) {
        const matches = content.match(v.regex);
        if (matches) {
          for (const match of matches) {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            warn(`CaseInsensitiveMatcher violation: ${v.desc} in ${rel}:${lineNum}`);
            report.stats.caseInsensitiveViolations++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 7. Deprecated Import Paths ───────────────────────────────────
function checkDeprecatedImports(files) {
  log('Phase 7: Checking for deprecated import paths...');

  const deprecatedImports = [
    { pattern: /require\s*\(\s*['"].*\/HybridSwitchBase['"]\s*\)/g, alt: 'UnifiedSwitchBase' },
    { pattern: /require\s*\(\s*['"].*\/HybridSensorBase['"]\s*\)/g, alt: 'UnifiedSensorBase' },
    { pattern: /require\s*\(\s*['"].*\/HybridCoverBase['"]\s*\)/g, alt: 'UnifiedCoverBase' },
    { pattern: /require\s*\(\s*['"].*\/HybridLightBase['"]\s*\)/g, alt: 'UnifiedLightBase' },
    { pattern: /require\s*\(\s['"].*\/HybridPlugBase['"]\s*\)/g, alt: 'UnifiedPlugBase' },
    { pattern: /require\s*\(\s*['"].*\/HybridThermostatBase['"]\s*\)/g, alt: 'UnifiedThermostatBase' },
    { pattern: /require\s*\(\s*['"].*\/HybridDevice['"]\s*\)/g, alt: 'BaseUnifiedDevice' },
    { pattern: /require\s*\(\s*['"].*BaseHybridDevice['"]\s*\)/g, alt: 'BaseUnifiedDevice' },
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      for (const imp of deprecatedImports) {
        const matches = content.match(imp.pattern);
        if (matches) {
          for (const match of matches) {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            warn(`Deprecated import: ${match.trim()} -> use ${imp.alt} (${rel}:${lineNum})`);
            report.stats.deprecatedImports++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 8. Settings Key Violations ───────────────────────────────────
function checkSettingsKeys(files) {
  log('Phase 8: Checking for wrong settings keys...');

  const wrongKeys = [
    { pattern: /zb_modelId/g, correct: 'zb_model_id' },
    { pattern: /zb_manufacturerName/g, correct: 'zb_manufacturer_name' },
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      for (const key of wrongKeys) {
        const matches = content.match(key.pattern);
        if (matches) {
          for (const match of matches) {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            warn(`Wrong settings key "${match}" -> use "${key.correct}" (${rel}:${lineNum})`);
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 9. Flow Card titleFormatted with [[device]] ──────────────────
function checkFlowCardTitleFormatted() {
  log('Phase 9: Checking flow cards for [[device]] titleFormatted bugs...');

  const flowFiles = [
    path.join(ROOT, '.homeycompose', 'app.json'),
  ];

  // Also check driver.flow.compose.json files
  try {
    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    for (const d of driverDirs) {
      const flowPath = path.join(DRIVERS_DIR, d, 'driver.flow.compose.json');
      if (fs.existsSync(flowPath)) {
        flowFiles.push(flowPath);
      }
    }
  } catch (e) { /* skip */ }

  for (const f of flowFiles) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const parsed = JSON.parse(content);
      const rel = path.relative(ROOT, f);

      // Check triggers, conditions, actions
      for (const section of ['triggers', 'conditions', 'actions']) {
        if (!parsed[section]) continue;
        for (const card of parsed[section]) {
          if (card.titleFormatted) {
            const titleFormattedStr = typeof card.titleFormatted === 'object'
              ? JSON.stringify(card.titleFormatted)
              : card.titleFormatted;
            if (titleFormattedStr.includes('[[device]]')) {
              warn(`titleFormatted contains [[device]] bug in ${rel}: ${card.id}`);
              report.stats.titleFormattedBugs++;
            }
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 10. node --check on all JS files ─────────────────────────────
function syntaxCheckBatch(files) {
  log('Phase 10: Batch syntax validation...');

  // Process in batches to avoid command line length issues
  const batchSize = 50;
  let errors = 0;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    try {
      const fileList = batch.map(f => `"${f}"`).join(' ');
      execSync(`node --check ${fileList} 2>&1`, {
        encoding: 'utf8',
        timeout: 30000,
        cwd: ROOT,
      });
    } catch (e) {
      const output = (e.stdout || '') + (e.stderr || '');
      const errorLines = output.split('\n').filter(l => l.includes('SyntaxError') || l.includes('Error:'));
      for (const line of errorLines) {
        // Extract file name from error line
        const match = line.match(/^([^:]+\.js):/);
        if (match) {
          err(`Syntax error: ${match[1]}: ${line}`);
          errors++;
        } else {
          err(`Syntax error: ${line}`);
          errors++;
        }
      }
    }
  }

  if (errors === 0) {
    log(`  All ${files.length} files passed batch syntax check.`);
  }
}

// ── Main Execution ───────────────────────────────────────────────
function main() {
  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  Code Quality Check - Universal Tuya Zigbee${RESET}`);
  console.log(`${BOLD}============================================${RESET}\n`);

  const startTime = Date.now();

  // Collect files from both drivers/ and lib/
  const driverFiles = collectJsFiles(DRIVERS_DIR);
  const libFiles = collectJsFiles(LIB_DIR);
  const appFile = path.join(ROOT, 'app.js');
  const allFiles = [...driverFiles, ...libFiles];
  if (fs.existsSync(appFile)) allFiles.push(appFile);

  report.stats.filesScanned = allFiles.length;
  log(`Found ${allFiles.length} JS files to scan (${driverFiles.length} drivers, ${libFiles.length} lib)\n`);

  // Run all checks
  checkSyntax(allFiles);
  checkBannedPatterns(allFiles);
  checkEmptyCatch(allFiles);
  checkTimerLeaks(allFiles);
  checkDestroyGuards(allFiles);
  checkCaseInsensitiveViolations(allFiles);
  checkDeprecatedImports(allFiles);
  checkSettingsKeys(allFiles);
  checkFlowCardTitleFormatted();
  syntaxCheckBatch(allFiles);

  // ── Summary ──────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  QUALITY REPORT SUMMARY${RESET}`);
  console.log(`${BOLD}============================================${RESET}`);
  console.log(`  Files scanned:            ${report.stats.filesScanned}`);
  console.log(`  Syntax errors:            ${RED}${report.stats.syntaxErrors}${RESET}`);
  console.log(`  Banned patterns:          ${YELLOW}${report.stats.bannedPatterns}${RESET}`);
  console.log(`  Empty catch blocks:       ${YELLOW}${report.stats.emptyCatch}${RESET}`);
  console.log(`  Timer leaks:              ${YELLOW}${report.stats.timerLeaks}${RESET}`);
  console.log(`  Missing destroy guards:   ${YELLOW}${report.stats.missingDestroyGuard}${RESET}`);
  console.log(`  Case-insensitive violations: ${YELLOW}${report.stats.caseInsensitiveViolations}${RESET}`);
  console.log(`  Deprecated imports:       ${YELLOW}${report.stats.deprecatedImports}${RESET}`);
  console.log(`  Flow card title bugs:     ${YELLOW}${report.stats.titleFormattedBugs}${RESET}`);
  console.log(`  -----------------------------------------`);
  console.log(`  ${RED}Errors:   ${report.errors.length}${RESET}`);
  console.log(`  ${YELLOW}Warnings: ${report.warnings.length}${RESET}`);
  console.log(`  Completed in ${elapsed}s\n`);

  if (report.errors.length > 0) {
    console.log(`${RED}${BOLD}RESULT: FAIL - ${report.errors.length} error(s) found${RESET}`);
    process.exit(1);
  } else if (report.warnings.length > 0) {
    console.log(`${YELLOW}${BOLD}RESULT: WARN - ${report.warnings.length} warning(s) found${RESET}`);
    process.exit(2);
  } else {
    console.log(`${GREEN}${BOLD}RESULT: PASS - All quality checks passed${RESET}`);
    process.exit(0);
  }
}

main();
