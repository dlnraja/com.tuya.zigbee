#!/usr/bin/env node
// 🧠 UNIQUE MFG v2.0.0 - IDs uniques par driver
const fs = require('fs');

const UNIQUE_DB = {
  motion: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb'],
  switch: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar'], 
  roller_shutter: ['_TZE200_fctwhugx', '_TZE200_cowvfni3'],
  plug: ['_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw'],
  climate: ['_TZE200_cwbvmsar', '_TZE200_bjawzodf'],
  contact: ['_TZ3000_26fmupbb', '_TZ3000_n2egfsli'],
  dimmer: ['_TZ3000_rdz06uge', '_TZE284_rccgwzz8'],
  light: ['_TZ3000_msl6wxk9', '_TZE284_98z4zhra']
};

let enriched = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    let cat = 'switch';
    
    for (const [category] of Object.entries(UNIQUE_DB)) {
      if (d.includes(category)) { cat = category; break; }
    }
    
    data.zigbee.manufacturerName = UNIQUE_DB[cat];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    enriched++;
  }
});

console.log(`✅ ${enriched} drivers with unique MFG IDs`);
