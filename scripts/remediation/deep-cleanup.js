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

function cleanupContent(content) {
  let result = content;

  // 1. Fix corrupted safeMultiply/safeDivide with only one arg (unwrap them)
  // Recursively unwrap so X -> X
  for(let i=0; i<3; i++) {
    result = result.replace(/safeMultiply\(\(([^)]+)\)\)/g, '($1)');
    result = result.replace(/safeDivide\(\(([^)]+)\)\)/g, '($1)');
    result = result.replace(/safeMultiply\(([^)]+)\)/g, '$1');
    result = result.replace(/safeDivide\(([^)]+)\)/g, '$1');
  }

  // 2. Fix the "comma result" conversion pattern: (X * 1000) -> (X * 1000)
  // This handles nested expressions. Use a non-greedy catch for A.
  result = result.replace(/\(([^,({}]+), ([0-9.]+)\)/g, '($1 * $2)');

  // 3. Fix corrupted constants: (X * 0).Y -> (X * 0.Y)
  result = result.replace(/\(([^, ]+), 0\)\.([0-9]+)/g, '($1 * 0.$2)');
  
  // 4. Fix corrupted time constants: (24 * 60) * 60 -> 24 * 60 * 60
  result = result.replace(/\(([0-9]+), ([0-9]+)\) \* /g, '$1 * $2 * ');

  // 5. Fix misplaced "this" in safeMultiply
  result = result.replace(/safeMultiply\(([^,]+), this\)\.options\.([^, ]+)/g, '($1 * this.options.$2)');

  // 6. Double commas or empty args
  result = result.replace(/Math\.round\(([^)]+),\)/g, 'Math.round($1)');
  result = result.replace(/,\)/g, ')'); // General trailing comma in function calls

  // 7. Fix unawaited flow card triggers (sanity check)
  // result = result.replace(/await flowCard\.trigger\(([^)]+)\);/g, 'await flowCard.trigger($1);');

  return result;
}

const allFiles = getFiles(BASE_DIR);
console.log(`Deep cleaning ${allFiles.length} files...`);

allFiles.forEach(file => {
  // Skip binary files and the cleanup script itself
  if (file.includes('deep-cleanup.js')) return;
  
  try {
    const content = fs.readFileSync(file, 'utf8');
    const cleaned = cleanupContent(content);
    if (cleaned !== content) {
      fs.writeFileSync(file, cleaned, 'utf8');
      console.log(`[DEEP-CLEAN] Fixed: ${path.relative(BASE_DIR, file)}`);
    }
  } catch(e) {}
});
