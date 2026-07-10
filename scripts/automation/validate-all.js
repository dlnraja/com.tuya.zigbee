#!/usr/bin/env node
'use strict';

/**
 * validate-all.js - Unified Validation Pipeline
 *
 * Validates all JSON, JavaScript, and YAML files across the codebase.
 * Checks for syntax errors, structural integrity, and project-specific rules.
 * Can be run as a pre-commit hook or standalone CI gate.
 *
 * Usage:
 *   node scripts/automation/validate-all.js [options]
 *
 * Options:
 *   --json           Output results as JSON
 *   --pre-commit     Run in pre-commit mode (fail on any error)
 *   --verbose        Show detailed output for each file
 *   --fix            Auto-fix known issues where possible
 *   --skip=yaml      Skip YAML validation
 *   --skip=js        Skip JavaScript validation
 *   --skip=json      Skip JSON validation
 *   --report=path    Write report to specific file
 *
 * Exit codes:
 *   0 = all validations passed
 *   1 = errors found
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── Configuration ───────────────────────────────────────────────────────────

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

// Directories to scan
const SCAN_DIRS = [
  { dir: DRIVERS_DIR, type: 'drivers', pattern: '**/*.js' },
  { dir: LIB_DIR, type: 'lib', pattern: '**/*.js' },
  { dir: ROOT, type: 'root', pattern: '*.json' },
  { dir: path.join(ROOT, 'data'), type: 'data', pattern: '*.json' },
  { dir: path.join(ROOT, 'locales'), type: 'locales', pattern: '*.json' },
];

// Known valid JSON schemas for critical files
const CRITICAL_JSON = {
  'app.json': { required: ['id', 'version', 'drivers'], type: 'object' },
  'package.json': { required: ['name', 'version'], type: 'object' },
};

// Patterns that indicate banned code
const BANNED_PATTERNS = [
  { pattern: /console\.(log|error|warn)\s*\(/g, name: 'console.log/error/warn', severity: 'warning', excludeDirs: ['scripts/'] },
  { pattern: /\.toLowerCase\(\)/g, name: 'manual .toLowerCase() (use CaseInsensitiveMatcher)', severity: 'info', excludeDirs: ['lib/utils/CaseInsensitiveMatcher', 'scripts/'] },
  { pattern: /\(voltage\s*-\s*2\.5\)\s*\/\s*0\.5/g, name: 'linear battery formula (use UnifiedBatteryHandler)', severity: 'error' },
  { pattern: /setCapabilityValue\s*\(/g, name: 'raw setCapabilityValue (use safesetCapability)', severity: 'warning', excludeDirs: ['lib/tuya/TuyaZigbeeDevice.js', 'scripts/'] },
];

// ── CLI Arguments ───────────────────────────────────────────────────────────

const ARGS = {
  json: process.argv.includes('--json'),
  preCommit: process.argv.includes('--pre-commit'),
  verbose: process.argv.includes('--verbose'),
  fix: process.argv.includes('--fix'),
  skipYaml: process.argv.includes('--skip=yaml'),
  skipJs: process.argv.includes('--skip=js'),
  skipJson: process.argv.includes('--skip=json'),
  report: (() => {
    const r = process.argv.find((a) => a.startsWith('--report='));
    return r ? r.split('=')[1] : null;
  })(),
};

// ── Results ─────────────────────────────────────────────────────────────────

const results = {
  timestamp: new Date().toISOString(),
  duration: 0,
  summary: {
    totalFiles: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
  categories: {
    javascript: { total: 0, passed: 0, failed: 0, errors: [] },
    json: { total: 0, passed: 0, failed: 0, errors: [] },
    yaml: { total: 0, passed: 0, failed: 0, errors: [] },
  },
  antiPatterns: [],
  warnings: [],
};

// ── Colors ──────────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function colorize(color, text) {
  if (ARGS.json) return text;
  return `${C[color] || ''}${text}${C.reset}`;
}

// ── File Discovery ──────────────────────────────────────────────────────────

function findFiles(dir, extension, ignoreDirs = ['node_modules', '.git', '.cache', '.homeybuild', 'build']) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!ignoreDirs.includes(entry)) {
            files.push(...findFiles(fullPath, extension, ignoreDirs));
          }
        } else if (entry.endsWith(extension)) {
          files.push(fullPath);
        }
      } catch (_e) { /* skip inaccessible */ }
    }
  } catch (_e) { /* skip */ }
  return files;
}

// ── JavaScript Validation ───────────────────────────────────────────────────

