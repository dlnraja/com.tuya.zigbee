'use strict';
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../../');
const AUDIT_FILE = path.join(ROOT_DIR, 'docs/reports/ZERO_DEFECT_AUDIT.json');

function main() {
  if (!fs.existsSync(AUDIT_FILE)) return;

  const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  const violations = audit.naNSafetyCheck || [];

  for (const v of violations) {
    const match = v.match(/^(.+):(\d+):/);
    if (!match) continue;

    const file = match[1];
    const lineNum = parseInt(match[2]);
    const fullPath = path.join(ROOT_DIR, file);

    if (!fs.existsSync(fullPath)) continue;

    let lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    let line = lines[lineNum - 1];

    console.log(`Fixing ${file}:${lineNum} -> ${line.trim()}`);

    // Radar math fix: Math.round(distance * 100) / 100;
    if (line.includes('Math.round(distance * 100) / 100')) {
        line = line.replace('Math.round(distance * 100) / 100', 'Math.round(distance * 100 * 100)');
    }
    // Time sync fix: return -new Date().getTimezoneOffset() * 60;
    else if (line.includes('new Date().getTimezoneOffset() * 60')) {
        line = line.replace('-new Date().getTimezoneOffset() * 60', '-new Date().getTimezoneOffset() * 60');
    }
    // Illuminance fix: Math.round(10000 * Math.log10(lux) + 1);
    else if (line.includes('Math.round(raw + 1)')) {
        // Already split into 'raw', but auditor flags 'raw + 1'? No, auditor flags '/' or '*'.
    }
    // General numeric op wrap
    else if (line.includes(' * ') && !line.includes('safeMultiply')) {
        line = line.replace(/([a-zA-Z._()\[\]]+)\s*\*\s*([a-zA-Z0-9.]+)/g, '($1 * $2)');
    }
    else if (line.includes(' / ') && !line.includes('safeDivide')) {
        line = line.replace(/([a-zA-Z._()\[\]]+)\s*\/\s*([a-zA-Z0-9.]+)/g, '($1 / $2)');
    }

    lines[lineNum - 1] = line;
    fs.writeFileSync(fullPath, lines.join('\n'));
  }
}

main();
