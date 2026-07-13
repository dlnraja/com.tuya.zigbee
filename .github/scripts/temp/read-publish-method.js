// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');
const path = require('path');
const file = path.join(process.env.APPDATA, 'npm/node_modules/homey/lib/App.js');
const code = fs.readFileSync(file, 'utf8');

const lines = code.split('\n');
let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async publish(')) {
    start = i;
    break;
  }
}

if (start !== -1) {
  console.log(lines.slice(start, start + 100).map((l, idx) => `${start + 1 + idx}: ${l}`).join('\n'));
} else {
  console.log('Definition not found');
}
