const fs = require('fs');

const CATS = {
  motion: ['_TZ3000_mmtwjmaq', 'TS0202'],
  switch: ['_TZ3000_qzjcsmar', 'TS0001'],
  plug: ['_TZ3000_g5xawfcq', 'TS011F'],
  light: ['_TZE200_cowvfni3', 'TS0505A'],
  curtain: ['_TZE200_fctwhugx', 'TS130F'],
  sensor: ['_TZE200_bjawzodf', 'TS0201']
};

let c = 0;
fs.readdirSync('drivers').forEach(d => {
  const p = `drivers/${d}/driver.compose.json`;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (j.zigbee) {
    let t = 'sensor';
    if (d.includes('motion')) t = 'motion';
    if (d.includes('switch')) t = 'switch';
    if (d.includes('plug')) t = 'plug';
    if (d.includes('light')) t = 'light';
    if (d.includes('curtain')) t = 'curtain';
    
    j.zigbee.manufacturerName = [CATS[t][0]];
    j.zigbee.productId = [CATS[t][1]];
    fs.writeFileSync(p, JSON.stringify(j, null, 2));
    c++;
  }
});

console.log(`Fixed ${c} drivers`);
