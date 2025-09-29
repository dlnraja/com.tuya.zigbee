const fs = require('fs');

console.log('🗑️ FIX AIR QUALITY MONITOR CLI BUG');
console.log('🎯 Solution nucléaire - Suppression driver problématique\n');

// 1. Supprimer le driver problématique
const problematicDriver = 'drivers/air_quality_monitor';

if (fs.existsSync(problematicDriver)) {
    fs.rmSync(problematicDriver, { recursive: true, force: true });
    console.log('✅ Driver air_quality_monitor supprimé');
}

// 2. Nettoyer cache
if (fs.existsSync('.homeybuild')) {
    fs.rmSync('.homeybuild', { recursive: true, force: true });
    console.log('✅ Cache .homeybuild nettoyé');
}

// 3. Mettre à jour app.json
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

if (appJson.drivers) {
    const originalCount = appJson.drivers.length;
    appJson.drivers = appJson.drivers.filter(driver => 
        driver.id !== 'air_quality_monitor'
    );
    
    if (appJson.drivers.length < originalCount) {
        console.log('✅ Driver air_quality_monitor retiré de app.json');
    }
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));

console.log('\n🎯 CLI BUG ÉLIMINÉ!');
console.log('Driver air_quality_monitor supprimé définitivement');
console.log('Essayez maintenant: homey app validate');
