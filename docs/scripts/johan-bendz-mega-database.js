const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏭 JOHAN BENDZ MEGA DATABASE - ULTRA ENRICHMENT');
console.log('📊 Source: https://github.com/JohanBendz/com.tuya.zigbee/tree/SDK3/drivers');
console.log('🌐 + Community: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352/');
console.log('🚫 NO wildcards - COMPLETE IDs only\n');

// MEGA DATABASE from ALL sources including deleted drivers
const ULTRA_MANUFACTURER_IDS = [
    // _TZE284_ series - COMPLETE ONLY (from Johan Bendz)
    "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZE284_aagrxlbd", "_TZE284_uqfph8ah",
    "_TZE284_sxm7l9xa", "_TZE284_1emhi5mm", "_TZE284_khkk23xi", "_TZE284_9cxrt8gp",
    "_TZE284_byzdgzgn", "_TZE284_rccgwzz8", "_TZE284_98z4zhra", "_TZE284_k8u3d4zm",
    "_TZE284_9ppvgwos", "_TZE284_dlarqei6", "_TZE284_4qaas5zv", "_TZE284_t9klyxyk",
    "_TZE284_wbhahlk5", "_TZE284_5toc8efa", "_TZE284_n6kk3vtn", "_TZE284_zq4fvn5m",
    "_TZE284_sooucan5", "_TZE284_kfy35gvl", "_TZE284_raqw6baz", "_TZE284_h3p5iokg",
    "_TZE284_9mahtqtg", "_TZE284_el5kt5im", "_TZE284_wycxbvre", "_TZE284_efnoum9f",
    
    // _TZ3000_ series (Motion/PIR/Plugs/Switches)
    "_TZ3000_mmtwjmaq", "_TZ3000_g5xawfcq", "_TZ3000_kmh5qpmb", "_TZ3000_fllyghyj",
    "_TZ3000_mcxw5ehu", "_TZ3000_msl6wxk9", "_TZ3000_cehuw1lw", "_TZ3000_qzjcsmar",
    "_TZ3000_ji4araar", "_TZ3000_26fmupbb", "_TZ3000_n2egfsli", "_TZ3000_vzopcetz",
    "_TZ3000_4whigl8i", "_TZ3000_jsx8jwbq", "_TZ3000_uutkxnas", "_TZ3000_vp6clf9d",
    "_TZ3000_2mbfxlzr", "_TZ3000_p6ju8myv", "_TZ3000_hdopuwv6", "_TZ3000_cfnprab5",
    "_TZ3000_v1srfw9x", "_TZ3000_csflgqj2", "_TZ3000_wyhuocal", "_TZ3000_w8jwkczz",
    
    // _TZE200_ series (Climate/Sensors)  
    "_TZE200_cwbvmsar", "_TZE200_bjawzodf", "_TZE200_locansqn", "_TZE200_3towulqd",
    "_TZE200_fctwhugx", "_TZE200_cowvfni3", "_TZE200_khx7nnka", "_TZE200_dnz6yvl2",
    "_TZE200_d0yu2xgi", "_TZE200_dwcarsat", "_TZE200_8ygsuhe1", "_TZE200_zl1kmjqx",
    "_TZE200_htnnfasr", "_TZE200_2wg5qrjy", "_TZE200_cirvgep4", "_TZE200_dwcarsat",
    
    // Standard TS series (Core Tuya products)
    "TS011F", "TS0201", "TS0001", "TS0011", "TS0002", "TS0003", "TS130F", "TS0601", 
    "TS0203", "TS0202", "TS004F", "TS0041", "TS0042", "TS0043", "TS0121", "TS110F",
    
    // Brand names (for compatibility)
    "Tuya", "MOES", "BSEED", "Neo", "Aqara", "Lonsonho", "Zemismart", "Woox"
];

const ULTRA_PRODUCT_IDS = [
    "TS0001", "TS0011", "TS0002", "TS0003", "TS0201", "TS011F", "TS130F", "TS0601",
    "TS0203", "TS0202", "TS004F", "TS0041", "TS0042", "TS0043", "TS0121", "TS110F",
    "TS1001", "TS1101", "TS1201", "TS1301", "doorbell", "switch", "plug", "sensor"
];

console.log(`🏭 Applying ${ULTRA_MANUFACTURER_IDS.length} manufacturer IDs`);
console.log(`📦 Applying ${ULTRA_PRODUCT_IDS.length} product IDs`);

// Apply to ALL drivers
let enrichedCount = 0;
fs.readdirSync('drivers').forEach(driverName => {
    const composePath = `drivers/${driverName}/driver.compose.json`;
    if (fs.existsSync(composePath)) {
        try {
            const config = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            if (config.zigbee) {
                // Apply MEGA databases
                config.zigbee.manufacturerName = ULTRA_MANUFACTURER_IDS;
                config.zigbee.productId = ULTRA_PRODUCT_IDS;
                
                fs.writeFileSync(composePath, JSON.stringify(config, null, 2));
                enrichedCount++;
                console.log(`✅ ${driverName} - enriched with ${ULTRA_MANUFACTURER_IDS.length} mfr IDs`);
            }
        } catch(e) {
            console.log(`⚠️ ${driverName} - ${e.message}`);
        }
    }
});

// Update app.json with new version
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const versionParts = app.version.split('.');
versionParts[1] = String(parseInt(versionParts[1]) + 1); // Major feature update
app.version = versionParts.join('.');
app.name = { "en": "Ultimate Zigbee Hub" };
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`\n🎉 MEGA ENRICHMENT COMPLETE!`);
console.log(`✅ ${enrichedCount} drivers enriched`);
console.log(`📦 Version ${app.version}`);
console.log(`🚫 ZERO wildcards - only complete IDs`);
console.log(`🏭 Based on Johan Bendz + Community sources`);
