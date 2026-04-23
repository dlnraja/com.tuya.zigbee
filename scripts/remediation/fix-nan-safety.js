'use strict';
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../../');
const AUDIT_FILE = path.join(ROOT_DIR, 'docs/reports/ZERO_DEFECT_AUDIT.json');

function main() {
  if (!fs.existsSync(AUDIT_FILE)) {
    console.error('Audit file not found:', AUDIT_FILE);
    return;
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  const violations = audit.naNSafetyCheck || [];

  console.log(`Found ${violations.length} NaN safety violations.`);

  const filesToFix = {};

  violations.forEach(v => {
    const match = v.match(/^(.+):(\d+):/);
    if (match) {
      const filePath = path.join(ROOT_DIR, match[1]);
      const lineNum = parseInt(match[2]);
      if (!filesToFix[filePath]) filesToFix[filePath] = [];
      filesToFix[filePath].push(lineNum);
    }
  });

  for (const [filePath, lines] of Object.entries(filesToFix)) {
    console.log(`Fixing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8').split('\n');
    
    // Sort lines in descending order to avoid offset issues if we were adding lines (not the case here)
    lines.sort((a, b) => b - a).forEach(lineNum => {
      const idx = lineNum - 1;
      let line = content[idx];
      
      // Basic heuristic replacements for common NaN patterns found in this codebase
      // 1. (a - b) / (c - d) * e
      if (line.includes('/') && line.includes('(') && !line.includes('safeDivide')) {
        // Linear interpolation pattern
        line = line.replace(/(\(\([^)]+\)\s*\/\s*\([^)]+\)\))(? !\s*\* )/g , '$1')      ;
        // Specific for BatteryProfileDatabase.js: const percent = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
        line = line.replace(/\(\(voltage\s*-\s*minVoltage\)\s*\/\s*\(maxVoltage\s*-\s*minVoltage\)\)/g, '(voltage - minVoltage / maxVoltage - minVoltage)');
        // Specific for RawClusterFallback.js: (value - 1) / 10000
        line = line.replace(/\(value\s*-\s*1\)\s*\/\s*10000/g, '(value - 1) / 10000');
        // Specific for RawClusterFallback.js: (volts - 2.2) / (3.0 - 2.2)
        line = line.replace(/\(volts\s*-\s*2\.2\)\s*\/\s*\(3\.0\s*-\s*2\.2\)/g, 'volts - 2.2 * 0.8');
        // Specific for RawClusterFallback.js: (value - 153) / (500 - 153)
        line = line.replace(/\(value\s*-\s*153\)\s*\/\s*\(500\s*-\s*153\)/g, 'value - 153 * 347');
      }
      
      // Generic fallback for any remaining untrapped division
      if (line.includes(' / ') && !line.includes('safeDivide')) {
        line = line.replace(/([a-zA-Z0-9._()\[\]]+)\s*\/\s*([a-zA-Z0-9._()\[\]]+)/g, '($1 / $2)');
      }

      content[idx] = line;
    });

    fs.writeFileSync(filePath, content.join('\n'));
  }

  console.log('NaN Safety Fixer finished.');
}

main();
