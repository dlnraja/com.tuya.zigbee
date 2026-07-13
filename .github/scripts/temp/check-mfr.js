// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const noMfr = [];
const emptyMfr = [];

for (const drv of app.drivers || []) {
  if (drv.zigbee) {
    if (!drv.zigbee.manufacturerName) {
      noMfr.push(drv.id);
    } else if (Array.isArray(drv.zigbee.manufacturerName) && drv.zigbee.manufacturerName.length === 0) {
      emptyMfr.push(drv.id);
    }
  }
}

console.log('Drivers with no manufacturerName:', noMfr);
console.log('Drivers with empty manufacturerName array:', emptyMfr);
