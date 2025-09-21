const fs = require('fs');

console.log('🚀 RECERTIFICATION HOMEY v1.0.32');

// Fix endpoints critiques
const fixes = [
    ['motion_sensor_battery', {"1": {"clusters": [0,4,5,1030]}}],
    ['smart_switch_2gang_ac', {"1": {"clusters": [0,4,5,6]}, "2": {"clusters": [0,4,5,6]}}]
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

// Version update
let app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '1.0.32';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('🎉 READY FOR PUBLISH');
