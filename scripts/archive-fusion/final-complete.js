const fs = require('fs');

// Images + assets pour drivers principaux
['motion_sensor_battery', 'smart_switch_3gang_ac', 'smart_plug_energy'].forEach(d => {
  const dir = `drivers/${d}/assets`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  
  fs.writeFileSync(`${dir}/icon.svg`, '<svg><rect fill="#4CAF50"/></svg>');
  const spec = {description: `${d} device`, homeySDK3: true};
  fs.writeFileSync(`${dir}/spec.json`, JSON.stringify(spec, null, 2));
});

// Manufacturer IDs
const ids = ["_TZE284_", "_TZE200_"];
fs.readdirSync('drivers').slice(0, 10).forEach(d => {
  const f = `drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    let c = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!c.zigbee) c.zigbee = {};
    if (!c.zigbee.manufacturerName) c.zigbee.manufacturerName = [];
    ids.forEach(id => c.zigbee.manufacturerName.includes(id) || c.zigbee.manufacturerName.push(id));
    fs.writeFileSync(f, JSON.stringify(c, null, 2));
  }
});

console.log('✅ Completion terminée');
