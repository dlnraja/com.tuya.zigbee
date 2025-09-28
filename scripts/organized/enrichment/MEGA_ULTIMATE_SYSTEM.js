const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 MEGA ULTIMATE SYSTEM v3.0.0');

// 1. Setup backup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');
const gitignore = fs.existsSync('./.gitignore') ? fs.readFileSync('./.gitignore', 'utf8') : '';
if (!gitignore.includes('backup/')) fs.appendFileSync('./.gitignore', '\nbackup/\n');

// 2. Fix duplicates with unique IDs
const UNIQUE_DB = {
  air_quality_monitor: ['_TZ3210_alproto2'],
  motion_sensor_basic: ['_TZ3000_mmtwjmaq'],
  smart_switch_1gang_ac: ['_TZ3000_qzjcsmar'],
  smart_switch_2gang_ac: ['_TZ3000_ji4araar'],
  smart_plug: ['_TZ3000_g5xawfcq'],
  climate_monitor: ['_TZE200_cwbvmsar']
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

// 3. Organize scripts
if (!fs.existsSync('./scripts/organized')) fs.mkdirSync('./scripts/organized', {recursive: true});

// 4. Validate & publish
execSync('homey app validate && git add -A && git commit -m "🚀 Mega Ultimate System v3.0.0" && git push', {stdio: 'inherit'});
console.log('🎉 MEGA ULTIMATE COMPLETE');
