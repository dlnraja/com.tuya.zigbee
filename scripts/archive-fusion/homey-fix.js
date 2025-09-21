const fs = require('fs');

console.log('🎯 HOMEY RECERTIFICATION v1.0.32');

// 1. Security
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}
fs.writeFileSync('.gitignore', '.homeycompose/\n.homeybuild/\n*.log\n');

// 2. Endpoints
const eps = [
  ['motion_sensor_battery', {"1": {"clusters": [0,4,5,1030]}}],
  ['smart_switch_3gang_ac', {"1": {"clusters": [0,4,5,6]}, "2": {"clusters": [0,4,5,6]}, "3": {"clusters": [0,4,5,6]}}]
];

eps.forEach(([name, ep]) => {
  const f = `drivers/${name}/driver.compose.json`;
  if (fs.existsSync(f)) {
    let c = JSON.parse(fs.readFileSync(f, 'utf8'));
    c.zigbee = {endpoints: ep, ...c.zigbee};
    fs.writeFileSync(f, JSON.stringify(c, null, 2));
  }
});

// 3. Version
let app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '1.0.32';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ PRÊT POUR PUBLICATION');
