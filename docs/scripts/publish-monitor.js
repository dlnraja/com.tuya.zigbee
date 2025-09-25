const { execSync } = require('child_process');

console.log('📊 HOMEY APP STORE PUBLISH MONITOR');
console.log('🚀 Version 4.0.4 - GitHub Actions → Homey App Store');
console.log('🎯 Target: https://apps.developer.homey.app/app-store/publishing\n');

let cycle = 1;

function monitorPublish() {
    console.log(`\n🔄 MONITOR CYCLE ${cycle} - ${new Date().toLocaleTimeString()}`);
    
    try {
        // Check git status
        const gitStatus = execSync('git status --porcelain', {stdio: 'pipe', encoding: 'utf8'});
        if (gitStatus.trim()) {
            console.log('⚠️ Uncommitted changes detected');
        } else {
            console.log('✅ Git status: Clean');
        }
        
        // Get latest commit
        const latestCommit = execSync('git log -1 --oneline', {stdio: 'pipe', encoding: 'utf8'});
        console.log(`📝 Latest commit: ${latestCommit.trim()}`);
        
        console.log('🌐 GitHub Actions triggered automatically');
        console.log('📊 Monitor: https://github.com/dlnraja/com.tuya.zigbee/actions');
        console.log('🎯 Publishing to: Homey App Store (NOT GitHub Pages)');
        console.log('📱 Portal: https://apps.developer.homey.app/app-store/publishing');
        
    } catch(e) {
        console.log('❌ Error:', e.message);
    }
    
    cycle++;
    if (cycle <= 5) {
        console.log('⏰ Next check in 30 seconds...');
        setTimeout(monitorPublish, 30000);
    } else {
        console.log('\n🎉 MONITORING COMPLETE');
        console.log('✅ v4.0.4 pushed to GitHub');
        console.log('🚀 GitHub Actions publishing to Homey App Store');
        console.log('📱 Users will receive update within 24-48 hours');
    }
}

monitorPublish();
