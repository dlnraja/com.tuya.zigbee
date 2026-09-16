'use strict';
const fs = require('fs');
const TO = '5.12.202';
for (const f of ['package.json', '.homeycompose/app.json']) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(f, j.version, '->', TO);
  j.version = TO;
  if (f === 'package.json') {
    j.scripts = j.scripts || {};
    j.scripts['check:p2527'] = 'node tools/ci/p2527-untrusted-content-gate.js';
    j.scripts['security:untrusted'] = 'npm run check:p2527';
  }
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}
let s = fs.readFileSync('app.json', 'utf8');
s = s.replace(/"version"\s*:\s*"[^"]+"/, `"version":"${TO}"`);
fs.writeFileSync('app.json', s);
const cl = JSON.parse(fs.readFileSync('.homeychangelog.json', 'utf8'));
if (!cl[TO]) {
  cl[TO] = {
    en: 'Hardened forum and scrape ingest against prompt injection and malicious markup.',
  };
  fs.writeFileSync('.homeychangelog.json', JSON.stringify(cl, null, 2) + '\n');
}
console.log('stable ready', TO);
