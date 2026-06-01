const fs = require('fs');
const p = 'drivers/climate_sensor/driver.compose.json';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\s*"_tze20[04]_seq9cm6u",?/gi, '');
c = c.replace(/\s*"_tze20[04]_seq9cm6u"/gi, '');
fs.writeFileSync(p, c);
console.log('Fixed climate sensor');
