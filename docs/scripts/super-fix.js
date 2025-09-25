const fs = require('fs');

console.log('🔧 SUPER FIX - All Problems');

// Fix 1: Remove air quality driver
if (fs.existsSync('drivers/air_quality_monitor')) {
    fs.rmSync('drivers/air_quality_monitor', { recursive: true });
    console.log('✅ air_quality_monitor removed');
}

// Fix 2: Clean cache
if (fs.existsSync('.homeybuild')) {
    fs.rmSync('.homeybuild', { recursive: true });
    console.log('✅ Cache cleaned');
}

// Fix 3: Version consistency
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

if (pkg.version !== app.version) {
    app.version = pkg.version;
    fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
    console.log('✅ Versions synced');
}

console.log('🎯 SUPER FIX COMPLETE');
