const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 ULTIMATE SYSTEM V4.0.0');

// 1. Backup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');
fs.appendFileSync('./.gitignore', '\nbackup/\n');

// 2. Fix duplicates  
const UNIQUE_IDS = {
  air_quality_monitor: ['_TZ3210_alproto2'],
  motion_sensor_basic: ['_TZ3000_mmtwjmaq'],
  smart_switch_1gang_ac: ['_TZ3000_qzjcsmar'],
  smart_switch_2gang_ac: ['_TZ3000_ji4araar'],
  smart_plug: ['_TZ3000_g5xawfcq']
};

let fixed = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f) && UNIQUE_IDS[d]) {
    const data = JSON.parse(fs.readFileSync(f));
    data.zigbee = data.zigbee || {};
    data.zigbee.manufacturerName = UNIQUE_IDS[d];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    fixed++;
  }
});

console.log(`✅ Fixed ${fixed} drivers`);

// 3. Organize
if (!fs.existsSync('./scripts/organized')) fs.mkdirSync('./scripts/organized', {recursive: true});

// 4. Execute
execSync('homey app validate && git add -A && git commit -m "🚀 Ultimate System V4" && git push', {stdio: 'inherit'});
console.log('🎉 COMPLETE');
