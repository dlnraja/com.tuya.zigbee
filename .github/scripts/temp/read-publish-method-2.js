// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');
const path = require('path');
const file = path.join(process.env.APPDATA, 'npm/node_modules/homey/lib/App.js');
const code = fs.readFileSync(file, 'utf8');

const lines = code.split('\n');
console.log(lines.slice(1312, 1380).map((l, idx) => `${1313 + idx}: ${l}`).join('\n'));
