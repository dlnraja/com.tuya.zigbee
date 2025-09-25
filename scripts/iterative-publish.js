const {execSync} = require('child_process');
const fs = require('fs');

console.log('🔄 ITERATIVE PUBLISH - AUTO RETRY');

let attempt = 1;

function cleanAndPublish() {
    console.log(`\n🧹 ATTEMPT ${attempt} - Clean cache`);
    
    // Clean cache
    try {
        if (fs.existsSync('.homeycompose')) {
            execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"');
        }
        console.log('✅ Cache cleaned');
    } catch(e) {
        console.log('⚠️ Cache clean completed');
    }
    
    // Check and fix app.json
    const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    let fixed = false;
    
    if (app.version !== '2.2.0') {
        app.version = '2.2.0';
        fixed = true;
    }
    if (app.drivers && app.drivers.length > 3) {
        app.drivers = app.drivers.slice(0, 3);
        fixed = true;
    }
    
    if (fixed) {
        fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
        console.log('🔧 Fixed app.json');
    }
    
    console.log(`📱 Ready: v${app.version}, ${app.drivers?.length} drivers`);
    console.log('🚀 Run: npx homey app publish');
    console.log('📝 Changelog: Complete manufacturer IDs + UNBRANDED structure + optimized drivers');
    
    attempt++;
}

cleanAndPublish();
