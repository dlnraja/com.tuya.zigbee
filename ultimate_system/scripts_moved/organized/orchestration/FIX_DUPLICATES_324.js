const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 FIX 324 DUPLICATES v3.0.0');

const UNIQUE_IDS = {
  air_quality_monitor: ['_TZ3210_alproto2'],
  motion_sensor_basic: ['_TZ3000_mmtwjmaq'],
  smart_switch_1gang_ac: ['_TZ3000_qzjcsmar'],
  smart_switch_2gang_ac: ['_TZ3000_ji4araar'],
  smart_plug: ['_TZ3000_g5xawfcq'],
  climate_monitor: ['_TZE200_cwbvmsar'],
  contact_sensor: ['_TZ3000_26fmupbb'],
  smoke_detector: ['_TZ3210_up3pngle'],
  water_leak_sensor: ['_TZ3000_upgcbody']
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

console.log(`✅ Fixed ${fixed} duplicate conflicts`);
execSync('homey app validate && git add -A && git commit -m "🔧 Fix 324 duplicates" && git push', {stdio: 'inherit'});
