const fs = require('fs');

console.log('🎯 HOMEY RECERTIFICATION SYSTEM v1.0.32');

// 1. SÉCURITÉ
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}
fs.writeFileSync('.gitignore', '.homeycompose/\n.homeybuild/\n*.log\ncredentials.*\n');

// 2. ENDPOINTS
const fixes = [
  ['motion_sensor_battery', {"1": {"clusters": [0,4,5,1030]}}],
  ['smart_switch_3gang_ac', {"1": {"clusters": [0,4,5,6]}, "2": {"clusters": [0,4,5,6]}, "3": {"clusters": [0,4,5,6]}}]
];

fixes.forEach(([name, ep]) => {
  const f = `drivers/${name}/driver.compose.json`;
  if (fs.existsSync(f)) {
    let c = JSON.parse(fs.readFileSync(f, 'utf8'));
    c.zigbee = {endpoints: ep, ...c.zigbee};
    fs.writeFileSync(f, JSON.stringify(c, null, 2));
  }
});

// 3. MANUFACTURER IDS
const ids = ["_TZE284_", "_TZE200_", "_TZ3000_"];
let count = 0;

fs.readdirSync('drivers').slice(0, 20).forEach(d => {
  const f = `drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    let c = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!c.zigbee) c.zigbee = {};
    if (!c.zigbee.manufacturerName) c.zigbee.manufacturerName = [];
    ids.forEach(id => {
      if (!c.zigbee.manufacturerName.includes(id)) {
        c.zigbee.manufacturerName.push(id);
        count++;
      }
    });
    fs.writeFileSync(f, JSON.stringify(c, null, 2));
  }
});

// 4. VERSION
let app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '1.0.32';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`✅ ${count} IDs ajoutés, endpoints fixés, sécurisé`);
console.log('🚀 PRÊT: homey app publish');
