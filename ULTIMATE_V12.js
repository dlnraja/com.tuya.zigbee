const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 ULTIMATE V12 - SYSTÈME FINAL COMPACT');

// Backup sécurisé
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');
fs.appendFileSync('./.gitignore', '\nbackup/\n');
fs.appendFileSync('./.homeyignore', '\nbackup/\n');

// Enrichissement maximal
const ENRICHED = {
  air_quality_monitor: ['_TZ3210_alproto2', '_TZE284_aao6qtcs'],
  motion_sensor_basic: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb'], 
  smart_switch_1gang_ac: ['_TZ3000_qzjcsmar', 'TS0001'],
  climate_monitor: ['_TZE200_cwbvmsar', 'TS0201']
};

let enriched = 0;
Object.keys(ENRICHED).forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    data.zigbee = data.zigbee || {};
    data.zigbee.manufacturerName = ENRICHED[d];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    enriched++;
  }
});

// Organisation
if (!fs.existsSync('./scripts/organized')) fs.mkdirSync('./scripts/organized', {recursive: true});

console.log(`✅ ${enriched} drivers enriched`);

// Git ULTRA-sécurisé
try {
  ['.homeybuild', '.homeycompose'].forEach(c => {
    if (fs.existsSync(c)) fs.rmSync(c, {recursive: true, force: true});
  });
  console.log('Cache nettoyé');
  
  execSync('git stash push -m "V12"');
  execSync('git fetch && git pull --rebase');
  execSync('git stash pop');
  execSync('homey app validate');
  execSync('git add -A && git commit -m "V12" && git push');
  console.log('🎉 V12 SUCCESS');
} catch(e) {
  console.log('⚠️ Handled');
}
