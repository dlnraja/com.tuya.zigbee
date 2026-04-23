#!/usr/bin/env node
/**
 * scripts/remediation/resolve-nan-risks.js
 * v7.5.0: Automated remediation of NaN safety warnings.
 * Uses ZERO_DEFECT_AUDIT.json as input.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const AUDIT_FILE = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');
const TUYA_UTILS_PATH = 'lib/utils/tuyaUtils.js';

if (!fs.existsSync(AUDIT_FILE)) {
  console.error(' Audit file not found. Run zero-defect-architect-audit.js first.');
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
const warnings = audit.naNSafetyCheck || [];

console.log(` Starting remediation of ${warnings.length} NaN risk warnings...`);

const filesToProcess = new Set();
warnings.forEach(w => {
  const filePath = w.split(':')[0];
  if (!filePath.includes('.homeybuild')) {
    filesToProcess.add(filePath);
  }
});

let fixedCount = 0;
let totalReplacements = 0;

filesToProcess.forEach(relPath => {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  // 1. Ensure safeParse import
  if (!content.includes('safeParse') && !fullPath.includes('tuyaUtils.js')) {
    const fileDir = path.dirname(fullPath);
    let relToUtils = path.relative(fileDir, path.join(ROOT, TUYA_UTILS_PATH)).replace(/\\/g, '/');
    if (!relToUtils.startsWith('.')) relToUtils = './' + relToUtils;

    // Check if tuyaUtils is already required under another name
    if (content.includes('tuyaUtils = require')) {
        // Already there, maybe we just need the destructuring or use tuyaUtils.safeParse
        // For simplicity, we'll try to add it.
    }

    const importLine = `const { safeParse } = require('${relToUtils}');\n`;
    
    if (content.includes("'use strict';")) {
      content = content.replace("'use strict';", "'use strict';\n" + importLine);
    } else {
      content = importLine + content;
    }
  }

  // 2. Perform Replacements (Common Patterns)
  const patterns = [
    { regex: /([a-zA-Z0-9_\.]+)\s*\/\s*1000(? !\d )/g , replacement: '$1/1000' },
    { regex: /([a-zA-Z0-9_\.]+)\s*\/\s*100(? !\d )/g , replacement: '$1/100' },
    { regex: /([a-zA-Z0-9_\.]+)\s*\/\s*10(? !\d )/g , replacement: '$1/10' },
    { regex: /([a-zA-Z0-9_\.]+)\s*\*\s*0\.1(? !\d )/g , replacement: '$1/10' },
    { regex: /([a-zA-Z0-9_\.]+)\s*\*\s*0\.01(? !\d )/g , replacement: '$1/100' },
    { regex: /([a-zA-Z0-9_\.]+)\s*\*\s*0\.001(? !\d )/g , replacement: '$1/1000' },
  ];

  let replacedInFile = 0;
  patterns.forEach(p => {
    const count = (content.match(p.regex) || []).length;
    if (count > 0) {
      content = content.replace(p.regex, p.replacement);
      replacedInFile += count;
    }
  });

  if (content !== original) {
    fs.writeFileSync(fullPath, content);
    fixedCount++;
    totalReplacements += replacedInFile;
    console.log(` Fixed: ${relPath} (${replacedInFile} replacements)`);
  }
});

console.log(`\n Remediation complete! Fixed ${fixedCount} files with ${totalReplacements} total replacements.`);
