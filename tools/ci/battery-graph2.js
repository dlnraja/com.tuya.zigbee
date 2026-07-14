// battery-graph2.js — fixed version using node's actual resolution
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (f.endsWith('.js')) files.push(p);
  }
  return files;
}

const allFiles = walk('lib');
const batteryFiles = allFiles.filter(f => /battery|Battery/i.test(f) && f.endsWith('.js'));
const batteryAbs = new Set(batteryFiles.map(f => path.resolve(f)));

const importedBy = new Map();
for (const f of batteryFiles) importedBy.set(f, new Set());

for (const f of allFiles) {
  if (batteryAbs.has(path.resolve(f))) continue;
  const content = fs.readFileSync(f, 'utf8');
  const re = /require\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let req = m[1];
    let resolved = null;
    try {
      // Use Node's require.resolve to find the actual file
      const dir = path.dirname(path.resolve(f));
      resolved = Module.createRequire(path.resolve(f)).resolve(req);
    } catch (e) {
      continue;
    }
    // Normalize
    if (resolved.endsWith('.js')) resolved = resolved.slice(0, -3);
    // Check if this resolves to a battery file
    for (const bf of batteryFiles) {
      const bfAbs = path.resolve(bf).replace(/\\/g, '/');
      const rNorm = resolved.replace(/\\/g, '/');
      if (bfAbs === rNorm || bfAbs === rNorm + '.js' || rNorm === bfAbs.replace(/\.js$/, '')) {
        importedBy.get(bf).add(f);
      }
    }
  }
}

// ALSO scan battery files themselves (their internal requires)
for (const f of batteryFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const re = /require\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let req = m[1];
    let resolved = null;
    try {
      resolved = Module.createRequire(path.resolve(f)).resolve(req);
    } catch (e) { continue; }
    if (resolved.endsWith('.js')) resolved = resolved.slice(0, -3);
    for (const bf of batteryFiles) {
      const bfAbs = path.resolve(bf).replace(/\\/g, '/');
      const rNorm = resolved.replace(/\\/g, '/');
      if (bfAbs === rNorm || bfAbs === rNorm + '.js' || rNorm === bfAbs.replace(/\.js$/, '')) {
        importedBy.get(bf).add(f);
      }
    }
  }
}

console.log('Battery file -> Imported by (in lib/):');
for (const [bf, importers] of [...importedBy.entries()].sort()) {
  if (importers.size === 0) {
    console.log('  ' + bf + '  [NEVER IMPORTED in lib/]');
  } else {
    console.log('  ' + bf + '  [' + importers.size + ' importers]');
    [...importers].sort().slice(0, 5).forEach(i => console.log('      <- ' + i));
    if (importers.size > 5) console.log('      ... and ' + (importers.size - 5) + ' more');
  }
}

// Also check drivers
const driverFiles = walk('drivers');
for (const f of driverFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const re = /require\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let req = m[1];
    let resolved = null;
    try {
      resolved = Module.createRequire(path.resolve(f)).resolve(req);
    } catch (e) { continue; }
    for (const bf of batteryFiles) {
      const bfAbs = path.resolve(bf).replace(/\\/g, '/');
      const rNorm = resolved.replace(/\\/g, '/');
      if (bfAbs === rNorm || bfAbs === rNorm + '.js' || rNorm === bfAbs.replace(/\.js$/, '')) {
        importedBy.get(bf).add(f);
      }
    }
  }
}

console.log('\nAfter including drivers:');
for (const [bf, importers] of [...importedBy.entries()].sort()) {
  if (importers.size === 0) {
    console.log('  ' + bf + '  [NEVER IMPORTED ANYWHERE]');
  } else {
    console.log('  ' + bf + '  [' + importers.size + ' importers total]');
  }
}
