const fs = require('fs');

console.log('🚀 MEGA ENRICHMENT - ALL SOURCES');

// Complete manufacturer IDs from all sources
const MEGA_IDS = [
    // TZE284 complete series
    '_TZE284_aao6qtcs', '_TZE284_cjbofhxw', '_TZE284_bxoo2swd', '_TZE284_yjjdcqsq',
    '_TZE284_whpb9yts', '_TZE284_3towulqd', '_TZE284_amp6tsvy', '_TZE284_bjzrowv2',
    
    // TZE200 complete series  
    '_TZE200_cwbvmsar', '_TZE200_bjawzodf', '_TZE200_yvx5lh6k', '_TZE200_a8sdabtg',
    '_TZE200_bxoo2swd', '_TZE200_3towulqd', '_TZE200_yjjdcqsq', '_TZE200_ntcy3xu1',
    
    // TZ3000 motion/switches
    '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_8ybe88nf', '_TZ3000_26fmupbb',
    '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZ3000_qzjcsmar', '_TZ3000_ji4araar',
    
    // Brands from community
    'Tuya', 'MOES', 'BSEED', 'Lonsonho', 'Lidl', 'Nedis'
];

const MEGA_PRODUCTS = [
    'TS0001', 'TS0011', 'TS011F', 'TS0201', 'TS0203', 'TS130F', 'TS0601',
    'TS004F', 'TS0121', 'TS110E', 'TS0502A', 'TS0821'
];

// Enrich all drivers
let enriched = 0;
fs.readdirSync('drivers').forEach(driver => {
    const path = `drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(path)) {
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (config.zigbee) {
            config.zigbee.manufacturerName = MEGA_IDS;
            config.zigbee.productId = MEGA_PRODUCTS;
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
            enriched++;
        }
    }
});

// Update version
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '3.0.0'; // Major enrichment version
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`✅ ${enriched} drivers enriched with MEGA database`);
console.log('📊 Version: 3.0.0 - Ultimate enrichment');
