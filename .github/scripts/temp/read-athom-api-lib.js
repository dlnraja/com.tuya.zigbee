@Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');
const path = require('path');
const file = path.join(process.env.APPDATA, 'npm/node_modules/homey/lib/AthomApi.js');
console.log(fs.readFileSync(file, 'utf8'));
