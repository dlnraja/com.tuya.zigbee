const fs = require('fs');
console.log('🚀 ULTIMATE V6.0.0');
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');
fs.appendFileSync('./.gitignore', '\nbackup/\n');
const FIXES = {air_quality_monitor: ['_TZ3210_alproto2']};
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
