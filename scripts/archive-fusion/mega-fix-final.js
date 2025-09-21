const fs = require('fs');

console.log('🚀 MEGA FIX FINAL');

// Force fix TOUT
const fixes = [
    ['motion_sensor_battery', {"1":{"clusters":[0,4,5,1030]}}],
    ['smart_plug_energy', {"1":{"clusters":[0,4,5,6,1794]}}],
    ['smart_switch_1gang_ac', {"1":{"clusters":[0,4,5,6]}}],
    ['smart_switch_2gang_ac', {"1":{"clusters":[0,4,5,6]},"2":{"clusters":[0,4,5,6]}}],
    ['smart_switch_3gang_ac', {"1":{"clusters":[0,4,5,6]},"2":{"clusters":[0,4,5,6]},"3":{"clusters":[0,4,5,6]}}]
];

fixes.forEach(([name, endpoints]) => {
    const f = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(f)) {
        let c = JSON.parse(fs.readFileSync(f, 'utf8'));
        c.zigbee = {endpoints};
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
        console.log(`✅ ${name}`);
    }
});

// Config
if (!fs.existsSync('config')) fs.mkdirSync('config');
fs.writeFileSync('config/drivers-count.json', '{"total":237}');

console.log('🎉 MEGA FIX TERMINÉ');
