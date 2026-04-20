#!/usr/bin/env node
/**
 * scripts/remediation/resolve-numeric-violations.js
 * v7.5.0: Automated remediation of numeric cluster constant violations.
 * Uses ZERO_DEFECT_AUDIT.json as input.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const AUDIT_FILE = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');
const ZIGBEE_CONSTANTS_PATH = 'lib/constants/ZigbeeConstants.js';

if (!fs.existsSync(AUDIT_FILE)) {
  console.error(' Audit file not found. Run zero-defect-architect-audit.js first.');
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
const violations = audit.numericConstantViolations || [];

console.log(` Starting remediation of ${violations.length} violations...`);

const filesToProcess = new Set();
violations.forEach(v => {
  const filePath = v.split(':')[0];
  if (!filePath.includes('.homeybuild')) { // Skip build artifacts
    filesToProcess.add(filePath);
  }
});

let fixedCount = 0;

filesToProcess.forEach(relPath => {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  // 1. Ensure ZigbeeConstants import
  if (!content.includes('ZigbeeConstants') && !fullPath.includes('ZigbeeConstants.js')) {
    // Calculate relative path to constants
    const fileDir = path.dirname(fullPath);
    const targetDir = path.join(ROOT, path.dirname(ZIGBEE_CONSTANTS_PATH));
    let relToConstants = path.relative(fileDir, path.join(ROOT, ZIGBEE_CONSTANTS_PATH)).replace(/\\/g, '/');
    if (!relToConstants.startsWith('.')) relToConstants = './' + relToConstants;

    const importLine = `const { CLUSTERS } = require('${relToConstants}');\n`;
    
    // Insert after 'use strict' or at top
    if (content.includes("'use strict';")) {
      content = content.replace("'use strict';", "'use strict';\n\n" + importLine);
    } else {
      content = importLine + content;
    }
  }

  // 2. Perform Replacements
  // Replace string literals: 'CLUSTERS.TUYA_EF00', "CLUSTERS.TUYA_EF00"
  content = content.replace(/'CLUSTERS.TUYA_EF00'/g, 'CLUSTERS.TUYA_EF00');
  content = content.replace(/"CLUSTERS.TUYA_EF00"/g, 'CLUSTERS.TUYA_EF00');
  
  // Replace numeric literal in bracket access: [CLUSTERS.TUYA_EF00], [CLUSTERS.TUYA_EF00]
  content = content.replace(/\[CLUSTERS.TUYA_EF00\]/g, '[CLUSTERS.TUYA_EF00]');
  content = content.replace(/\[CLUSTERS.TUYA_EF00\]/g, '[CLUSTERS.TUYA_EF00]');
  
  // Replace numeric literal in comparisons: === CLUSTERS.TUYA_EF00, === CLUSTERS.TUYA_EF00
  content = content.replace(/===\s*CLUSTERS.TUYA_EF00/g, '=== CLUSTERS.TUYA_EF00');
  content = content.replace(/===\s*CLUSTERS.TUYA_EF00/g, '=== CLUSTERS.TUYA_EF00');
  content = content.replace(/!==\s*CLUSTERS.TUYA_EF00/g, '!== CLUSTERS.TUYA_EF00');
  content = content.replace(/!==\s*CLUSTERS.TUYA_EF00/g, '!== CLUSTERS.TUYA_EF00');

  // Specific common patterns in this codebase
  content = content.replace(/endpoint.bind\(CLUSTERS.TUYA_EF00\)/g, 'endpoint.bind(CLUSTERS.TUYA_EF00)');
  content = content.replace(/endpoint.bind\(CLUSTERS.TUYA_EF00\)/g, 'endpoint.bind(CLUSTERS.TUYA_EF00)');

  if (content !== original) {
    fs.writeFileSync(fullPath, content);
    fixedCount++;
    console.log(` Fixed: ${relPath}`);
  }
});

console.log(`\n Remediation complete! Fixed ${fixedCount} files.`);
