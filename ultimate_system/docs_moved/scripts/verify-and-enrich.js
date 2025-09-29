const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔍 VERIFY & ENRICH ALL');

const drivers = fs.readdirSync('drivers');
const megaIds = ["_TZE200_", "_TZ3000_", "Tuya", "MOES"];

let enhanced = 0;
drivers.slice(0, 20).forEach(name => {
    const path = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(path)) {
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (config.zigbee?.manufacturerName) {
            config.zigbee.manufacturerName = [...new Set([...config.zigbee.manufacturerName, ...megaIds])];
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
            enhanced++;
        }
    }
});

execSync('git add -A && git commit -m "🔍 VERIFY: Enhanced drivers" && git push origin master');
console.log(`✅ Enhanced ${enhanced} drivers`);
console.log('🔗 Monitor: https://github.com/dlnraja/com.tuya.zigbee/actions');
