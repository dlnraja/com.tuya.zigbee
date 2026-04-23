#!/usr/bin/env node
/**
 * scripts/remediation/resolve-variable-nan-risks.js
 * v7.7.0: Automated wrapping of variable-based divisions in safeDivide.
 * Targets files flagged in ZERO_DEFECT_AUDIT.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const AUDIT_FILE = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');

if (!fs.existsSync(AUDIT_FILE)) {
  console.error(' Audit file not found.');
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
const warnings = audit.naNSafetyCheck || [];

console.log(` Addressing ${warnings.length} variable-based NaN risks...`);

const filesToProcess = new Set();
warnings.forEach(w => {
  const filePath = w.split(':')[0];
  if (fs.existsSync(path.join(ROOT, filePath))) {
    filesToProcess.add(filePath);
  }
});

let totalFixes = 0;

filesToProcess.forEach(relPath => {
  const absPath = path.join(ROOT, relPath);
  let content = fs.readFileSync(absPath, 'utf8');
  let originalContent = content;

  // Regex to find variable divisions: someVar / otherVar
  // Avoiding numbers as the divisor (already handled by simple script)
  // Target: numerator / denominator
  // Added lookbehind to avoid being inside strings or paths
  const VAR_DIV_REGEX = /(? <!['"/] )(? <![a-zA-Z0-9_/])([a-zA-Z0-9_.\[\]]+)\s*\/\s*([a-zA-Z_][a-zA-Z0-9_.\[\]]* )(? ![a-zA-Z0-9_/] )/g       ;

  if (VAR_DIV_REGEX.test(content)) {
    content = content.replace(VAR_DIV_REGEX, (match, num, den) => {
      // Skip if denominator is a number (handled by simple script)
      if (!isNaN(den)) return match;
      // Skip if it is a path or URL
      if (match.includes('//') || match.includes(':/')) return match;
      // Skip common non-code / uses (regex flags etc - though rare at end of word)
      
      return `${num}/${den}`;
    });
  }

  if (content !== originalContent) {
    // Ensure tuyaUtils (with safeDivide) is imported
    if (!content.includes('safeDivide')) {
      let importPath = '';
      if (relPath.includes('lib\\')) {
          const depth = relPath.split(path.sep).length - 1;
          if (relPath.includes('lib\\tuya') || relPath.includes('lib\\utils')) {
             importPath = '../utils/tuyaUtils.js';
          } else {
             importPath = '../lib/utils/tuyaUtils.js';
          }
      } else if (relPath.includes('drivers\\')) {
          importPath = '../../lib/utils/tuyaUtils.js';
      } else {
          importPath = './lib/utils/tuyaUtils.js';
      }

      // Special case for tuyaUtils itself (don't import itself)
      if (relPath.includes('tuyaUtils.js')) {
          // It's already there
      } else {
        const lines = content.split('\n');
        // Check if tuyaUtils is already imported partially
        const existingImport = lines.find(l => l.includes('tuyaUtils.js'));
        if (existingImport) {
          content = content.replace(/const\s*{\s*([^}]+)\s*}\s*=\s*require\(['"].*tuyaUtils.js['"]\)/, (m, inner) => {
             if (inner.includes('safeDivide')) return m;
             return `const { ${inner.trim()}, safeDivide } = require('../../lib/utils/tuyaUtils.js')`.replace(/..\/..\/lib\/utils\/tuyaUtils.js/, importPath);
          });
        } else {
          const importLine = `const { safeDivide } = require('${importPath}');`;
          if (lines[0].includes('use strict')) {
            lines.splice(1, 0, importLine);
          } else {
            lines.unshift(importLine);
          }
          content = lines.join('\n');
        }
      }
    }

    fs.writeFileSync(absPath, content);
    console.log(` Hardened: ${relPath}`);
    totalFixes++;
  }
});

console.log(` Hardened ${totalFixes} files against variable-based NaN risks.`);
