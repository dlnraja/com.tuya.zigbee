const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(process.cwd(), 'drivers');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('device.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(DRIVERS_DIR);
console.log(`Found ${files.length} device.js files.`);

let fixedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Fix 1: capability, -> (remove it)
  // This usually happens in an object literal like { capability, setting: '...' }
  // We want to remove the 'capability,' part.
  content = content.replace(/^\s*capability,\s*$/gm, '');
  
  // Also handle cases where it might be on the same line as other properties
  // e.g. { capability, internal: '...' }
  content = content.replace(/\{\s*capability,\s*/g, '{ ');
  content = content.replace(/,\s*capability,\s*/g, ', ');

  // Fix 2: safeDivide((v, divisor)) -> safeDivide(v, divisor)
  content = content.replace(/safeDivide\(\(([^,]+),\s*([^)]+)\)\s*\)/g, 'safeDivide($1, $2)');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`);
    fixedCount++;
  }
}

console.log(`Done. Fixed ${fixedCount} files.`);
