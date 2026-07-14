// battery-imports.js — P54 audit tool
// Find which battery files are imported from drivers
'use strict';
const fs = require('fs');
const path = require('path');

const driversDir = 'drivers';
const imports = new Set();

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.js')) {
      const content = fs.readFileSync(p, 'utf8');
      const re = /require\(['"]([^'"]*battery[^'"]*|[^'"]*Battery[^'"]*)['"]\)/gi;
      const matches = content.match(re) || [];
      for (const m of matches) {
        const imp = m.match(/['"]([^'"]+)['"]/);
        if (imp) imports.add(imp[1]);
      }
    }
  }
}

walk(driversDir);
console.log('Battery imports from drivers:');
[...imports].sort().forEach(i => console.log('  ' + i));
console.log('Total unique imports:', imports.size);
