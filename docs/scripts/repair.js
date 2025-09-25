const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔧 REPAIR & REPUBLISH');

// Fix app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.0.5';
if (app.drivers && app.drivers.length > 20) {
    app.drivers = app.drivers.slice(0, 20);
    console.log('✅ Limited to 20 drivers');
}
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Push
execSync('git add -A && git commit -m "🔧 FIX: v2.0.5" && git push --force origin master');
console.log('✅ REPAIRED & PUBLISHED!');
console.log('🔗 https://github.com/dlnraja/com.tuya.zigbee/actions');
