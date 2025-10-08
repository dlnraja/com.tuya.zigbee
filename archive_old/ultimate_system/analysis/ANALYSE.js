const fs = require('fs');

console.log('🚀 ANALYSE');

let fixed = 0;
if (fs.existsSync('./drivers')) {
  fs.readdirSync('./drivers').slice(0, 5).forEach(d => {
    const f = `./drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
      let data = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!data.id || data.id.includes('*')) {
        data.id = `_TZ3000_${d.slice(0, 4)}`;
        fs.writeFileSync(f, JSON.stringify(data, null, 2));
        fixed++;
      }
    }
  });
}

console.log(`✅ ${fixed} enrichis`);
