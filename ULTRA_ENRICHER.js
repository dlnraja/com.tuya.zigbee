#!/usr/bin/env node
// 🚀 ULTRA ENRICHER v2.0.0 - Enrichissement intelligent
const fs = require('fs');
const { execSync } = require('child_process');

const ULTRA_DB = {
  motion_sensor_basic: ['_TZ3000_mmtwjmaq'],
  motion_sensor_advanced: ['_TZE200_3towulqd'],
  smart_switch_1gang: ['_TZ3000_qzjcsmar'],
  smart_switch_2gang: ['_TZ3000_tasrktzi'],
  smart_switch_3gang: ['_TZ3000_odygigth'],
  roller_shutter_switch: ['_TZE200_fctwhugx'],
  smart_plug_basic: ['_TZ3000_g5xawfcq'],
  smart_plug_energy: ['_TZE284_cjbofhxw'],
  temperature_sensor: ['_TZE200_cwbvmsar'],
  climate_sensor: ['_TZE200_8ygsuhe1'],
  contact_sensor: ['_TZ3000_26fmupbb'],
  door_sensor: ['_TZ3000_6jbvbzpi'],
  dimmer: ['_TZ3000_rdz06uge'],
  light_bulb: ['_TZ3000_msl6wxk9']
};

let enriched = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f) && ULTRA_DB[d]) {
    const data = JSON.parse(fs.readFileSync(f));
    data.zigbee.manufacturerName = ULTRA_DB[d];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    enriched++;
  }
});

// Validation & push
try {
  execSync('homey app validate && git add -A && git commit -m "🚀 Ultra Enricher v2.0.0" && git push', {stdio: 'inherit'});
} catch (e) {
  console.log('❌', e.message);
}

console.log(`✅ ${enriched} drivers enriched with unique manufacturer IDs`);
