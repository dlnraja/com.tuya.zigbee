const fs = require('fs');
const {execSync} = require('child_process');

const drivers = ['ceiling_light_controller', 'co2_sensor', 'energy_monitoring_plug', 'energy_monitoring_plug_advanced', 'led_strip_controller'];

drivers.forEach(name => {
    const path = `drivers/${name}/driver.compose.json`;
    const config = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    // Add more manufacturer IDs
    config.zigbee.manufacturerName.push("_TZE200_", "_TZ3000_", "MOES");
    
    fs.writeFileSync(path, JSON.stringify(config, null, 2));
});

execSync('git add -A && git commit -m "🚀 ENRICH: Enhanced drivers" && git push origin master');
console.log('✅ Drivers enriched and committed');
