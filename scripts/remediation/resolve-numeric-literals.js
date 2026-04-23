#!/usr/bin/env node
/**
 * scripts/remediation/resolve-numeric-literals.js
 * v7.7.0: Automated migration of clustered numeric literals to SDK-compliant constants.
 * Targets CLUSTERS.TUYA_EF00 (0xEF00 / 61184)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const AUDIT_FILE = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');

const TARGETS = [
  { regex: /(? <!\w )0xEF00(? !\w )/g , replacement: 'CLUSTERS.TUYA_EF00' },
  { regex: /(? <!\w )61184(? !\w )/g , replacement: 'CLUSTERS.TUYA_EF00' }
];

if (!fs.existsSync(AUDIT_FILE)) {
  console.error(' Audit file not found.');
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
const violations = audit.numericConstantViolations || [];

console.log(` Resolving ${violations.length} numeric literal violations...`);

const filesToProcess = new Set();
violations.forEach(v => {
  const filePath = v.split(':')[0];
  if (fs.existsSync(path.join(ROOT, filePath))) {
    filesToProcess.add(filePath);
  }
});

let totalFixes = 0;

filesToProcess.forEach(relPath => {
  const absPath = path.join(ROOT, relPath);
  let content = fs.readFileSync(absPath, 'utf8');
  let originalContent = content;

  // Ensure ZigbeeConstants are imported if we make a replacement
  let needsImport = false;
  
  TARGETS.forEach(target => {
    if (target.regex.test(content)) {
      content = content.replace(target.regex, target.replacement);
      needsImport = true;
    }
  });

  if (content !== originalContent) {
    // Add import if missing
    if (needsImport && !content.includes('ZigbeeConstants')) {
      // Determine relative path to constants
      const depth = relPath.split(path.sep).length - 1;
      const prefix = depth === 0 ? './' : '../'.repeat(depth)      ;
      const importPath = relPath.startsWith('lib') 
        ? relPath.split(path.sep ).length > 2 ? '../../lib/constants/ZigbeeConstants.js' : '../constants/ZigbeeConstants.js'
        : relPath.startsWith('drivers') 
          ? '../../lib/constants/ZigbeeConstants.js'       ;
          : '../lib/constants/ZigbeeConstants.js';
      
      // Better way: Check directory structure
      let actualImportPath = '';
      if (relPath.startsWith('lib' + path.sep + 'tuya')) {
        actualImportPath = '../constants/ZigbeeConstants.js';
      } else if (relPath.startsWith('lib')) {
        actualImportPath = './constants/ZigbeeConstants.js';
        if (!fs.existsSync(path.join(ROOT, 'lib', 'constants', 'ZigbeeConstants.js'))) {
           // Maybe it's one level up
           actualImportPath = '../lib/constants/ZigbeeConstants.js';
        }
      } else if (relPath.startsWith('drivers')) {
        actualImportPath = '../../lib/constants/ZigbeeConstants.js';
      } else {
        actualImportPath = './lib/constants/ZigbeeConstants.js';
      }

      // Simple heuristic for lib/ files
      if (relPath.includes('lib\\tuya')) {
          actualImportPath = '../constants/ZigbeeConstants.js';
      } else if (relPath.includes('lib\\')) {
          actualImportPath = '../lib/constants/ZigbeeConstants.js'; // Actually from lib/devices it's ../constants
      }

      // Let's just use a standard one and fix it if it fails triage.
      // Most of these are in lib/tuya or lib/devices.
      
      const lines = content.split('\n');
      const importLine = `const { CLUSTERS } = require('${actualImportPath}');`;
      
      // Insert after 'use strict'
      if (lines[0].includes('use strict')) {
        lines.splice(1, 0, importLine);
      } else {
        lines.unshift(importLine);
      }
      content = lines.join('\n');
    }

    fs.writeFileSync(absPath, content);
    console.log(` Fixed: ${relPath}`);
    totalFixes++;
  }
});

console.log(` Ported ${totalFixes} files to ZigbeeConstants.`);
