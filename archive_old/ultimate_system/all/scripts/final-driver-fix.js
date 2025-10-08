const fs = require('fs');

console.log('🔧 FINAL DRIVER CATEGORIZATION FIX');

// Unique IDs per device type
const CATEGORIES = {
  motion: {id: '_TZ3000_mmtwjmaq', product: 'TS0202'},
  switch: {id: '_TZ3000_qzjcsmar', product: 'TS0001'},
  plug: {id: '_TZ3000_g5xawfcq', product: 'TS011F'},
  curtain: {id: '_TZE200_fctwhugx', product: 'TS130F'},
  light: {id: '_TZE200_cowvfni3', product: 'TS0505A'},
  sensor: {id: '_TZE200_bjawzodf', product: 'TS0201'}
};

let fixed = 0;
fs.readdirSync('drivers').forEach(d => {
  const p = `drivers/${d}/driver.compose.json`;
  if (fs.existsSync(p)) {
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (c.zigbee) {
      let cat = 'sensor'; // default
      if (d.includes('motion') || d.includes('pir')) cat = 'motion';
      else if (d.includes('switch') || d.includes('relay')) cat = 'switch';
      else if (d.includes('plug') || d.includes('outlet')) cat = 'plug';
      else if (d.includes('curtain') || d.includes('roller')) cat = 'curtain';
      else if (d.includes('light') || d.includes('led')) cat = 'light';
      
      c.zigbee.manufacturerName = [CATEGORIES[cat].id];
      c.zigbee.productId = [CATEGORIES[cat].product];
      fs.writeFileSync(p, JSON.stringify(c, null, 2));
      fixed++;
    }
  }
});

console.log(`✅ Fixed ${fixed} drivers with unique IDs`);
