const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎯 MASTER FUSION - Tous Scripts Unifiés');

// 1. Sécurité
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}
try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}

// 2. Endpoints fixes
['motion_sensor_battery','smart_plug_energy','smart_switch_1gang_ac','smart_switch_2gang_ac','smart_switch_3gang_ac'].forEach(d => {
  const f = `drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    let c = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!c.zigbee) c.zigbee = {};
    c.zigbee.endpoints = d.includes('motion') ? {"1":{"clusters":[0,4,5,1030]}} : 
                       d.includes('plug') ? {"1":{"clusters":[0,4,5,6,1794]}} :
                       d.includes('3gang') ? {"1":{"clusters":[0,4,5,6]},"2":{"clusters":[0,4,5,6]},"3":{"clusters":[0,4,5,6]}} :
                       d.includes('2gang') ? {"1":{"clusters":[0,4,5,6]},"2":{"clusters":[0,4,5,6]}} :
                       {"1":{"clusters":[0,4,5,6]}};
    fs.writeFileSync(f, JSON.stringify(c, null, 2));
  }
});

// 3. Version
let app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.0.2';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ FUSION TERMINÉE - Prêt pour GitHub Actions');
