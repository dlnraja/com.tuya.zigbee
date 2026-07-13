'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCAN_DIRS = ['lib', 'drivers'];
const BAD_PATTERNS = [
  {
    id: 'optional-detached-timeout',
    re: /\b(?:this(?:\.device)?\.homey|device\.homey|homey)\?\.(?:setTimeout|clearTimeout|setInterval|clearInterval)\s*(?:\?\?|\|\|)\s*(?:setTimeout|clearTimeout|setInterval|clearInterval)\b/,
    message: 'Homey timer method is detached by optional fallback; bind it or call homey.setTimeout directly.',
  },
  {
    id: 'unbound-homey-timer-assignment',
    re: /\b(?:const|let|var)\s+\w+\s*=\s*(?:this(?:\.device)?\.homey|device\.homey|homey)\.(?:setTimeout|clearTimeout|setInterval|clearInterval)\b(?!\s*\()/,
    message: 'Homey timer method assigned without bind(); SDK methods need their Homey context.',
  },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) walk(file, out);
    else if (file.endsWith('.js')) out.push(file);
  }
  return out;
}

const findings = [];
for (const base of SCAN_DIRS) {
  for (const file of walk(path.join(ROOT, base))) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/^\s*(?:\/\/|\*)/.test(line)) return;
      for (const pattern of BAD_PATTERNS) {
        if (pattern.re.test(line)) {
          findings.push({ file: rel, line: index + 1, ...pattern, text: line.trim() });
        }
      }
    });
  }
}

if (findings.length) {
  console.error('Homey timer context guard failed:');
  for (const f of findings) {
    console.error(`- ${f.file}:${f.line} [${f.id}] ${f.message}`);
    console.error(`  ${f.text}`);
  }
  process.exit(1);
}

console.log('Homey timer context guard passed');
