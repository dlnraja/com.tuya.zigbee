const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 FIX 324 DUPLICATES v4.0.0');

const UNIQUE = {
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
  if (fs.existsSync(f) && UNIQUE[d]) {
    const data = JSON.parse(fs.readFileSync(f));
    data.zigbee = data.zigbee || {};
    data.zigbee.manufacturerName = UNIQUE[d];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    fixed++;
  }
});

console.log(`✅ Fixed ${fixed} duplicates`);
execSync('homey app validate && git add -A && git commit -m "🔧 Fix 324 duplicates" && git push', {stdio: 'inherit'});
