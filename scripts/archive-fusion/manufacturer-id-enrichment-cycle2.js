// MANUFACTURER ID ENRICHMENT - CYCLE 2/10
// Fixes critical device recognition issue: _TZE284_xxxxx patterns
// Following your guidance: wildcard + specific suffixes for maximum coverage

const fs = require('fs').promises;
const path = require('path');

// TOP 50 KNOWN SUFFIXES from ZHA, Zigbee2MQTT, Johan Bendz, community reports
const KNOWN_SUFFIXES = [
    "uqfph8ah", "myd45weu", "n4ttsck2", "gyzlwu5q", "2aaelwxk", "3towulqd",
    "ztc6ggyl", "bjzrowv2", "qasjif9e", "ijxvkhd0", "18ejxno0", "hhiodade", 
    "v1w2k9dd", "kfu8zapd", "c8ozah8n", "dwcarsat", "mhxn2jso", "yojqa8xn",
    "ntcy3xu1", "amp6tsvy", "oisqyl4o", "whpb9yts", "mcxw5ehu", "6ygjfyll",
    "bsvqrxru", "4ggd8ezp", "lf56vpxj", "h4wnrtck", "jmrgyl7o", "sn60p5h8",
    "rxtv1mfk", "bq7mlkgv", "w5auu1jt", "tv3wxhcz", "cjlm9ra6", "0zaf1cr8",
    "dnz21gts", "m9skfctm", "rccxox8p", "czbl27da", "pnvdf1th", "kalvbxpe",
    "giy0dtou", "nojzpbeb", "xzal3kbc", "pd8tpp3v", "ml0ples1", "bfpnp2hn",
    "jn2nekng", "qj6k36gt"
];

// Standard prefixes for Tuya devices
const PREFIXES = ["_TZE284_", "_TZE200_", "_TZ3000_", "_TZE204_", "_TZ3210_", "_TZ3400_", "_TYZB01_"];

async function enrichManufacturerIds() {
    console.log('🔧 MANUFACTURER ID MEGA ENRICHMENT STARTING...');
    
    const driversDir = 'drivers';
    const driverDirs = await fs.readdir(driversDir);
    let enrichedCount = 0;
    let totalAdded = 0;

    for (const driverDir of driverDirs) {
        const driverPath = path.join(driversDir, driverDir);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        try {
            const stat = await fs.stat(composePath);
            if (!stat.isFile()) continue;
            
            const content = await fs.readFile(composePath, 'utf8');
            const driver = JSON.parse(content);
            
            if (!driver.zigbee || !driver.zigbee.manufacturerName) {
                console.log(`⚠️ Skipping ${driverDir}: No manufacturerName field`);
                continue;
            }

            let manufacturerNames = Array.isArray(driver.zigbee.manufacturerName) 
                ? [...driver.zigbee.manufacturerName] 
                : [driver.zigbee.manufacturerName];
                
            const originalCount = manufacturerNames.length;
            
            // Add generic wildcards first
            for (const prefix of PREFIXES) {
                if (!manufacturerNames.includes(prefix)) {
                    manufacturerNames.push(prefix);
                }
            }
            
            // Add specific patterns (top 25 most critical)
            for (const prefix of PREFIXES) {
                for (let i = 0; i < Math.min(25, KNOWN_SUFFIXES.length); i++) {
                    const fullPattern = prefix + KNOWN_SUFFIXES[i];
                    if (!manufacturerNames.includes(fullPattern)) {
                        manufacturerNames.push(fullPattern);
                    }
                }
            }
            
            // Update driver
            driver.zigbee.manufacturerName = manufacturerNames;
            
            // Save with proper formatting
            await fs.writeFile(composePath, JSON.stringify(driver, null, 2), 'utf8');
            
            const newCount = manufacturerNames.length;
            const added = newCount - originalCount;
            totalAdded += added;
            
            if (added > 0) {
                console.log(`✅ ${driverDir}: ${originalCount} → ${newCount} manufacturer IDs (+${added})`);
                enrichedCount++;
            }
            
        } catch (error) {
            console.error(`❌ Error processing ${driverDir}:`, error.message);
        }
    }

    console.log(`\n🎯 ENRICHMENT COMPLETE:`);
    console.log(`📊 Drivers enhanced: ${enrichedCount}`);
    console.log(`🔢 Total manufacturer IDs added: ${totalAdded}`);
    console.log(`✨ Maximum device recognition patterns applied`);
}

enrichManufacturerIds().catch(console.error);
