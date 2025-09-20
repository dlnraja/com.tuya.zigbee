// CYCLE 2/10: UNBRANDING RAPIDE
const fs = require('fs');

console.log('🔄 UNBRANDING DRIVERS');

// Renommages critiques pour différentiation
const renames = {
    'dimmer_switch_moes_timer': 'smart_dimmer_timer_advanced',
    'energy_monitoring_plug_nedis': 'smart_plug_energy_monitoring',
    'motion_sensor_hobeian': 'motion_sensor_zigbee_advanced',
    'led_strip_woodupp': 'led_strip_controller_rgb',
    'radar_sensor_2aaelwxk': 'radar_motion_sensor_advanced'
};

let renamed = 0;
Object.entries(renames).forEach(([old, newName]) => {
    const oldPath = `drivers/${old}`;
    const newPath = `drivers/${newName}`;
    
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
        try {
            fs.renameSync(oldPath, newPath);
            console.log(`✅ ${old} -> ${newName}`);
            renamed++;
        } catch (e) {
            console.log(`❌ ${old}: ${e.message}`);
        }
    }
});

console.log(`✅ ${renamed} drivers renommés`);
console.log('✅ CYCLE 2/10 TERMINÉ');
