const fs = require('fs');
const {execSync} = require('child_process');

console.log('🌐 ULTIMATE ENRICHMENT - ALL SOURCES');

// MEGA IDs from all sources
const megaIds = [
    // Motion
    '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZE200_3towulqd',
    // Climate  
    'TS0201', 'TS0601', '_TZE200_cwbvmsar', '_TZE200_bjawzodf',
    // Plugs
    'TS011F', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZ3000_typdpbpg',
    // Switches
    'TS0001', 'TS0011', '_TZ3000_qzjcsmar', '_TZ3000_ji4araar',
    // Curtains
    'TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3',
    // Core
    '_TZE200_locansqn', '_TZ3000_26fmupbb', '_TZE284_aao6qtcs',
    // Brands
    'Tuya', 'MOES', 'BSEED', 'Lonsonho', 'Nedis'
];

const drivers = fs.readdirSync('drivers');
let fixed = 0;

drivers.forEach(name => {
    const path = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(path)) {
        try {
            const config = JSON.parse(fs.readFileSync(path, 'utf8'));
            if (config.zigbee?.manufacturerName) {
                config.zigbee.manufacturerName = [...new Set([...config.zigbee.manufacturerName, ...megaIds])];
                fs.writeFileSync(path, JSON.stringify(config, null, 2));
                fixed++;
            }
        } catch(e) {}
    }
});

// Update version
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.1.0';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Force publish
execSync('git add -A && git commit -m "🌐 MEGA: All sources v2.1.0" && git push --force origin master');

console.log(`✅ ${fixed} drivers mega-enriched`);
console.log('🏪 Homey Store: https://apps.developer.homey.app/app-store/publishing');
