#!/usr/bin/env node
'use strict';
// find-broken-requires.js v2 — Détecte les require() actifs (hors commentaires) cassés
const fs = require('fs');
const path = require('path');

const missing = [];
function scan(dir) {
  let items;
  try { items = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return; }
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (['node_modules', '.git', 'drivers', '.cache', '.archive', '.diag', 'tmp', 'reference pdf'].includes(item.name)) continue;
      scan(full);
    } else if (item.name.endsWith('.js')) {
      let content;
      try { content = fs.readFileSync(full, 'utf8'); } catch (e) { continue; }

      // Strip commentaires ligne (// ...) et bloc (/* ... */)
      const stripped = content
        .replace(/\/\*[\s\S]*?\*\//g, '')   // bloc
        .replace(/(^|[^:])\/\/.*$/gm, '$1'); // ligne (sans toucher http://)

      const re = /require\(['"](\.\.?\/[^'"]+)['"]\)/g;
      let m;
      while ((m = re.exec(stripped)) !== null) {
        const req = m[1];
        const resolved = path.resolve(path.dirname(full), req);
        const candidates = [resolved, resolved + '.js', resolved + '.json', path.join(resolved, 'index.js')];
        const exists = candidates.some((c) => { try { return fs.existsSync(c); } catch (_) { return false; } });
        if (!exists) {
          missing.push(full.split(path.sep).join('/') + ':' + req);
        }
      }
    }
  }
}
scan('lib');
console.log('require() actifs cassés dans lib/: ' + missing.length);
missing.forEach((m) => console.log('  ❌ ' + m));
