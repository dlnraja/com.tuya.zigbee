const fs = require('fs');

const FIX = {
  motion: ['_TZ3000_mmtwjmaq', 'TS0202'],
  switch: ['_TZ3000_qzjcsmar', 'TS0001'],
  plug: ['_TZ3000_g5xawfcq', 'TS011F'],
  light: ['_TZE200_cowvfni3', 'TS0505A'],
  curtain: ['_TZE200_fctwhugx', 'TS130F']
};

let count = 0;
fs.readdirSync('drivers').forEach(d => {
  const p = `drivers/${d}/driver.compose.json`;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (c.zigbee) {
    let cat = 'light';
    if (d.includes('motion')) cat = 'motion';
    else if (d.includes('switch')) cat = 'switch';
    else if (d.includes('plug')) cat = 'plug';
    else if (d.includes('curtain')) cat = 'curtain';
    
    c.zigbee.manufacturerName = [FIX[cat][0]];
    c.zigbee.productId = [FIX[cat][1]];
    fs.writeFileSync(p, JSON.stringify(c, null, 2));
    count++;
  }
});

console.log(`Fixed ${count} drivers`);
