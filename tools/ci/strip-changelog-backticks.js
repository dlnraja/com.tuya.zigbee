#!/usr/bin/env node
'use strict';
// Supprime les backticks du changelog (le script d'extraction du pipeline
// les exécute comme des commandes shell → exit 127).
const fs = require('fs');
const p = '.homeychangelog.json';
const h = JSON.parse(fs.readFileSync(p, 'utf8'));
let n = 0;
for (const e of h.changelog || []) {
  for (const k of Object.keys(e)) {
    if (typeof e[k] === 'string' && e[k].includes('`')) {
      e[k] = e[k].replace(/`/g, "'");
      n++;
    }
  }
}
fs.writeFileSync(p, JSON.stringify(h, null, 2));
console.log('backticks remplacés:', n);
