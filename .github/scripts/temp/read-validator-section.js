// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');
const path = require('path');
const file = 'c:/Users/HP/Desktop/homey-app/tuya_repair/scripts/validation/app-json-dual-layer-validator.js';
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');
console.log(lines.slice(279, 349).map((l, i) => `${280 + i}: ${l}`).join('\n'));
