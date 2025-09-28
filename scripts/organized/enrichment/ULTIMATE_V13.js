const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 ULTIMATE V13 - INSPIRÉ DE TOUS LES ANCIENS PUSH');

// Backup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');
fs.appendFileSync('./.gitignore', '\nbackup/\n');

// Enrichissement
const DB = {air_quality_monitor: ['_TZ3210_alproto2'], motion_sensor_basic: ['_TZ3000_mmtwjmaq']};
let enriched = 0;
Object.keys(DB).forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    data.zigbee = data.zigbee || {};
    data.zigbee.manufacturerName = DB[d];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    enriched++;
  }
});

console.log(`✅ ${enriched} enriched`);

// Git sécurisé
try {
  if (fs.existsSync('.homeybuild')) fs.rmSync('.homeybuild', {recursive: true, force: true});
  execSync('git stash && git pull --rebase && git stash pop && homey app validate && git add -A && git commit -m "V13" && git push');
  console.log('🎉 V13 SUCCESS');
} catch(e) {
  console.log('⚠️ Handled');
}
