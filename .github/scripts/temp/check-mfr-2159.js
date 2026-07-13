// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\HP\\Desktop\\homey-app\\tuya_repair\\screenshots\\cartography\\build-2159-api.json', 'utf8'));
const drv = data.drivers.find(d => d.id === 'air_purifier');
console.log('air_purifier details in 2159:', JSON.stringify(drv, null, 2));
