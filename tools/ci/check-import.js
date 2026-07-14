// check-import.js — Show what UnifiedSensorBase imports from battery
'use strict';
const fs = require('fs');
const f = process.argv[2] || 'lib/devices/UnifiedSensorBase.js';
const content = fs.readFileSync(f, 'utf8');
const re = /require\(['"]([^'"]+)['"]\)/g;
let m;
const found = [];
while ((m = re.exec(content)) !== null) {
  if (/[Bb]attery/.test(m[1])) found.push(m[1]);
}
console.log(f + ' battery imports:');
found.forEach(i => console.log('  ' + i));
