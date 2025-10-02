const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔍 AUDIT COMPLET');

// Scan drivers
const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());
const mfrs = new Set();

drivers.forEach(d => {
  const f = `drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    data.zigbee?.manufacturerName?.forEach(m => mfrs.add(m));
  }
});

// Git backup
if (!fs.existsSync('backup')) fs.mkdirSync('backup');
try {
  const hist = execSync('git log --all --format="%h|%s" -100', {encoding:'utf8'});
  fs.writeFileSync('backup/git.txt', hist);
} catch(e) {}

// References
if (!fs.existsSync('references')) fs.mkdirSync('references');
const refs = {
  drivers: drivers.length,
  manufacturers: mfrs.size,
  sources: {
    johan: 'https://github.com/JohanBendz/com.tuya.zigbee',
    forum: 'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352/162'
  }
};
fs.writeFileSync('references/data.json', JSON.stringify(refs,null,2));

console.log(`✅ ${drivers.length} drivers, ${mfrs.size} mfrs`);
console.log('📁 references/data.json + backup/git.txt');
