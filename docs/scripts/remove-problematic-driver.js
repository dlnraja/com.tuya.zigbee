const fs = require('fs');

console.log('🗑️  SUPPRESSION DRIVER PROBLÉMATIQUE');

// 1. Supprimer cache
if (fs.existsSync('.homeybuild')) {
    fs.rmSync('.homeybuild', { recursive: true, force: true });
    console.log('✅ Cache .homeybuild supprimé');
}

// 2. Mettre à jour app.json pour retirer le driver
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

if (appJson.drivers) {
    const originalCount = appJson.drivers.length;
    appJson.drivers = appJson.drivers.filter(driver => 
        driver.id !== 'air_conditioner_controller'
    );
    
    if (appJson.drivers.length < originalCount) {
        console.log('✅ Driver air_conditioner_controller retiré de app.json');
    }
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));

console.log('🎯 DRIVER PROBLÉMATIQUE ÉLIMINÉ!');
console.log('Essayez maintenant: homey app validate');
