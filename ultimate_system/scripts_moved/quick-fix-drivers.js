const fs = require('fs');

console.log('🔧 QUICK DRIVER FIX');

const TYPES = {
  motion: {ids: ['_TZ3000_mmtwjmaq'], products: ['TS0202']},
  switch: {ids: ['_TZ3000_qzjcsmar'], products: ['TS0001']},
  plug: {ids: ['_TZ3000_g5xawfcq'], products: ['TS011F']},
  sensor: {ids: ['_TZE200_bjawzodf'], products: ['TS0201']}
};

let fixed = 0;
fs.readdirSync('drivers').forEach(d => {
  const p = `drivers/${d}/driver.compose.json`;
  if (fs.existsSync(p)) {
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (c.zigbee) {
      // Fix by driver type
      if (d.includes('motion')) {
        c.zigbee.manufacturerName = TYPES.motion.ids;
        c.zigbee.productId = TYPES.motion.products;
      } else if (d.includes('switch')) {
        c.zigbee.manufacturerName = TYPES.switch.ids;
        c.zigbee.productId = TYPES.switch.products;
      } else if (d.includes('plug')) {
        c.zigbee.manufacturerName = TYPES.plug.ids;
        c.zigbee.productId = TYPES.plug.products;
      } else {
        c.zigbee.manufacturerName = TYPES.sensor.ids;
        c.zigbee.productId = TYPES.sensor.products;
      }
      fs.writeFileSync(p, JSON.stringify(c, null, 2));
      fixed++;
    }
  }
});

console.log(`✅ Fixed ${fixed} drivers`);
