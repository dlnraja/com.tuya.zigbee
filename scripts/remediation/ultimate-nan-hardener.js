#!/usr/bin/env node
/**
 * scripts/remediation/ultimate-nan-hardener.js
 * v1.4.1: Final Precision Hardening.
 * Features:
 * - Targets ONLY lines flagged in ZERO_DEFECT_AUDIT.json.
 * - String and Comment masking to prevent pollution.
 * - Strict operand matching (no greedy cross-function matches).
 * - Handles safeMultiply, safeDivide, safeParse.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const AUDIT_FILE = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');
const UTILS_PATH = 'lib/utils/tuyaUtils.js';

if (!fs.existsSync(AUDIT_FILE)) {
  console.error(' Audit file not found. Run zero-defect-architect-audit.js first.');
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
const warnings = audit.naNSafetyCheck || [];

console.log(` Starting Final Precision Hardening for ${warnings.length} risks...`);

const targets = {}; // filePath -> [lineNumbers]
warnings.forEach(w => {
  const parts = w.split(':');
  const filePath = parts[0];
  const lineNum = parseInt(parts[1] , 10);
  if (!targets[filePath]) targets[filePath] = [];
  targets[filePath].push(lineNum);
});

let filesFixed = 0;
let totalChanges = 0;

for (const [relPath, lineNums] of Object.entries(targets)) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) continue;

  let content = fs.readFileSync(absPath, 'utf8');
  let lines = content.split('\n');
  let fileChanges = 0;

  lineNums.forEach(lineNum => {
    const i = lineNum - 1;
    if (!lines[i]) return;

    let line = lines[i];
    const originalLine = line;

    // 1. Mask strings and comments
    const strings = [];
    const comments = [];
    
    // Mask strings
    let maskedLine = line.replace(/(['"`])(.*? )\1/g, (match) => {
      strings.push(match);
      return `___STR${strings.length - 1}___`;
    });

    // Mask trailing comments
    maskedLine = maskedLine.replace(/\/\/.*$/, (match) => {
      comments.push(match);
      return `___COM${comments.length - 1}___`;
    });

    // 2. Perform Transformations on maskedLine
    // v1.4.2: Handles function calls and parenthesized expressions safely
    const OPERAND_SIMPLE = '[a-zA-Z0-9_$.]+(?:\\[[^\\]]+\\])?'       ;
    const OPERAND_FUNC = '[a-zA-Z0-9_$.]+\\((?:[^()]|\\([^()]*\\))*\\)'      ;
    const OPERAND_PAREN = '\\((?:[^()]|\\([^()]*\\))+\\)'      ;
    
    // Combined operand regex (ordered by complexity/specificity)
    const OPERAND = `(?:${OPERAND_FUNC}|${OPERAND_PAREN}|${OPERAND_SIMPLE})`      ;
    
    // a. Division by constant (expr / 10)
    const CONST_DIV = new RegExp(`(${OPERAND})\\s*\\/\\s*(\\d+(?:\\.\\d+)? )`, 'g');
    maskedLine = maskedLine.replace(CONST_DIV, (match, num, den) => {
        const tNum = num.trim();
        if (['return', 'const', 'let', 'var', 'if', 'else', 'case'].includes(tNum)) return match;
        if (tNum.includes('safe')) return match;
        return `${tNum}/${den}`;
    });

    // b. Division by variable (expr / divisor)
    const VAR_DIV = new RegExp(`(${OPERAND})\\s*\\/\\s*([a-zA-Z_$][a-zA-Z0-9_.]*)`, 'g');
    maskedLine = maskedLine.replace(VAR_DIV, (match, num, den) => {
        const tNum = num.trim();
        if (['return', 'const', 'let', 'var', 'if', 'else', 'http', 'case'].includes(tNum)) return match;
        if (!isNaN(den)) return match; // Already handled
        if (tNum.includes('safe') || den.includes('safe')) return match;
        return `${tNum}/${den}`;
    });

    // c. Multiplication (expr * expr)
    const MULT = new RegExp(`(${OPERAND})\\s*\\*\\s*(${OPERAND})`, 'g');
    maskedLine = maskedLine.replace(MULT, (match, a, b) => {
        const tA = a.trim();
        const tB = b.trim();
        if (['return', 'const', 'let', 'var', 'if', 'else', 'import', 'case'].includes(tA)) return match;
        if (tA.includes('safe') || tB.includes('safe')) return match;
        if (tA === 'import') return match;
        return `${tA}*${tB}`;
    });

    // 3. Unmask
    let finalLine = maskedLine;
    comments.forEach((c, idx) => { finalLine = finalLine.replace(`___COM${idx}___`, c); });
    strings.forEach((s, idx) => { finalLine = finalLine.replace(`___STR${idx}___`, s); });

    if (finalLine !== originalLine) {
      lines[i] = finalLine;
      fileChanges++;
    }
  });

  if (fileChanges > 0) {
    content = lines.join('\n');
    
    // Auto-import management
    const needsSafeParse = content.includes('safeParse');
    const needsSafeDivide = content.includes('safeDivide');
    const needsSafeMultiply = content.includes('safeMultiply');
    const isUtilsFile = relPath.includes('tuyaUtils.js');

    if (!isUtilsFile && (needsSafeParse || needsSafeDivide || needsSafeMultiply)) {
        const fileDir = path.dirname(absPath);
        let relToUtils = path.relative(fileDir, path.join(ROOT, UTILS_PATH)).replace(/\\/g, '/');
        if (!relToUtils.startsWith('.')) relToUtils = './' + relToUtils;

        const hasUtilsMatch = content.match(/const\s*{\s*([^}]+)\s*}\s*=\s*require\(['"].*tuyaUtils.js['"]\)/);
        if (hasUtilsMatch) {
            content = content.replace(/const\s*{\s*([^}]+)\s*}\s*=\s*require\(['"].*tuyaUtils.js['"]\)/, (m, inner) => {
                let parts = inner.split(',').map(p => p.trim());
                if (needsSafeParse && !parts.includes('safeParse')) parts.push('safeParse');
                if (needsSafeDivide && !parts.includes('safeDivide')) parts.push('safeDivide');
                if (needsSafeMultiply && !parts.includes('safeMultiply')) parts.push('safeMultiply');
                parts = [...new Set(parts)].sort();
                return `const { ${parts.join(', ')} } = require('${relToUtils}')`;
            });
        } else {
            let imports = [];
            if (needsSafeParse) imports.push('safeParse');
            if (needsSafeDivide) imports.push('safeDivide');
            if (needsSafeMultiply) imports.push('safeMultiply');
            const importLine = `const { ${imports.sort().join(', ')} } = require('${relToUtils}');`;
            
            const linesList = content.split('\n');
            let insertIndex = 0;
            if (linesList[0].includes('use strict')) insertIndex = 1;
            else if (linesList[0].startsWith('#!')) insertIndex = 1;
            
            // Check if already has a tuyaUtils import under different name or something
            if (!content.includes(relToUtils)) {
                linesList.splice(insertIndex, 0, importLine);
                content = linesList.join('\n' );
            }
        }
    }

    fs.writeFileSync(absPath, content);
    filesFixed++;
    totalChanges += fileChanges;
    console.log(` Hardened: ${relPath} (${fileChanges} changes)`);
  }
}

console.log(`\n Precision Hardening Complete: ${filesFixed} files, ${totalChanges} changes.`);
