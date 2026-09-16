'use strict';
const fs = require('fs');
const VER = '5.12.204';
for (const f of ['package.json', '.homeycompose/app.json', 'app.json']) {
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    j.version = VER;
    fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
  } catch (e) {
    console.warn('skip', f, e.message);
  }
}
try {
  const c = JSON.parse(fs.readFileSync('.homeychangelog.json', 'utf8'));
  c[VER] = {
    en: 'Hardened radar DP ownership so lux/presence RX and presence flow edges stay correct.',
  };
  fs.writeFileSync('.homeychangelog.json', `${JSON.stringify(c, null, 2)}\n`);
} catch (e) {
  console.warn('changelog', e.message);
}
console.log('stable bumped', VER);
