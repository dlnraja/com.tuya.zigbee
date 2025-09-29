const fs = require('fs');

console.log('🔧 FIX BOTH PROBLEMS');

// Fix 1: Remove air_quality_monitor
if (fs.existsSync('drivers/air_quality_monitor')) {
    fs.rmSync('drivers/air_quality_monitor', { recursive: true });
    console.log('✅ air_quality_monitor removed');
}

// Fix 2: Fix battery 9V -> PP3
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
if (app.drivers) {
    app.drivers.forEach(d => {
        if (d.id === 'co_detector_advanced' && d.energy?.batteries?.includes('9V')) {
            d.energy.batteries = d.energy.batteries.map(b => b === '9V' ? 'PP3' : b);
            console.log('✅ Battery 9V -> PP3 fixed');
        }
    });
}
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Clean cache
if (fs.existsSync('.homeybuild')) {
    fs.rmSync('.homeybuild', { recursive: true });
    console.log('✅ Cache cleaned');
}

console.log('🎯 BOTH PROBLEMS FIXED!');
