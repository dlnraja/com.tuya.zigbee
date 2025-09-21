const fs = require('fs');

const drivers = ['motion_sensor_battery','smart_plug_energy','smart_switch_1gang_ac','smart_switch_2gang_ac','smart_switch_3gang_ac'];

console.log('🔍 VALIDATION JSON URGENT');

drivers.forEach(d => {
    const file = `drivers/${d}/driver.compose.json`;
    try {
        const content = fs.readFileSync(file, 'utf8');
        JSON.parse(content);
        console.log(`✅ ${d}: Valid JSON`);
    } catch(e) {
        console.log(`❌ ${d}: ${e.message}`);
        console.log(`📍 Position: ${e.message.includes('position') ? e.message.split(' ')[4] : 'unknown'}`);
    }
});
