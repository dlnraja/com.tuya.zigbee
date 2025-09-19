// CYCLE 7/10: IMAGES RAPIDE
const fs = require('fs');
console.log('📸 CYCLE 7/10: IMAGES');

const specs = {
    'smart_switch_3gang_ac': '3 buttons visible',
    'motion_sensor_pir_battery': 'compact motion sensor',
    'temperature_humidity_sensor': 'LCD display sensor'
};

Object.entries(specs).forEach(([driver, desc]) => {
    const path = `drivers/${driver}/assets/images`;
    if (fs.existsSync(`drivers/${driver}`)) {
        fs.mkdirSync(path, { recursive: true });
        fs.writeFileSync(`${path}/spec.txt`, desc);
    }
});

console.log('🎉 CYCLE 7/10 TERMINÉ');
