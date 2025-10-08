const fs = require('fs');
const {execSync} = require('child_process');

console.log('🚀 ENHANCE 6 RESTORED DRIVERS');

const drivers = ['ceiling_light_controller', 'co2_sensor', 'energy_monitoring_plug', 'energy_monitoring_plug_advanced', 'led_strip_controller', 'led_strip_advanced'];
const megaIDs = ["_TZE284_uqfph8ah", "_TZE200_bjawzodf", "_TZ3000_26fmupbb", "Tuya", "MOES", "BSEED"];

drivers.forEach(name => {
    const path = `drivers/${name}/driver.compose.json`;
    const config = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    config.zigbee.manufacturerName = megaIDs;
    if (!config.capabilitiesOptions) config.capabilitiesOptions = {};
    
    fs.writeFileSync(path, JSON.stringify(config, null, 2));
    console.log(`✅ ${name} enhanced`);
});

execSync('git add -A && git commit -m "🚀 ENHANCE: 6 restored drivers with mega IDs" && git push origin master');
console.log('🎉 Enhancement complete!');
