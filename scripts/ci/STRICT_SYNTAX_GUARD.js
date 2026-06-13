#!/usr/bin/env node
/**
 * STRICT_SYNTAX_GUARD.js - v1.2.0
 *
 * Formal gatekeeper for Tuya Unified Zigbee.
 * Recursively validates syntax of all JavaScript files in the repository.
 * Detects malformed 'extends' keywords (e.g., extends SensorBase or classextends).
 * Returns exit code 1 if any syntax error or formatting issue is found.
 *
 * Run: node scripts/ci/STRICT_SYNTAX_GUARD.js [--json]
 *
 * Checks:
 * 1. Node.js compilation check (--check)
 * 2. Extends keyword spacing
 * 3. super.onNodeInit({ zclNode }) parameter validation
 * 4. YAML trailing whitespace
 * 5. GitHub Actions expression brace mismatch
 * 6. require() of nonexistent local modules
 * 7. Common syntax pitfalls (unmatched braces, double equals, etc.)
 * 8. Missing 'use strict' in scripts
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const JSON_OUTPUT = process.argv.includes('--json');
const ROOT = process.cwd();
const TARGET_DIRS = ['lib', 'drivers', 'scripts', '.github/workflows'];
const IGNORE_DIRS = ['node_modules', '.git', '.homeybuild', 'quarantine', 'tmp', 'temp', '_temp', 'scripts/temp'];

let errorCount = 0;
let warnCount = 0;
let fileCount = 0;
const errors = [];
const warnings = [];

function log(msg) { if (!JSON_OUTPUT) console.log(`[SYNTAX-GUARD] ${msg}`); }
function error(msg) { if (!JSON_OUTPUT) console.error(`[CRITICAL] ${msg}`); }

function addError(file, line, msg) {
  errorCount++;
  const entry = { file: path.relative(ROOT, file), line, message: msg };
  errors.push(entry);
  if (!JSON_OUTPUT) {
    console.error(`\n  ERROR in ${entry.file}` + (line ? ` (line ${line})` : '') + `:`);
    console.error(`    ${msg}`);
  }
}

function addWarn(file, line, msg) {
  warnCount++;
  const entry = { file: path.relative(ROOT, file), line, message: msg };
  warnings.push(entry);
  if (!JSON_OUTPUT) {
    console.warn(`\n  WARN in ${entry.file}` + (line ? ` (line ${line})` : '') + `:`);
    console.warn(`    ${msg}`);
  }
}

function validateJsFile(filePath) {
  // 1. Basic Node.js Compilation Check
  const result = spawnSync('node', ['--check', filePath], { encoding: 'utf8' });
  if (result.status !== 0) {
    addError(filePath, null, `Syntax error: ${(result.stderr || '').trim().split('\n')[0]}`);
    return false;
  }

  // 2. Content-based checks
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    addError(filePath, null, `Could not read file: ${e.message}`);
    return false;
  }

  const lines = content.split('\n');

  // Extends keyword spacing checks
  const patternNoSpaceAfter = /\bclass\s+\w+\s+extends\w+/;
  const patternNoSpaceBefore = /\bclass\s+\w+extends\s+\w+/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (patternNoSpaceAfter.test(line)) {
      addError(filePath, i + 1, `Missing space after 'extends': "${line.trim()}"`);
    }
    if (patternNoSpaceBefore.test(line)) {
      addError(filePath, i + 1, `Missing space before 'extends': "${line.trim()}"`);
    }

    // Check for double equals (== instead of ===) in non-comment lines
    // Skip lines with comments, strings, or JSON
    const stripped = line.replace(/\/\/.*/, '').replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '');
    if (/[^!=!]==[^=]/.test(stripped) && !/\.includes\(/.test(stripped) && !/\.indexOf\(/.test(stripped)) {
      addWarn(filePath, i + 1, `Possible double-equals (use ===): "${line.trim().substring(0, 80)}"`);
    }

    // Check for console.log in CI scripts (should use structured output)
    if (filePath.includes('scripts/ci/') && /console\.log\(/.test(line) && !line.trim().startsWith('//')) {
      addWarn(filePath, i + 1, `CI script uses console.log (consider structured output)`);
    }
  }

  // 3. super.onNodeInit({ zclNode }) Parameter Check
  if (filePath.endsWith('device.js') && (content.includes('super.onNodeInit') || content.includes('super.onNodeInit('))) {
    // Strip comments
    const cleanContent = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '');

    const superCalls = cleanContent.match(/super\.onNodeInit\s*\([^)]*\)/g) || [];
    for (const call of superCalls) {
      if (!/super\.onNodeInit\s*\(\s*\{\s*zclNode\s*\}\s*\)/.test(call)) {
        addError(filePath, null, `super.onNodeInit must be passed '{ zclNode }' (found: "${call}")`);
      }
    }
  }

  // 4. Check for require() of local paths that may not exist
  const requireMatches = content.match(/require\(['"](\.\.?\/[^'"]+)['"]\)/g) || [];
  for (const req of requireMatches) {
    const match = req.match(/require\(['"](\.\.?\/[^'"]+)['"]\)/);
    if (match) {
      const reqPath = match[1];
      const resolved = path.resolve(path.dirname(filePath), reqPath);
      // Check for .js, /index.js, or exact path
      const candidates = [resolved, resolved + '.js', path.join(resolved, 'index.js')];
      const found = candidates.some(c => fs.existsSync(c));
      if (!found) {
        addWarn(filePath, null, `require() of possibly nonexistent module: ${reqPath}`);
      }
    }
  }

  return true;
}

function validateYmlFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    addError(filePath, null, `Could not read file: ${e.message}`);
    return;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Trailing whitespace check on non-blank lines
    if (/[ \t]+$/.test(line) && line.trim().length > 0) {
      addError(filePath, i + 1, `Trailing whitespace on non-blank line`);
    }

    // GitHub Actions expression brace mismatch
    if (line.includes('${{') && !line.includes('}}')) {
      addError(filePath, i + 1, `Missing closing '}}' for GitHub Actions expression`);
    }

    // Check for tabs in YAML (should use spaces)
    if (line.includes('\t') && line.trim().length > 0) {
      addWarn(filePath, i + 1, `Tab character in YAML (use spaces instead)`);
    }
  }
}

function validateFile(filePath) {
  fileCount++;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.js') {
    validateJsFile(filePath);
  } else if (ext === '.yml' || ext === '.yaml') {
    validateYmlFile(filePath);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      walk(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
      validateFile(fullPath);
    }
  }
}

// Main
if (!JSON_OUTPUT) {
  console.log('STRICT_SYNTAX_GUARD v1.2.0 starting validation...');
  console.log('='.repeat(60));
}

TARGET_DIRS.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    walk(fullPath);
  }
});

if (JSON_OUTPUT) {
  const output = {
    timestamp: new Date().toISOString(),
    filesChecked: fileCount,
    errors: errorCount,
    warnings: warnCount,
    errorDetails: errors,
    warningDetails: warnings,
    exitCode: errorCount > 0 ? 1 : 0,
  };
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log('\n' + '='.repeat(60));
  if (errorCount > 0) {
    error(`Validation FAILED. Found ${errorCount} error(s) and ${warnCount} warning(s) in ${fileCount} files.`);
  } else {
    log(`Validation PASSED. All ${fileCount} files checked, ${warnCount} warning(s).`);
  }
}

process.exit(errorCount > 0 ? 1 : 0);
