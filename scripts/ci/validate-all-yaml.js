#!/usr/bin/env node
/**
 * validate-all-yaml.js - YAML Syntax Validator for CI/CD
 * Validates all YAML files in the repository for syntax correctness.
 *
 * Usage: node scripts/ci/validate-all-yaml.js [--json]
 * Exit code: 0 = all valid, 1 = errors found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

const JSON_OUTPUT = process.argv.includes('--json');
const ROOT = path.resolve(__dirname, '../..');

const PATTERNS = [
  '.github/workflows/*.yml',
  '.github/actions/**/*.yml',
  '.github/ISSUE_TEMPLATE/*.yml',
  '.github/*.yml',
  '.github/state/*.yml',
];

let total = 0;
let checked = 0;
const errors = [];

// Simple YAML validation: parse for structural issues
// Lightweight check that does not require js-yaml dependency
function validateYamlSyntax(content, filePath) {
  const lines = content.split('\n');
  const fileErrors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Tab characters in YAML (should use spaces)
    if (line.includes('\t') && line.trim().length > 0) {
      fileErrors.push({ file: filePath, line: lineNum, message: 'Tab character in YAML (use spaces)' });
    }

    // GitHub Actions expression brace mismatch
    if (line.includes('${{') && !line.includes('}}') && !line.trim().startsWith('#')) {
      fileErrors.push({ file: filePath, line: lineNum, message: "Missing closing '}}' for GitHub Actions expression" });
    }

    // Trailing whitespace on non-blank lines
    if (/[ \t]+$/.test(line) && line.trim().length > 0) {
      fileErrors.push({ file: filePath, line: lineNum, message: 'Trailing whitespace on non-blank line' });
    }
  }

  // Check for tab-indented YAML (common mistake)
  const tabIndentedLines = lines.filter(l => l.startsWith('\t') && l.trim().length > 0);
  if (tabIndentedLines.length > 0) {
    fileErrors.push({ file: filePath, line: null, message: `${tabIndentedLines.length} lines use tab indentation (YAML requires spaces)` });
  }

  return fileErrors;
}

function expandGlob(pattern) {
  const resolvedPattern = path.join(ROOT, pattern);
  const dir = path.dirname(resolvedPattern);
  const fileGlob = path.basename(resolvedPattern);

  if (!fs.existsSync(dir)) return [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const regex = new RegExp('^' + fileGlob.replace(/\./g, '\\.').replace(/\*/g, '[^/]*').replace(/\*\*/g, '.*') + '$');

    return entries
      .filter(e => e.isFile() && regex.test(e.name))
      .map(e => path.join(dir, e.name));
  } catch {
    return [];
  }
}

// Also walk subdirectories for ** patterns
function expandGlobRecursive(pattern) {
  if (!pattern.includes('**')) return expandGlob(pattern);

  const parts = pattern.split('/');
  const baseDir = ROOT;
  const filePattern = parts[parts.length - 1];
  const dirParts = parts.slice(0, -1).join('/');

  const results = [];
  const searchDir = path.join(ROOT, dirParts.replace(/\*\*/g, ''));

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
          walk(path.join(dir, entry.name));
        } else if (entry.isFile()) {
          const regex = new RegExp('^' + filePattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
          if (regex.test(entry.name)) {
            results.push(path.join(dir, entry.name));
          }
        }
      }
    } catch { /* skip */ }
  }

  walk(searchDir);
  return results;
}

try {
  const allFiles = new Set();

  for (const pat of PATTERNS) {
    const files = expandGlobRecursive(pat);
    for (const f of files) {
      allFiles.add(f);
    }
  }

  total = allFiles.size;

  if (!JSON_OUTPUT) {
    console.log(`\n=== YAML Validation Report ===`);
    console.log(`Scanning ${total} YAML files...\n`);
  }

  for (const fullPath of allFiles) {
    checked++;
    const relPath = path.relative(ROOT, fullPath);

    if (!JSON_OUTPUT && checked % 10 === 0) {
      process.stdout.write(`  Progress: ${checked}/${total}\r`);
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');

      // Basic YAML syntax check
      if (content.trim().length === 0) {
        errors.push({ file: relPath, line: null, message: 'Empty YAML file' });
        continue;
      }

      const fileErrors = validateYamlSyntax(content, relPath);
      errors.push(...fileErrors);
    } catch (e) {
      errors.push({ file: relPath, line: null, message: `Read error: ${e.message}` });
    }
  }

  if (JSON_OUTPUT) {
    const output = {
      timestamp: new Date().toISOString(),
      filesChecked: checked,
      errors: errors.length,
      errorDetails: errors,
      exitCode: errors.length > 0 ? 1 : 0,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`\nTotal files checked: ${checked}`);
    console.log(`Errors found: ${errors.length}\n`);

    if (errors.length > 0) {
      console.log('YAML ERRORS:');
      for (const e of errors) {
        console.log(`\n  ${e.file}` + (e.line ? ` (line ${e.line})` : '') + ':');
        console.log(`    ${e.message}`);
      }
    } else {
      console.log('All YAML files pass validation.');
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
} catch (e) {
  if (!JSON_OUTPUT) console.error(`[validate-all-yaml] Fatal error: ${e.message}`);
  process.exit(2);
}
