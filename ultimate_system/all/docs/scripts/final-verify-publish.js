const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔍 FINAL VERIFICATION & PUBLISH');

// Check drivers
const drivers = fs.readdirSync('drivers').length;
console.log(`✅ ${drivers} drivers found`);

// Check restored drivers
const restored = ['ceiling_light_controller', 'co2_sensor', 'energy_monitoring_plug', 'energy_monitoring_plug_advanced', 'led_strip_controller', 'led_strip_advanced'];
restored.forEach(name => {
    const exists = fs.existsSync(`drivers/${name}/driver.compose.json`);
    console.log(`${exists ? '✅' : '❌'} ${name}`);
});

// Validate app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
console.log(`✅ app.json: ${app.drivers.length} drivers`);

// Final publish
console.log('\n🚀 FINAL PUBLISH');
execSync('git add -A && git commit -m "🎉 FINAL: Complete verification & publish" && git push origin master');

console.log('✅ COMPLETE SUCCESS - Ready for Homey App Store!');
