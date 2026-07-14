// find-battery-index-imports.js — Find who requires lib/battery or lib/battery/index directly
'use strict';
const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p).forEach(x => files.push(x));
    else if (f.endsWith('.js')) files.push(p);
  }
  return files;
}

const allFiles = walk('lib').concat(walk('drivers'));
const re = /require\(['"]((?:\.\.\/)+(?:lib\/battery(?:\/index)?|lib\/battery))['"]\)/g;
let count = 0;
const examples = new Set();
for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(re) || [];
  for (const m of matches) {
    count++;
    examples.add(f);
  }
}
console.log('Direct requires of lib/battery or lib/battery/index:', count);
Array.from(examples).forEach(f => console.log('  ' + f));
