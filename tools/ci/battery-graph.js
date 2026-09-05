// battery-graph.js — P54 audit tool
// Show the import graph: who imports which battery files
'use strict';
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (f.endsWith('.js')) files.push(p);
  }
  return files;
}

const allFiles = walk('lib').concat(walk('drivers'));
const batteryFiles = allFiles.filter(f => /battery|Battery/i.test(f) && f.endsWith('.js'));
const otherLibFiles = allFiles.filter(f => f.startsWith('lib/') && !batteryFiles.includes(f));

const importedBy = new Map(); // battery file -> set of importers
for (const f of batteryFiles) importedBy.set(f, new Set());

for (const f of otherLibFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const re = /require\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let req = m[1];
    if (req.startsWith('.')) {
      // Resolve relative path
      const dir = path.dirname(f);
      const abs = path.resolve(dir, req);
      // Normalize to forward slashes
      const norm = abs.replace(/\\/g, '/');
      if (importedBy.has(norm)) {
        importedBy.get(norm).add(f);
      }
      // Also try with .js extension
      if (importedBy.has(norm + '.js')) {
        importedBy.get(norm + '.js').add(f);
      }
    }
  }
}

console.log('Battery file -> Imported by:');
for (const [bf, importers] of [...importedBy.entries()].sort()) {
  if (importers.size === 0) {
    console.log('  ' + bf + '  [NEVER IMPORTED]');
  } else {
    console.log('  ' + bf + '  [' + importers.size + ' importers]');
    [...importers].sort().slice(0, 3).forEach(i => console.log('      <- ' + i));
    if (importers.size > 3) console.log('      ... and ' + (importers.size - 3) + ' more');
  }
}
