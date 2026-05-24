const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (p.includes('node_modules')) return;
    if (fs.statSync(p).isDirectory()) walk(p, callback);
    else callback(p);
  });
};

console.log('--- START GLOBAL MATH FIX ---');
walk('.', p => {
  if (p.endsWith('.js')) {
    let content = fs.readFileSync(p, 'utf8');
    let changed = false;

    // Pattern 1: safeMultiply(Math.round(A), B) -> safeMultiply(Math.round(A), B)
    if (/safeMultiply\(Math\.round\(([^,]+), ([^)]+)\)\)/.test(content)) {
      content = content.replace(/safeMultiply\(Math\.round\(([^,]+), ([^)]+)\)\)/g, 'safeMultiply(Math.round($1), $2)');
      changed = true;
    }

    // Pattern 2: safeMultiply(Math.round(A), B) but maybe it's safeMultiply(Math.round(A) B) or similar
    // Actually let's look for safeMultiply with only one arg that looks like it should have two
    // e.g. safeMultiply(Math.round(temp), 10) -> already handled by P1

    // Pattern 3: safeMultiply(A, B) -> safeMultiply(A, B)
    if (/safeMultiply\(\(([^,]+), ([^)]+)\)\)/.test(content)) {
        content = content.replace(/safeMultiply\(\(([^,]+), ([^)]+)\)\)/g, 'safeMultiply($1, $2)');
        changed = true;
    }

    if (changed) {
      console.log(`FIXED: ${p}`);
      fs.writeFileSync(p, content);
    }
  }
});
console.log('--- END GLOBAL MATH FIX ---');
