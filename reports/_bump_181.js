'use strict';
const fs = require('fs');
for (const f of ['.homeycompose/app.json', 'app.json']) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.version = '5.12.181';
  const pretty = f.includes('homeycompose');
  fs.writeFileSync(f, pretty ? `${JSON.stringify(j, null, 2)}\n` : `${JSON.stringify(j)}\n`);
  console.log(f, j.version);
}
