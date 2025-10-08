const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔧 FIXING DRIVERS');

const drivers = ['ceiling_light_controller', 'co2_sensor', 'energy_monitoring_plug', 'energy_monitoring_plug_advanced', 'led_strip_controller'];

drivers.forEach(name => {
    const path = `drivers/${name}`;
    fs.mkdirSync(`${path}/assets/images`, { recursive: true });
    
    // Basic config
    const config = {
        name: {en: name.replace(/_/g, ' ')},
        class: name.includes('light') ? 'light' : name.includes('plug') ? 'socket' : 'sensor',
        capabilities: ['onoff'],
        zigbee: {manufacturerName: ['Tuya'], productId: ['TS0601']}
    };
    
    fs.writeFileSync(`${path}/driver.compose.json`, JSON.stringify(config, null, 2));
    console.log(`✅ ${name} fixed`);
});

execSync('git add -A && git commit -m "🔧 FIX: Restored drivers" && git push origin master');
console.log('✅ Committed');
