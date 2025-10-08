const fs = require('fs');
const {execSync} = require('child_process');

console.log('🏭 ENRICH ALL');

const ids = ["_TZE200_", "_TZ3000_", "Tuya", "MOES"];
let count = 0;

fs.readdirSync('drivers').slice(0,30).forEach(name => {
    const path = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(path)) {
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (config.zigbee?.manufacturerName) {
            config.zigbee.manufacturerName = [...new Set([...config.zigbee.manufacturerName, ...ids])];
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
            count++;
        }
    }
});

execSync('git add -A && git commit -m "🏭 ENRICH: Enhanced drivers" && git push origin master');
console.log(`✅ Enhanced ${count} drivers`);
