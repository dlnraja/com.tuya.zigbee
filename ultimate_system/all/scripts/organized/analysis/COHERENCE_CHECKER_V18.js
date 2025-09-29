const fs = require('fs');
console.log('🔍 COHERENCE CHECKER V18');

let checked = 0, fixed = 0;

if (fs.existsSync('./drivers')) {
  fs.readdirSync('./drivers').forEach(dir => {
    const file = `./drivers/${dir}/driver.compose.json`;
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        checked++;
        
        if (data.id && data.id.startsWith('_TZ3000_') && data.manufacturerName !== 'Tuya') {
          data.manufacturerName = 'Tuya';
          fs.writeFileSync(file, JSON.stringify(data, null, 2));
          fixed++;
        }
      } catch(e) {}
    }
  });
}

console.log(`✅ V18: ${checked} vérifiés, ${fixed} corrigés`);

fs.writeFileSync('./references/coherence_v18.json', JSON.stringify({
  version: 'V18.0.0', checked, fixed, timestamp: new Date().toISOString()
}, null, 2));
