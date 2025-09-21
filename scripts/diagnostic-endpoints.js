const fs = require('fs');

console.log('🔍 DIAGNOSTIC APPROFONDI - Endpoints');

// Analyser un driver spécifique
const driverName = 'motion_sensor_battery';
const filePath = `drivers/${driverName}/driver.compose.json`;

console.log(`\n📂 Analyse: ${driverName}`);

if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('✅ Fichier existe');
    
    try {
        const parsed = JSON.parse(content);
        console.log('✅ JSON valide');
        
        console.log('\n📊 Structure zigbee:');
        if (parsed.zigbee) {
            console.log('✅ zigbee object présent');
            console.log('Contents:', JSON.stringify(parsed.zigbee, null, 2));
            
            if (parsed.zigbee.endpoints) {
                console.log('✅ endpoints présent');
                console.log('Endpoints:', JSON.stringify(parsed.zigbee.endpoints, null, 2));
            } else {
                console.log('❌ endpoints MANQUANT');
            }
        } else {
            console.log('❌ zigbee object MANQUANT');
        }
        
    } catch(e) {
        console.log('❌ Erreur parsing:', e.message);
    }
} else {
    console.log('❌ Fichier introuvable');
}

// Vérifier le app.json généré
console.log('\n📂 Vérification app.json généré...');
if (fs.existsSync('app.json')) {
    const appContent = fs.readFileSync('app.json', 'utf8');
    const appData = JSON.parse(appContent);
    
    const driver = appData.drivers?.find(d => d.id === driverName);
    if (driver) {
        console.log('✅ Driver trouvé dans app.json');
        if (driver.zigbee) {
            console.log('✅ zigbee dans app.json');
            if (driver.zigbee.endpoints) {
                console.log('✅ endpoints dans app.json');
                console.log('Endpoints:', JSON.stringify(driver.zigbee.endpoints, null, 2));
            } else {
                console.log('❌ endpoints MANQUANT dans app.json');
            }
        } else {
            console.log('❌ zigbee MANQUANT dans app.json');
        }
    } else {
        console.log('❌ Driver non trouvé dans app.json');
    }
}

console.log('\n🎯 CONCLUSION:');
console.log('Le problème semble être dans la génération/synchronisation du app.json');
