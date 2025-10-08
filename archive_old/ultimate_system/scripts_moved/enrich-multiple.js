const fs = require('fs');

const ENRICHMENT = {
  motion: {ids: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZE200_3towulqd'], products: ['TS0202', 'TS0601']},
  switch: {ids: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZE284_aao6qtcs'], products: ['TS0001', 'TS0011']},
  plug: {ids: ['_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZE284_bjzrowv2'], products: ['TS011F', 'TS0121']},
  light: {ids: ['_TZE200_cowvfni3', '_TZ3000_odygigth', '_TZE284_sooucan5'], products: ['TS0505A', 'TS0502A']},
  curtain: {ids: ['_TZE200_fctwhugx', '_TZE284_lyddnfte'], products: ['TS130F']},
  sensor: {ids: ['_TZE200_bjawzodf', '_TZE200_locansqn'], products: ['TS0201']}
};

let count = 0;
fs.readdirSync('drivers').forEach(d => {
  const p = `drivers/${d}/driver.compose.json`;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (c.zigbee) {
    let type = 'sensor';
    if (d.includes('motion')) type = 'motion';
    else if (d.includes('switch')) type = 'switch';
    else if (d.includes('plug')) type = 'plug';
    else if (d.includes('light')) type = 'light';
    else if (d.includes('curtain')) type = 'curtain';
    
    c.zigbee.manufacturerName = ENRICHMENT[type].ids;
    c.zigbee.productId = ENRICHMENT[type].products;
    fs.writeFileSync(p, JSON.stringify(c, null, 2));
    count++;
  }
});

console.log(`Enriched ${count} drivers with multiple unique IDs`);
