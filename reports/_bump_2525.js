'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = path.join(root, 'app.json');
let s = fs.readFileSync(app, 'utf8');
if (!s.includes('"version":"5.12.199"')) {
  console.error('NO_MATCH current=', (s.match(/"version":"[^"]+"/) || [])[0]);
  process.exit(1);
}
s = s.replace('"version":"5.12.199"', '"version":"5.12.200"');
fs.writeFileSync(app, s);
console.log('APPJSON_BUMPED 5.12.200');