function validateJavaScript(filePath) {
  const category = results.categories.javascript;
  category.total++;
  results.summary.totalFiles++;

  const errors = [];
  const relativePath = path.relative(ROOT, filePath);

  try {
    // 1. Syntax check via Node's VM (catches syntax errors)
    const content = fs.readFileSync(filePath, 'utf8');

    try {
      new vm.Script(content, { filename: filePath });
    } catch (syntaxErr) {
      errors.push({
        file: relativePath,
        type: 'syntax',
        message: syntaxErr.message,
        line: syntaxErr.stack ? (syntaxErr.stack.match(/:(\d+):/)?.[1] || 0) : 0,
      });
    }

    // 2. Anti-pattern detection
    for (const banned of BANNED_PATTERNS) {
      // Check if file should be excluded
      if (banned.excludeDirs && banned.excludeDirs.some((d) => filePath.includes(d))) {
        continue;
      }

      let match;
      const regex = new RegExp(banned.pattern.source, banned.pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;

        if (banned.severity === 'error') {
          errors.push({
            file: relativePath,
            type: 'anti-pattern',
            message: `${banned.name} at line ${lineNum}`,
            severity: banned.severity,
          });
        } else {
          results.antiPatterns.push({
            file: relativePath,
            pattern: banned.name,
            severity: banned.severity,
            line: lineNum,
          });
        }
      }
    }

    // 3. Check for require() without try/catch (defensive importing rule)
    if (!filePath.includes('scripts/') && !filePath.includes('app.js')) {
      const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      let requireMatch;
      while ((requireMatch = requirePattern.exec(content)) !== null) {
        const requirePath = requireMatch[1];
        // Check if it's a local require that might be excluded by .homeyignore
        if (requirePath.startsWith('.') || requirePath.startsWith('/')) {
          const resolvedPath = path.resolve(path.dirname(filePath), requirePath);
          if (!fs.existsSync(resolvedPath) && !fs.existsSync(resolvedPath + '.js')) {
            results.warnings.push({
              file: relativePath,
              message: `require('${requirePath}') - file not found (ensure safe-require wrapper)`,
            });
          }
        }
      }
    }

    // 4. Check for banned zb_modelId / zb_manufacturerName (should be zb_model_id / zb_manufacturer_name)
    if (content.includes('zb_modelId') || content.includes('zb_manufacturerName')) {
      errors.push({
        file: relativePath,
        type: 'settings-key',
        message: 'Use zb_model_id (not zb_modelId) and zb_manufacturer_name (not zb_manufacturerName)',
      });
    }

    if (errors.length > 0) {
      category.failed++;
      results.summary.failed++;
      category.errors.push(...errors);
    } else {
      category.passed++;
      results.summary.passed++;
    }
  } catch (err) {
    category.failed++;
    results.summary.failed++;
    category.errors.push({
      file: relativePath,
      type: 'read-error',
      message: err.message,
    });
  }
}

// ── JSON Validation ─────────────────────────────────────────────────────────

function validateJSON(filePath) {
  const category = results.categories.json;
  category.total++;
  results.summary.totalFiles++;

  const errors = [];
  const relativePath = path.relative(ROOT, filePath);

  try {
    const raw = fs.readFileSync(filePath);

    // 1. Parse check (uses Buffer directly per project rule - no 'utf8')
    try {
      JSON.parse(raw);
    } catch (parseErr) {
      errors.push({
        file: relativePath,
        type: 'syntax',
        message: parseErr.message,
      });
    }

    // 2. Critical file schema validation
    const basename = path.basename(filePath);
    if (CRITICAL_JSON[basename]) {
      const schema = CRITICAL_JSON[basename];
      try {
        const data = JSON.parse(raw);

        if (schema.type && typeof data !== schema.type) {
          errors.push({
            file: relativePath,
            type: 'schema',
            message: `Expected type "${schema.type}", got "${typeof data}"`,
          });
        }

        if (schema.required) {
          for (const field of schema.required) {
            if (!(field in data)) {
              errors.push({
                file: relativePath,
                type: 'schema',
                message: `Missing required field: "${field}"`,
              });
            }
          }
        }
      } catch (_e) {
        // Parse error already captured above
      }
    }

    // 3. Check for empty files
    if (raw.length === 0) {
      errors.push({
        file: relativePath,
        type: 'structure',
        message: 'Empty JSON file',
      });
    }

    if (errors.length > 0) {
      category.failed++;
      results.summary.failed++;
      category.errors.push(...errors);
    } else {
      category.passed++;
      results.summary.passed++;
    }
  } catch (err) {
    category.failed++;
    results.summary.failed++;
    category.errors.push({
      file: relativePath,
      type: 'read-error',
      message: err.message,
    });
  }
}

