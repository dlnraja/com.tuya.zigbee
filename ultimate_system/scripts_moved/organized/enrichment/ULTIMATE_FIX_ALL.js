const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 ULTIMATE FIX ALL v3.0.0');

// Fix SMART_SCAN bug - 0 IDs found
const UNIQUE_DB = {
  air_quality_monitor: ['_TZ3210_alproto2'],
  motion_sensor_basic: ['_TZ3000_mmtwjmaq'],
  smart_switch_1gang_ac: ['_TZ3000_qzjcsmar']
};

let fixed = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f) && UNIQUE_DB[d]) {
    const data = JSON.parse(fs.readFileSync(f));
    data.zigbee = data.zigbee || {};
    data.zigbee.manufacturerName = UNIQUE_DB[d];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    fixed++;
  }
});

console.log(`✅ Fixed ${fixed} drivers`);

// Backup setup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');

// Validate & publish
execSync('homey app validate && git add -A && git commit -m "🚀 Ultimate Fix All v3.0.0" && git push', {stdio: 'inherit'});
