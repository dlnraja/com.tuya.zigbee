const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 ULTIMATE ENDPOINTS FIX');

// Force fix TOUT d'abord
console.log('1. Force rebuild...');
try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}

// Force endpoints critiques
const fixes = [
    ['motion_sensor_battery', {"1": {"clusters": [0,4,5,1030]}}],
    ['smart_plug_energy', {"1": {"clusters": [0,4,5,6,1794]}}],
    ['smart_switch_1gang_ac', {"1": {"clusters": [0,4,5,6]}}],
    ['smart_switch_2gang_ac', {"1": {"clusters": [0,4,5,6]}, "2": {"clusters": [0,4,5,6]}}],
    ['smart_switch_3gang_ac', {"1": {"clusters": [0,4,5,6]}, "2": {"clusters": [0,4,5,6]}, "3": {"clusters": [0,4,5,6]}}]
];

fixes.forEach(([name, endpoints]) => {
    const f = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(f)) {
        let c = JSON.parse(fs.readFileSync(f, 'utf8'));
        c.zigbee = {endpoints, ...c.zigbee};
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
        console.log(`✅ ${name} fixed`);
    }
});

// Config
if (!fs.existsSync('config')) fs.mkdirSync('config');
fs.writeFileSync('config/drivers-count.json', JSON.stringify({total: 149}));

console.log('🎉 ULTIMATE FIX DONE');
console.log('🔄 Run: homey app validate');
