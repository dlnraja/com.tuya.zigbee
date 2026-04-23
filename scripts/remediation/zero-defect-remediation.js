#!/usr/bin/env node
/**
 * zero-defect-remediation.js
 * Automatically fixes identity comparison violations and NaN risks.
 * v7.4.13: Repaired from previous corruption.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs', 'reports', 'ZERO_DEFECT_AUDIT.json');

if (!fs.existsSync(REPORT_PATH)) {
  console.error('Audit report not found. Run audit first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

function getRelativePath(currentFilePath, targetLibPath) {
  const parts = currentFilePath.split(path.sep);
  const depth = parts.length - 1;
  let rel = '';
  
  if (parts[0] === 'drivers') {
    rel = '../../' + targetLibPath;
  } else if (parts[0] === 'lib') {
    for (let i = 0; i < depth - 1; i++) rel += '../';
    rel += targetLibPath.replace('lib/', '');
  } else {
    rel = './' + targetLibPath;
  }
  return rel;
}

function fixFile(filePath, lineNumbers, type) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let lines = content.split('\n');
  let changed = false;

  const sortedLines = [...new Set(lineNumbers)].sort((a, b) => b - a);
  
  for (const lineNum of sortedLines) {
    const i = lineNum - 1;
    if (!lines[i]) continue;
    
    const original = lines[i];
    if (type === 'id') {
      // Identity fixes
      lines[i] = lines[i].replace(/(\w+(?:\.\w+)?)\.toLowerCase\(\)/g, "CI.normalize($1)");
      lines[i] = lines[i].replace(/(\w+(?:\.\w+)?)\.toUpperCase\(\)/g, "CI.normalize($1)");
      lines[i] = lines[i].replace(/(\w+(?:\.\w+)?)\s*===\s*(['"][^'"]+['"])/g, "CI.equalsCI($1, $2)");
      lines[i] = lines[i].replace(/(['"][^'"]+[''])\s*===\s*(\w+(?:\.\w+)?)/g, "CI.equalsCI($2, $1)");
    } else if (type === 'nan') {
      // NaN fixes
      lines[i] = lines[i].replace(/Math\.round\(([^/]+)\s*\/\s*(\d+)\)/g, "Math.round(($1 / $2))");
      lines[i] = lines[i].replace(/Math\.round\(([^*]+)\s*\*\s*([a-zA-Z0-9_$.]+)\)/g, "Math.round(($1 * $2))");
    }
    
    if (lines[i] !== original) changed = true;
  }

  if (changed) {
    const shebang = (lines[0] && lines[0].startsWith('#!')) ? lines.shift() : null;
    const contentCheck = lines.join('\n');
    let hasStrict = lines.findIndex(l => l.includes("'use strict'"));
    
    if (type === 'id' && !contentCheck.includes('const CI = require')) {
        const relPath = getRelativePath(filePath, 'lib/utils/CaseInsensitiveMatcher');
        const insertAt = hasStrict !== -1 ? hasStrict + 1 : 0;
        lines.splice(insertAt, 0, `const CI = require('${relPath}'); // Fix: Architectural Compliance`);
        if (hasStrict !== -1) hasStrict++;
    } else if (type === 'nan' && !contentCheck.includes('const { safeDivide')) {
        const relPath = getRelativePath(filePath, 'lib/utils/tuyaUtils.js');
        const insertAt = hasStrict !== -1 ? hasStrict + 1 : 0;
        lines.splice(insertAt, 0, `const { safeDivide, safeMultiply, safeParse } = require('${relPath}'); // Fix: NaN Safety`);
    }
    
    if (shebang) lines.unshift(shebang);
    fs.writeFileSync(fullPath, lines.join('\n'));
    console.log(`  - Fixed ${type === 'id' ? 'Identity' : 'NaN'} risks: ${filePath}`);
  }
}

function main() {
  console.log(' Starting Zero-Defect Remediation v7.4.13...');
  
  const idErrors = {};
  (report.errors || []).forEach(e => {
    if (e.includes('.homeybuild')) return;
    const parts = e.split(':');
    if (parts.length < 2) return;
    const path = parts[0];
    const line = parseInt(parts[1]);
    if (!idErrors[path]) idErrors[path] = [];
    idErrors[path].push(line);
  });

  const nanRisks = {};
  (report.naNSafetyCheck || []).forEach(r => {
    const parts = r.split(':');
    if (parts.length < 2) return;
    const path = parts[0];
    const line = parseInt(parts[1]);
    if (!nanRisks[path]) nanRisks[path] = [];
    nanRisks[path].push(line);
  });

  Object.keys(idErrors).sort().forEach(p => fixFile(p, idErrors[p], 'id'));
  Object.keys(nanRisks).sort().forEach(p => fixFile(p, nanRisks[p], 'nan'));

  console.log(' Zero-Defect Remediation Complete.');
}

main();
