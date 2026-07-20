#!/usr/bin/env node
'use strict';
const fs = require('fs');
const a = JSON.parse(fs.readFileSync('.github/fingerprint-collision-baseline.json.new', 'utf8'));
const b = JSON.parse(fs.readFileSync('.github/fingerprint-collision-baseline.json', 'utf8'));
const sortKey = c => c.key + '|' + c.drivers.slice().sort().join(',');
const ac = new Set(a.collisions.map(sortKey));
const bc = new Set(b.collisions.map(sortKey));
console.log('Added (in new, not in old):');
[...ac].filter(x => !bc.has(x)).forEach(x => console.log('  ' + x));
console.log('Removed (in old, not in new):');
[...bc].filter(x => !ac.has(x)).forEach(x => console.log('  ' + x));
