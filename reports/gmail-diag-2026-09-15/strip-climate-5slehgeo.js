'use strict';
const fs = require('fs');
const p = 'scripts/data/current-fps.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const arr = j?.r?.climate_sensor?.m;
if (!Array.isArray(arr)) {
  console.error('unexpected shape');
  process.exit(1);
}
const before = arr.length;
j.r.climate_sensor.m = arr.filter((m) => !/5slehgeo/i.test(String(m)));
console.log('climate_sensor.m', before, '->', j.r.climate_sensor.m.length);
fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