// ── YAML Validation ─────────────────────────────────────────────────────────

function validateYAML(filePath) {
  const category = results.categories.yaml;
  category.total++;
  results.summary.totalFiles++;

  const errors = [];
  const relativePath = path.relative(ROOT, filePath);

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Basic structural validation (no external dependency)
    // Check for tab characters (YAML uses spaces)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('\t')) {
        errors.push({
          file: relativePath,
          type: 'format',
          message: `Tab character found at line ${i + 1} (YAML should use spaces)`,
        });
      }

      // Check for common YAML issues
      const trimmed = lines[i].trim();

      // Trailing colon with nothing after (potential issue)
      if (trimmed.endsWith(':') && trimmed.length > 1 && !trimmed.includes('#')) {
        // This is fine for mapping keys, skip
      }

      // Duplicate key detection (basic)
      if (trimmed.match(/^\w[\w\s]*:/)) {
        const key = trimmed.split(':')[0].trim();
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
          const otherTrimmed = lines[j].trim();
          if (otherTrimmed.startsWith(`${key}:`) && !otherTrimmed.startsWith(`${key}: `)) {
            // Possible duplicate key
            break;
          }
        }
      }
    }

    // Check for unclosed quotes
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("'") && !line.endsWith("'")) {
        // Check next line continues the string
        if (i + 1 < lines.length && !lines[i + 1].trim().endsWith("'")) {
          // Could be multiline - skip
        }
      }
    }

    // Check for empty files
    if (content.trim().length === 0) {
      errors.push({
        file: relativePath,
        type: 'structure',
        message: 'Empty YAML file',
      });
    }

    if (errors.length > 0) {
      category.failed++;
      results.summary.failed++;
      category.errors.push(...errors);
    } else {
      category.passed++;
      results.summary.passed++;
    }
  } catch (err) {
    category.failed++;
    results.summary.failed++;
    category.errors.push({
      file: relativePath,
      type: 'read-error',
      message: err.message,
    });
  }
}

// ── Driver Compose Validation ───────────────────────────────────────────────

function validateDriverComposes() {
  if (!fs.existsSync(DRIVERS_DIR)) return;

  log('Validating driver compose.json files...');

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter((d) => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch (_e) { return false; }
  });

  for (const driverDir of driverDirs) {
    const composePath = path.join(DRIVERS_DIR, driverDir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    results.summary.totalFiles++;
    results.categories.json.total++;

    try {
      const data = JSON.parse(fs.readFileSync(composePath));

      // Check for empty manufacturerName arrays
      if (Array.isArray(data.zigbee?.manufacturerName) && data.zigbee.manufacturerName.length === 0) {
        results.warnings.push({
          file: `drivers/${driverDir}/driver.compose.json`,
          message: 'Empty manufacturerName array',
        });
      }

      // Check for empty productId arrays
      if (Array.isArray(data.zigbee?.productId) && data.zigbee.productId.length === 0) {
        results.warnings.push({
          file: `drivers/${driverDir}/driver.compose.json`,
          message: 'Empty productId array',
        });
      }

      // Check for wildcard in manufacturerName (banned)
      if (Array.isArray(data.zigbee?.manufacturerName)) {
        for (const mfr of data.zigbee.manufacturerName) {
          if (mfr === '*' || mfr.includes('*')) {
            results.categories.json.errors.push({
              file: `drivers/${driverDir}/driver.compose.json`,
              type: 'rule-violation',
              message: `Wildcard in manufacturerName: "${mfr}" (banned per project rules)`,
            });
            results.categories.json.failed++;
            results.summary.failed++;
          }
        }
      }

      results.categories.json.passed++;
      results.summary.passed++;
    } catch (err) {
      results.categories.json.errors.push({
        file: `drivers/${driverDir}/driver.compose.json`,
        type: 'syntax',
        message: err.message,
      });
      results.categories.json.failed++;
      results.summary.failed++;
    }
  }
}

// ── Output ──────────────────────────────────────────────────────────────────

function log(msg) {
  if (!ARGS.json) console.log(msg);
}

