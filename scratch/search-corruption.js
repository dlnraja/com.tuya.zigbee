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
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(DRIVERS_DIR);
let found = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('capability,')) {
    console.log(`Found in: ${path.relative(process.cwd(), file)}`);
    found++;
  }
}

console.log(`Total files with 'capability,': ${found}`);
