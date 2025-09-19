// CYCLE 3/10: UNBRANDING COMPLET RAPIDE
const fs = require('fs');

console.log('🎯 CYCLE 3/10: UNBRANDING COMPLET');

// Renommage des dossiers avec marques vers fonction
const renames = {
    'dimmer_switch_moes_timer': 'smart_dimmer_timer',
    'energy_monitoring_plug_nedis': 'smart_plug_energy_monitoring',
    'motion_sensor_hobeian': 'motion_sensor_zigbee_advanced',
    'led_strip_woodupp': 'led_strip_controller_rgb',
    'radar_sensor_2aaelwxk': 'radar_motion_sensor_tank_level'
};

Object.entries(renames).forEach(([old, newName]) => {
    const oldPath = `drivers/${old}`;
    const newPath = `drivers/${newName}`;
    
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
        try {
            fs.renameSync(oldPath, newPath);
            console.log(`✅ Renommé: ${old} → ${newName}`);
        } catch (e) {
            console.warn(`⚠️ Échec renommage: ${old}`);
        }
    }
});

// Enrichissement manufacturer IDs
const manufacturerIds = [
    "_TZE284_", "_TZE200_", "_TZ3000_", "_TZ3400_", "_TZE204_",
    "_TYZB01_", "_TYST11_", "_TZ2000_", "_TZ1800_", "_TYZB02_",
    "_TZE284_uqfph8ah", "_TZE200_oisqyl4o", "_TZ3000_4fjiwweb"
];

fs.writeFileSync('project-data/enriched-manufacturer-ids.json', JSON.stringify(manufacturerIds, null, 2));
console.log('✅ Manufacturer IDs enrichis sauvegardés');

console.log('🎉 CYCLE 3/10 TERMINÉ - Unbranding avancé');
