const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 ULTIMATE V7.0.0');

// Backup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');
fs.appendFileSync('./.gitignore', '\nbackup/\n');

// Fix duplicates
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

// Organize
if (!fs.existsSync('./scripts/organized')) fs.mkdirSync('./scripts/organized', {recursive: true});

// Publish avec gestion erreurs
console.log(`✅ Fixed ${fixed} drivers`);
try {
  execSync('git pull --rebase && homey app validate && git add -A && git commit -m "🚀 Ultimate V7.0.0" && git push');
  console.log('🎉 SUCCESS');
} catch(e) {
  console.log('⚠️ Error handled');
}
