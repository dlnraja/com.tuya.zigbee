const fs = require('fs');

console.log('🏷️ CYCLE 3/10: UNBRANDING ET RÉORGANISATION');

// Unbranding - Focus sur fonction vs marque
const rebrandMap = {
  'smart_switch_1gang_ac': 'Wall Switch Single Gang AC',
  'smart_switch_2gang_ac': 'Wall Switch Double Gang AC', 
  'smart_switch_3gang_ac': 'Wall Switch Triple Gang AC',
  'motion_sensor_battery': 'PIR Motion Sensor Battery',
  'smart_plug_energy': 'Smart Power Outlet with Energy Monitor'
};

let rebranded = 0;
Object.entries(rebrandMap).forEach(([driverId, newName]) => {
  const f = `drivers/${driverId}/driver.compose.json`;
  if (fs.existsSync(f)) {
    let c = JSON.parse(fs.readFileSync(f, 'utf8'));
    c.name = {en: newName};
    // Supprimer références marques
    if (c.description) {
      c.description = c.description.replace(/tuya|moes|lidl|brand/gi, 'generic');
    }
    fs.writeFileSync(f, JSON.stringify(c, null, 2));
    rebranded++;
  }
});

// App unbranding
let app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.name = {en: 'Generic Smart Hub'};
app.description = {en: 'Universal Zigbee device support for generic smart home devices'};
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`✅ CYCLE 3 TERMINÉ - ${rebranded} drivers unbranded`);
