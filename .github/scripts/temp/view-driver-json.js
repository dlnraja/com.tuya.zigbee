// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const drv = app.drivers.find(d => d.id === 'air_purifier');
console.log(JSON.stringify(drv?.zigbee, null, 2));
