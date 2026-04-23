'use strict';
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve('c:/Users/HP/Desktop/homey app/tuya_repair');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

function fixContent(content) {
  let res = content;

  // 1. Fix unclosed Date.now()
  res = res.replace(/Date\.now\(( [^)])/g, 'Date.now()$1');
  res = res.replace(/Date\.now\(([^)])/g, 'Date.now()$1');
  
  // 2. Fix unclosed .getTime()
  res = res.replace(/\.getTime\(( [^)])/g, '.getTime()$1');
  res = res.replace(/\.getTime\(([^)])/g, '.getTime()$1');

  // 3. Fix corrupted average power logic (again, more general)
  // ((A / B), C) -> (A / B) * C
  res = res.replace(/\(safeDivide\(([^,]+),([^)]+)\), ([0-9.]+)\)/g, '($1 / $2) * $3');
  res = res.replace(/\(safeDivide\(([^,]+), ([^)]+)\), ([0-9.]+)\)/g, '($1 / $2) * $3');

  // 4. Fix remaining comma operators that are definitely unit conversions
  res = res.replace(/, 1000\)/g, ' * 1000)');
  res = res.replace(/, 3600000\)/g, ' * 3600000)');
  res = res.replace(/, 60000\)/g, ' * 60000)');
  res = res.replace(/, 86400000\)/g, ' * 86400000)');

  // 5. Cleanup recursive garbage like ((X))
  res = res.replace(/\(\(([^,()]+)\)\)/g, '($1)');

  return res;
}

const files = getFiles(BASE_DIR);
files.forEach(f => {
  if (f.includes('final-integrity-fix.js')) return;
  const original = fs.readFileSync(f, 'utf8');
  const cleaned = fixContent(original);
  if (cleaned !== original) {
    fs.writeFileSync(f, cleaned, 'utf8');
    console.log(`[INTEGRITY] Fixed: ${path.relative(BASE_DIR, f)}`);
  }
});
