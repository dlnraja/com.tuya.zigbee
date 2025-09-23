const fs = require('fs');
const {execSync} = require('child_process');

console.log('🚀 MEGA ENRICHMENT');

const megaIDs = [
    "_TZE284_uqfph8ah", "_TZE200_bjawzodf", "_TZ3000_26fmupbb", "_TZE200_rq0qlyss",
    "_TZE200_dwcarsat", "_TZE200_1ibpyhdc", "_TZ3000_keyjhapk", "_TZ3000_8ybe88nf",
    "Tuya", "MOES", "BSEED", "Lonsonho", "Nedis", "AVATTO", "ONENUO"
];

let enriched = 0;
fs.readdirSync('drivers').forEach(name => {
    const path = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(path)) {
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (config.zigbee?.manufacturerName) {
            config.zigbee.manufacturerName = [...new Set([...config.zigbee.manufacturerName, ...megaIDs])];
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
            enriched++;
        }
    }
});

execSync('git add -A && git commit -m "🚀 MEGA: All drivers enriched" && git push origin master');
console.log(`✅ ${enriched} drivers enriched with ${megaIDs.length} IDs`);
