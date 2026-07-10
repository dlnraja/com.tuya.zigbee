// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');
const path = require('path');
const file = path.join(process.env.APPDATA, 'npm/node_modules/homey/lib/App.js');
const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log(lines.slice(0, 50).map((l, i) => `${i + 1}: ${l}`).join('\n'));