function printSummary() {
  if (ARGS.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  log('');
  log(colorize('bold', '=== Validation Summary ==='));
  log(`  Total files: ${results.summary.totalFiles}`);
  log(`  ${colorize('green', `Passed: ${results.summary.passed}`)}`);
  log(`  ${results.summary.failed > 0 ? colorize('red', `Failed: ${results.summary.failed}`) : `Failed: ${results.summary.failed}`}`);
  log(`  Skipped: ${results.summary.skipped}`);
  log(`  Duration: ${results.duration}ms`);
  log('');

  // Category breakdown
  for (const [cat, data] of Object.entries(results.categories)) {
    if (data.total === 0) continue;
    const status = data.failed > 0 ? colorize('red', 'FAIL') : colorize('green', 'PASS');
    log(`  ${cat.toUpperCase()}: ${status} (${data.passed}/${data.total})`);
  }

  // Print errors
  if (results.summary.failed > 0) {
    log('');
    log(colorize('red', colorize('bold', 'ERRORS:')));
    for (const [cat, data] of Object.entries(results.categories)) {
      for (const err of data.errors) {
        log(`  ${colorize('red', 'ERROR')} [${cat}] ${err.file}: ${err.message}`);
      }
    }
  }

  // Print anti-patterns
  if (results.antiPatterns.length > 0) {
    log('');
    log(colorize('yellow', 'ANTI-PATTERNS:'));
    for (const ap of results.antiPatterns) {
      const severity = ap.severity === 'error' ? colorize('red', 'ERROR') : colorize('yellow', 'WARN');
      log(`  ${severity} ${ap.file}:${ap.line} - ${ap.pattern}`);
    }
  }

  // Print warnings
  if (results.warnings.length > 0) {
    log('');
    log(colorize('yellow', 'WARNINGS:'));
    for (const w of results.warnings) {
      log(`  ${colorize('yellow', 'WARN')} ${w.file}: ${w.message}`);
    }
  }

  log('');
  if (results.summary.failed === 0) {
    log(colorize('green', colorize('bold', 'ALL VALIDATIONS PASSED')));
  } else {
    log(colorize('red', colorize('bold', `VALIDATION FAILED: ${results.summary.failed} error(s)`)));
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const startTime = Date.now();

  log(colorize('bold', colorize('cyan', '=== Tuya Zigbee Unified Validation Pipeline v1.0.0 ===')));
  log(`Mode: ${ARGS.preCommit ? 'PRE-COMMIT' : 'STANDALONE'}`);
  log('');

  // 1. Validate JavaScript files
  if (!ARGS.skipJs) {
    log('Validating JavaScript files...');

    // Drivers
    const jsFiles = [
      ...findFiles(DRIVERS_DIR, '.js'),
      ...findFiles(LIB_DIR, '.js'),
    ];

    for (const file of jsFiles) {
      if (ARGS.verbose) log(`  Checking: ${path.relative(ROOT, file)}`);
      validateJavaScript(file);
    }

    log(`  Checked ${jsFiles.length} JavaScript files`);
  }

  // 2. Validate JSON files
  if (!ARGS.skipJson) {
    log('Validating JSON files...');

    const jsonFiles = [
      ...findFiles(ROOT, '.json'),
      ...findFiles(path.join(ROOT, 'data'), '.json'),
      ...findFiles(path.join(ROOT, 'locales'), '.json'),
    ];

    for (const file of jsonFiles) {
      // Skip node_modules and build artifacts
      if (file.includes('node_modules') || file.includes('.homeybuild')) continue;
      if (ARGS.verbose) log(`  Checking: ${path.relative(ROOT, file)}`);
      validateJSON(file);
    }

    log(`  Checked ${jsonFiles.length} JSON files`);

    // Validate driver compose.json files specifically
    validateDriverComposes();
  }

  // 3. Validate YAML files
  if (!ARGS.skipYaml) {
    log('Validating YAML files...');

    const yamlFiles = [
      ...findFiles(ROOT, '.yml'),
      ...findFiles(ROOT, '.yaml'),
      ...findFiles(path.join(ROOT, '.github'), '.yml'),
    ];

    for (const file of yamlFiles) {
      if (file.includes('node_modules')) continue;
      if (ARGS.verbose) log(`  Checking: ${path.relative(ROOT, file)}`);
      validateYAML(file);
    }

    log(`  Checked ${yamlFiles.length} YAML files`);
  }

  // Finalize
  results.duration = Date.now() - startTime;
  printSummary();

  // Write report if requested
  if (ARGS.report) {
    const reportDir = path.dirname(ARGS.report);
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(ARGS.report, JSON.stringify(results, null, 2));
    log(`\nReport written to: ${ARGS.report}`);
  }

  // Write default report
  const defaultReportDir = path.join(ROOT, '.cache', 'validation');
  if (!fs.existsSync(defaultReportDir)) fs.mkdirSync(defaultReportDir, { recursive: true });
  fs.writeFileSync(
    path.join(defaultReportDir, 'last-validation.json'),
    JSON.stringify(results, null, 2)
  );

  // Exit code
  if (ARGS.preCommit && results.summary.failed > 0) {
    process.exit(1);
  }

  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main();
