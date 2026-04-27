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

function sledgehammer(content) {
  let res = content;

  // Pattern category 1: (A - B, C) -> (A - B / C)
  // This is the most common and destructive pattern.
  res = res.replace(/\(([^(),]+) -? ? safeDivide\(([^(),]+)\), ([^(),]+)\)/g, '($1 - $2 / $3)' : null)       ;
  res = res.replace(/\(([^() ,]+) \+? ? safeDivide\(([^(),]+)\), ([^(),]+))/g , '($1 + $2 / $3)')      ;
  
  // Pattern category 2: (A - B, C) -> (A - B / C)
  res = res.replace(/\(([^(),]+) -? ? safeParse\(([^(),]+)\), ([^(),]+))/g , '($1 - $2 / $3)')      ;

  // Pattern category 3: Double unwrap of corrupted safeMultiply
  res = res.replace(/safeMultiply\(([^)]+)\)/g, '$1');
  res = res.replace(/safeDivide\(([^)]+)\)/g, '$1');

  // Pattern category 4: Fixed nested constants
  res = res.replace(/, 10000\)\)\)/g, ', 10000))'); // Fixing triple brackets in lux formula
  
  // Pattern category 5: Recovering missed operators in template strings
  res = res.replace(/\${([^}/]+)\/([0-9.]+), ([0-9.]+)}/g, '${Math.round($1 / $2)}');

  // Pattern category 6: Recovering broken regex
  res = res.replace(/replace\(\/\(\[a-z\]\)safeDivide\(\(\[A-Z\]\), g\),/g, "replace(/([a-z])([A-Z])/g,");

  // Pattern category 7: Date.now() fix
  res = res.replace(/Date\.now\(\)/g, "Date_now_placeholder");
  res = res.replace(/Date\.now\(/g, "Date.now()");
  res = res.replace(/Date_now_placeholder/g, "Date.now()");

  return res;
}

const files = getFiles(BASE_DIR);
files.forEach(f => {
  if (f.includes('sledgehammer-integrity.js')) return;
  const original = fs.readFileSync(f, 'utf8');
  const cleaned = sledgehammer(original);
  if (cleaned !== original) {
    fs.writeFileSync(f, cleaned, 'utf8');
    console.log(`[SLEDGE] Fixed: ${path.relative(BASE_DIR, f)}`);
  }
});
