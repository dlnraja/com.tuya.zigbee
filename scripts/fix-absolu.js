const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 FIX ABSOLU');

// 1. Supprimer cache complètement
try {
    if (fs.existsSync('.homeybuild')) fs.rmSync('.homeybuild', {recursive: true, force: true});
    if (fs.existsSync('.homeycompose')) fs.rmSync('.homeycompose', {recursive: true, force: true});
    console.log('✅ Cache nettoyé');
} catch(e) {}

// 2. Re-créer TOUS les endpoints
const drivers = [
    {name: 'motion_sensor_battery', endpoints: {"1":{"clusters":[0,4,5,1030]}}},
    {name: 'smart_plug_energy', endpoints: {"1":{"clusters":[0,4,5,6,1794]}}},
    {name: 'smart_switch_1gang_ac', endpoints: {"1":{"clusters":[0,4,5,6]}}},
    {name: 'smart_switch_2gang_ac', endpoints: {"1":{"clusters":[0,4,5,6]},"2":{"clusters":[0,4,5,6]}}},
    {name: 'smart_switch_3gang_ac', endpoints: {"1":{"clusters":[0,4,5,6]},"2":{"clusters":[0,4,5,6]},"3":{"clusters":[0,4,5,6]}}}
];

drivers.forEach(driver => {
    const f = `drivers/${driver.name}/driver.compose.json`;
    if (fs.existsSync(f)) {
        let c = JSON.parse(fs.readFileSync(f, 'utf8'));
        c.zigbee = c.zigbee || {};
        c.zigbee.endpoints = driver.endpoints;
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
        console.log(`✅ ${driver.name} - endpoints: ${Object.keys(driver.endpoints).length}`);
    }
});

console.log('🎉 FIX ABSOLU TERMINÉ');
