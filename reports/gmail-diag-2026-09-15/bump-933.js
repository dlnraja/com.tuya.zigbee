'use strict';
const fs = require('fs');
for (const f of ['app.json']) {
  const j = JSON.parse(fs.readFileSync(f));
  j.version = '9.0.933';
  fs.writeFileSync(f, `${JSON.stringify(j)}\n`);
  console.log(f, j.version);
}
