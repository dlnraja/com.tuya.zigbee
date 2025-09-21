const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚨 EMERGENCY ENDPOINTS FIX');

// Force clean TOUT
console.log('1. 🧹 Force clean...');
['node_modules/.cache', '.homeybuild', '.homeycompose', 'app.json'].forEach(p => {
    try { fs.rmSync(p, {recursive: true, force: true}); console.log(`✅ ${p} removed`); } catch(e) {}
});

// Force fix avec clusters corrects
const drivers = [
    ['motion_sensor_battery', {"1": {"clusters": [0,4,5,1030]}}], // PIR sensor
    ['smart_plug_energy', {"1": {"clusters": [0,4,5,6,1794]}}],   // Smart plug + energy
    ['smart_switch_1gang_ac', {"1": {"clusters": [0,4,5,6]}}],    // 1 gang switch
    ['smart_switch_2gang_ac', {"1": {"clusters": [0,4,5,6]}, "2": {"clusters": [0,4,5,6]}}], // 2 gang
    ['smart_switch_3gang_ac', {"1": {"clusters": [0,4,5,6]}, "2": {"clusters": [0,4,5,6]}, "3": {"clusters": [0,4,5,6]}}] // 3 gang
];

console.log('\n2. ⚡ Force endpoints...');
drivers.forEach(([name, endpoints]) => {
    const file = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        data.zigbee = { ...data.zigbee, endpoints };
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        console.log(`✅ ${name}: ${Object.keys(endpoints).length} endpoint(s)`);
    }
});

console.log('\n🎯 ENDPOINTS EMERGENCY FIX COMPLETE');
console.log('🔄 Next: homey app validate');
