const fs = require('fs');

const FIXES = {
  motion: ['_TZ3000_mmtwjmaq', 'TS0202'],
  curtain: ['_TZE200_fctwhugx', 'TS130F'], 
  switch: ['_TZ3000_qzjcsmar', 'TS0001'],
  plug: ['_TZ3000_g5xawfcq', 'TS011F']
};

let fixed = 0;
fs.readdirSync('drivers').forEach(d => {
  const p = `drivers/${d}/driver.compose.json`;
  if (fs.existsSync(p)) {
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (c.zigbee) {
      if (d.includes('curtain') || d.includes('roller') || d.includes('shutter')) {
        c.zigbee.manufacturerName = [FIXES.curtain[0]];
        c.zigbee.productId = [FIXES.curtain[1]];
        fixed++;
      }
      fs.writeFileSync(p, JSON.stringify(c, null, 2));
    }
  }
});

console.log(`Fixed ${fixed} curtain drivers`);
