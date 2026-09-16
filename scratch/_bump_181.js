'use strict';
const fs = require('fs');
for (const f of ['.homeycompose/app.json', 'app.json']) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.version = '5.12.181';
  const out = f.endsWith('app.json') && !f.includes('homeycompose')
    ? `${JSON.stringify(j)}\n`
    : `${JSON.stringify(j, null, 2)}\n`;
  fs.writeFileSync(f, out);
  console.log(f, j.version);
}
