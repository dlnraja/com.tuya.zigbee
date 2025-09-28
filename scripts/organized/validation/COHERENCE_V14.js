const fs = require('fs');
console.log('🔍 COHERENCE V14');

let fixed = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const j = JSON.parse(fs.readFileSync(f));
    if (!j.id?.startsWith('_TZ')) {
      j.id = `_TZE284_${d}_v14`;
      fs.writeFileSync(f, JSON.stringify(j, null, 2));
      fixed++;
    }
  }
});

console.log(`✅ ${fixed} drivers cohérents`);
