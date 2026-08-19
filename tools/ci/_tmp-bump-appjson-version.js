'use strict';
const fs = require('fs');
const s = fs.readFileSync('app.json', 'utf8');
const m = s.match(/"version"\s*:\s*"([^"]+)"/);
console.log('current', m && m[1]);
if (m && m[1] === '5.12.85') process.exit(0);
const next = s.replace(/"version"\s*:\s*"5\.12\.\d+"/, '"version":"5.12.85"');
if (!/"version"\s*:\s*"5\.12\.85"/.test(next)) {
  console.error('bump failed');
  process.exit(1);
}
fs.writeFileSync('app.json', next);
console.log('bumped to 5.12.85');
