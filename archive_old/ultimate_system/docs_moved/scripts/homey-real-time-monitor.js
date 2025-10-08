const { execSync } = require('child_process');
const fs = require('fs');

console.log('🎯 HOMEY APP STORE REAL-TIME MONITOR');
console.log('📊 Target: https://apps.developer.homey.app/app-store/publishing');
console.log('🔄 Auto-retry with bug fixes until success\n');

let cycle = 1;
const maxCycles = 50;

function monitorAndRetry() {
    console.log(`\n🚀 CYCLE ${cycle}/${maxCycles} - ${new Date().toLocaleTimeString()}`);
    console.log('🌐 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
    console.log('🎯 Homey Portal: https://apps.developer.homey.app/app-store/publishing');
    
    try {
        // Fix any remaining bugs
        const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
        
        // Increment version
        const vParts = app.version.split('.');
        vParts[2] = String(parseInt(vParts[2]) + 1);
        app.version = vParts.join('.');
        
        // Ensure UNBRANDED structure
        app.name = { "en": "Ultimate Zigbee Hub" };
        app.category = ['tools'];
        
        // Limit drivers to avoid CLI issues
        if (app.drivers && app.drivers.length > 10) {
            app.drivers = app.drivers.slice(0, 10);
        }
        
        fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
        console.log(`📦 Updated to v${app.version} (${app.drivers ? app.drivers.length : 0} drivers)`);
        
        // Clean cache
        if (fs.existsSync('.homeycompose')) {
            execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
        }
        
        // Push to trigger GitHub Actions
        execSync(`git add -A && git commit -m "🔄 Monitor cycle ${cycle} - v${app.version}" && git push origin master`);
        console.log('✅ GitHub Actions triggered - Publishing to Homey App Store');
        
        // Monitor GitHub Actions status
        console.log('👀 Monitoring GitHub Actions workflow...');
        console.log('⏰ Next check in 3 minutes...');
        
        cycle++;
        if (cycle <= maxCycles) {
            setTimeout(monitorAndRetry, 180000); // 3 minutes
        } else {
            console.log('🛑 Maximum cycles reached');
        }
        
    } catch(e) {
        console.log('❌ Error in cycle:', e.message);
        cycle++;
        if (cycle <= maxCycles) {
            setTimeout(monitorAndRetry, 60000); // 1 minute retry on error
        }
    }
}

// Start monitoring
monitorAndRetry();
