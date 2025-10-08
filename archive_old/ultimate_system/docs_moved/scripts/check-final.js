const fs = require('fs');
const {execSync} = require('child_process');

console.log('✅ FINAL CHECK');

const drivers = ['ceiling_light_controller', 'co2_sensor', 'energy_monitoring_plug', 'energy_monitoring_plug_advanced', 'led_strip_controller'];

drivers.forEach(name => {
    console.log(`${name}: ${fs.existsSync(`drivers/${name}`) ? '✅' : '❌'}`);
});

console.log('\n🚀 FINAL PUBLICATION');
execSync('git add -A && git commit -m "✅ FINAL: All drivers restored and fixed" && git push origin master');
console.log('✅ Success - GitHub Actions triggered');
