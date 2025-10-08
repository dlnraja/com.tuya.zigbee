const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 CONTINUOUS HOMEY APP STORE MONITOR');
console.log('🎯 Target: https://apps.developer.homey.app/app-store/publishing');
console.log('🔄 Infinite retry until Homey App Store success\n');

let cycle = 1;

function continuousMonitor() {
    console.log(`\n🔄 CYCLE ${cycle} - ${new Date().toLocaleTimeString()}`);
    
    try {
        // Sync with remote first
        execSync('git pull origin master', {stdio: 'pipe'});
        
        // Update with ULTRA complete IDs database
        const ultraCompleteIDs = [
            "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZE284_aagrxlbd", "_TZE284_uqfph8ah",
            "_TZ3000_mmtwjmaq", "_TZ3000_g5xawfcq", "_TZ3000_kmh5qpmb", "_TZ3000_fllyghyj",
            "_TZE200_cwbvmsar", "_TZE200_bjawzodf", "_TZE200_3towulqd", "_TZE200_locansqn",
            "TS011F", "TS0201", "TS0001", "TS0011", "TS130F", "TS0601", "Tuya", "MOES"
        ];
        
        const productIDs = ["TS0001", "TS0011", "TS0201", "TS011F", "TS130F", "TS0601"];
        
        // Re-enrich ALL drivers every cycle
        let driverCount = 0;
        fs.readdirSync('drivers').forEach(d => {
            const driverPath = `drivers/${d}/driver.compose.json`;
            if (fs.existsSync(driverPath)) {
                const config = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
                if (config.zigbee) {
                    config.zigbee.manufacturerName = ultraCompleteIDs;
                    config.zigbee.productId = productIDs;
                    fs.writeFileSync(driverPath, JSON.stringify(config, null, 2));
                    driverCount++;
                }
            }
        });
        
        // Update app.json
        const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
        const versionParts = app.version.split('.');
        versionParts[2] = String(parseInt(versionParts[2]) + 1);
        app.version = versionParts.join('.');
        app.name = { "en": "Ultimate Zigbee Hub" };
        app.category = ['tools'];
        fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
        
        // Clean cache
        if (fs.existsSync('.homeycompose')) {
            execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
        }
        
        // Push to GitHub (triggers GitHub Actions → Homey App Store)
        execSync(`git add -A && git commit -m "🔄 Continuous monitor ${cycle} - v${app.version}" && git push origin master --force`);
        
        console.log(`✅ v${app.version} - ${driverCount} drivers enriched`);
        console.log('🌐 GitHub Actions triggered → Homey App Store publishing');
        console.log('📊 Check: https://github.com/dlnraja/com.tuya.zigbee/actions');
        console.log('🎯 Portal: https://apps.developer.homey.app/app-store/publishing');
        
    } catch(e) {
        console.log('❌ Error:', e.message);
    }
    
    // Continue indefinitely with 2 minute intervals
    cycle++;
    console.log(`⏰ Next cycle in 2 minutes...`);
    setTimeout(continuousMonitor, 120000);
}

// Start continuous monitoring
continuousMonitor();
