const fs = require('fs');

console.log('🔍 DIAGNOSTIC COMPLET - Endpoints problème');

// 1. Vérifier structure des fichiers driver.compose.json
console.log('\n=== 1. ANALYSE DRIVER.COMPOSE.JSON ===');
const criticalDrivers = ['motion_sensor_battery', 'smart_plug_energy', 'smart_switch_1gang_ac', 'smart_switch_2gang_ac', 'smart_switch_3gang_ac'];

criticalDrivers.forEach(driver => {
    const file = `drivers/${driver}/driver.compose.json`;
    console.log(`\n📂 ${driver}:`);
    
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(content);
        
        console.log(`  ✅ Fichier existe`);
        console.log(`  ✅ JSON valide`);
        
        if (data.zigbee) {
            console.log(`  ✅ zigbee object présent`);
            if (data.zigbee.endpoints) {
                console.log(`  ✅ endpoints présent`);
                console.log(`  📊 Endpoints:`, JSON.stringify(data.zigbee.endpoints, null, 4));
            } else {
                console.log(`  ❌ endpoints MANQUANT`);
            }
        } else {
            console.log(`  ❌ zigbee object MANQUANT`);
        }
    } else {
        console.log(`  ❌ Fichier introuvable`);
    }
});

// 2. Vérifier app.json généré
console.log('\n=== 2. ANALYSE APP.JSON GÉNÉRÉ ===');
if (fs.existsSync('app.json')) {
    const appContent = fs.readFileSync('app.json', 'utf8');
    const appData = JSON.parse(appContent);
    
    console.log('✅ app.json existe');
    
    if (appData.drivers) {
        console.log(`✅ drivers array présent (${appData.drivers.length} drivers)`);
        
        criticalDrivers.forEach(driverId => {
            const driver = appData.drivers.find(d => d.id === driverId);
            console.log(`\n📂 ${driverId} dans app.json:`);
            
            if (driver) {
                console.log(`  ✅ Driver trouvé`);
                if (driver.zigbee) {
                    console.log(`  ✅ zigbee présent`);
                    if (driver.zigbee.endpoints) {
                        console.log(`  ✅ endpoints présent`);
                        console.log(`  📊 Endpoints:`, JSON.stringify(driver.zigbee.endpoints, null, 4));
                    } else {
                        console.log(`  ❌ endpoints MANQUANT dans app.json`);
                    }
                } else {
                    console.log(`  ❌ zigbee MANQUANT dans app.json`);
                }
            } else {
                console.log(`  ❌ Driver non trouvé dans app.json`);
            }
        });
    }
} else {
    console.log('❌ app.json introuvable');
}

// 3. Vérifier structure .homeycompose
console.log('\n=== 3. ANALYSE .HOMEYCOMPOSE ===');
if (fs.existsSync('.homeycompose')) {
    console.log('✅ .homeycompose existe');
} else {
    console.log('❌ .homeycompose manquant');
}

console.log('\n🎯 DIAGNOSTIC TERMINÉ');
