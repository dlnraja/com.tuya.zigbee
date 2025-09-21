const fs = require('fs');

console.log('🎯 QUICK RECERT v1.0.32');

// Clean cache
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}

// Fix endpoints
const f = 'drivers/motion_sensor_battery/driver.compose.json';
if (fs.existsSync(f)) {
  let c = JSON.parse(fs.readFileSync(f, 'utf8'));
  c.zigbee = {endpoints: {"1": {"clusters": [0,4,5,1030]}}, ...c.zigbee};
  fs.writeFileSync(f, JSON.stringify(c, null, 2));
}

// Version
let app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '1.0.32';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ READY FOR PUBLISH');
