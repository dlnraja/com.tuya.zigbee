const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 COMPACT ULTIMATE v6.0.0');

// Backup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');
fs.appendFileSync('./.gitignore', '\nbackup/\n');

// Fix duplicates
const FIXES = {air_quality_monitor: ['_TZ3210_alproto2'], motion_sensor_basic: ['_TZ3000_mmtwjmaq']};
let fixed = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f) && FIXES[d]) {
    const data = JSON.parse(fs.readFileSync(f));
    data.zigbee = data.zigbee || {};
    data.zigbee.manufacturerName = FIXES[d];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    fixed++;
  }
});

console.log(`✅ Fixed ${fixed} drivers`);
execSync('homey app validate && git add -A && git commit -m "🚀 Compact Ultimate v6.0.0" && git push');
console.log('🎉 SUCCESS');
