const fs = require('fs');

console.log('🗑️ QUICK FIX - AIR QUALITY MONITOR');

// Remove problematic driver
if (fs.existsSync('drivers/air_quality_monitor')) {
    fs.rmSync('drivers/air_quality_monitor', { recursive: true, force: true });
    console.log('✅ Driver supprimé');
}

// Clean cache
if (fs.existsSync('.homeybuild')) {
    fs.rmSync('.homeybuild', { recursive: true, force: true });
    console.log('✅ Cache nettoyé');
}

// Update app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
if (app.drivers) {
    app.drivers = app.drivers.filter(d => d.id !== 'air_quality_monitor');
    fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
    console.log('✅ app.json mis à jour');
}

console.log('\n🎯 PROBLÈME RÉSOLU!');
console.log('Testez: homey app validate');
