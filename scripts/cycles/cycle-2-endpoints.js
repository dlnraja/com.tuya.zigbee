const fs = require('fs');

console.log('🔧 CYCLE 2/10: ENDPOINTS ZIGBEE');

// Fix endpoints critiques
const endpoints = [
  ['motion_sensor_battery', {"1": {"clusters": [0,4,5,1030]}}],
  ['smart_plug_energy', {"1": {"clusters": [0,4,5,6,1794]}}],
  ['smart_switch_1gang_ac', {"1": {"clusters": [0,4,5,6]}}],
  ['smart_switch_2gang_ac', {"1": {"clusters": [0,4,5,6]}, "2": {"clusters": [0,4,5,6]}}],
  ['smart_switch_3gang_ac', {"1": {"clusters": [0,4,5,6]}, "2": {"clusters": [0,4,5,6]}, "3": {"clusters": [0,4,5,6]}}]
];

let fixed = 0;
endpoints.forEach(([name, ep]) => {
  const f = `drivers/${name}/driver.compose.json`;
  if (fs.existsSync(f)) {
    let c = JSON.parse(fs.readFileSync(f, 'utf8'));
    c.zigbee = {endpoints: ep, ...c.zigbee};
    fs.writeFileSync(f, JSON.stringify(c, null, 2));
    fixed++;
  }
});

console.log(`✅ CYCLE 2 TERMINÉ - ${fixed} endpoints fixés`);
