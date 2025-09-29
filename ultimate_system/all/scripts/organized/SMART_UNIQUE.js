#!/usr/bin/env node
// 🧬 SMART UNIQUE v2.0.0 - IDs uniques par driver
const fs = require('fs');

const UNIQUE_MFG = {
  motion_sensor_basic: ['_TZ3000_mmtwjmaq'],
  motion_sensor_advanced: ['_TZE200_3towulqd'],
  smart_switch_1gang: ['_TZ3000_qzjcsmar'],
  smart_switch_2gang: ['_TZ3000_tasrktzi'],
  roller_shutter_switch: ['_TZE200_fctwhugx'],
  smart_plug_basic: ['_TZ3000_g5xawfcq'],
  temperature_sensor: ['_TZE200_cwbvmsar'],
  contact_sensor: ['_TZ3000_26fmupbb'],
  dimmer: ['_TZ3000_rdz06uge']
};

let enriched = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f) && UNIQUE_MFG[d]) {
    const data = JSON.parse(fs.readFileSync(f));
    data.zigbee.manufacturerName = UNIQUE_MFG[d];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    enriched++;
  }
});

console.log(`✅ ${enriched} drivers with unique IDs`);
