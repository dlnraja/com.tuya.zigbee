'use strict';
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('scripts/data/current-fps.json', 'utf8'));
console.log('top keys', Object.keys(j).slice(0, 30));
function walk(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    if (obj.some((m) => typeof m === 'string' && /5slehgeo/i.test(m))) {
      console.log('array@', path, 'sample', obj.filter((m) => /5slehgeo/i.test(m)));
    }
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    walk(v, path ? `${path}.${k}` : k);
  }
}
walk(j);
