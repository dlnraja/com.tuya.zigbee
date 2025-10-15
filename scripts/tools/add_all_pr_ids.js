const fs = require('fs');
const path = require('path');

console.log('🔧 INTÉGRATION COMPLÈTE - TOUS LES IDs DES PULL REQUESTS\n');

const updates = [
    // PR #1292 - Radar & Illuminance
    {
        driver: 'presence_sensor_radar',
        ids: ['_TZE200_y8jijhba', '_TZE200_kb5noeto']
    },
    
    // PR #1253 - Door Sensor + Button
    {
        driver: 'door_window_sensor',
        ids: ['_TZE200_pay2byax']
    },
    {
        driver: 'scene_controller_4button',
        ids: ['_TZ3000_mrpevh8p', '_TZ3000_an5rjiwd']
    },
    
    // PR #1118 - Smart Plug
    {
        driver: 'smart_plug_energy',
        ids: ['_TZ3000_ww6drja5']
    },
    
    // PR #1166 - PIR Sensor
    {
        driver: 'motion_sensor_battery',
        ids: ['_TZ3000_c8ozah8n']
    },
    
    // PR #1162-1161 - Multiple sensors
    {
        driver: 'motion_sensor_battery',
        ids: ['_TZ3000_o4mkahkc', '_TZ3000_fa9mlvja', '_TZ3000_rcuyhwe3']
    },
    
    // PR #1209 - Manufacturer ID
    {
        driver: 'smart_plug',
        ids: ['_TZ3000_kfu8zapd']
    },
    
    // PR #1195-1194 - TZE204
    {
        driver: 'smart_plug_energy',
        ids: ['_TZE204_bjzrowv2']
    },
    
    // PR #1075 - LED Strip
    {
        driver: 'led_strip_controller',
        ids: ['_TZ3210_eejm8dcr']
    }
];

let totalAdded = 0;
const results = [];

updates.forEach(update => {
    const driverPath = path.join(__dirname, 'drivers', update.driver, 'driver.compose.json');
    
    if (!fs.existsSync(driverPath)) {
        console.log(`⚠️  Driver not found: ${update.driver}`);
        results.push({ driver: update.driver, status: 'NOT_FOUND', added: 0 });
        return;
    }
    
    try {
        const content = fs.readFileSync(driverPath, 'utf8');
        const driver = JSON.parse(content);
        
        if (!driver.zigbee || !driver.zigbee.manufacturerName) {
            console.log(`⚠️  No manufacturerName array in ${update.driver}`);
            results.push({ driver: update.driver, status: 'NO_ARRAY', added: 0 });
            return;
        }
        
        const existingIds = driver.zigbee.manufacturerName;
        const newIds = update.ids.filter(id => !existingIds.includes(id));
        
        if (newIds.length === 0) {
            console.log(`✅ ${update.driver}: Tous les IDs déjà présents`);
            results.push({ driver: update.driver, status: 'ALREADY_EXISTS', added: 0 });
            return;
        }
        
        // Ajouter les nouveaux IDs
        driver.zigbee.manufacturerName.push(...newIds);
        driver.zigbee.manufacturerName.sort();
        
        // Sauvegarder
        fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2), 'utf8');
        
        console.log(`✅ ${update.driver}: Ajouté ${newIds.length} IDs`);
        newIds.forEach(id => console.log(`   + ${id}`));
        
        totalAdded += newIds.length;
        results.push({ driver: update.driver, status: 'SUCCESS', added: newIds.length, ids: newIds });
        
    } catch (error) {
        console.log(`❌ Erreur ${update.driver}: ${error.message}`);
        results.push({ driver: update.driver, status: 'ERROR', added: 0, error: error.message });
    }
});

console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ FINAL');
console.log('='.repeat(60));
console.log(`Total IDs ajoutés: ${totalAdded}`);
console.log(`Drivers modifiés: ${results.filter(r => r.status === 'SUCCESS').length}`);
console.log(`Drivers déjà à jour: ${results.filter(r => r.status === 'ALREADY_EXISTS').length}`);
console.log(`Erreurs: ${results.filter(r => r.status === 'ERROR' || r.status === 'NOT_FOUND').length}`);

console.log('\n📋 DÉTAILS PAR DRIVER:');
results.forEach(r => {
    const icon = r.status === 'SUCCESS' ? '✅' : 
                 r.status === 'ALREADY_EXISTS' ? '✓' : 
                 r.status === 'NOT_FOUND' ? '⚠️' : '❌';
    console.log(`${icon} ${r.driver}: ${r.status} (${r.added} IDs)`);
});

if (totalAdded > 0) {
    console.log('\n🎉 INTÉGRATION RÉUSSIE!');
    console.log(`${totalAdded} nouveaux manufacturer IDs ajoutés depuis les PRs GitHub`);
} else {
    console.log('\n✓ Aucun nouveau ID à ajouter (tous déjà présents)');
}
