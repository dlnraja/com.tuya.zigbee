const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧠 SMART FUSION');
let fused = 0;

fs.readdirSync('./drivers').slice(0, 3).forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    if (!data.id) {
      data.id = `_TZ3000_${d}`;
      fs.writeFileSync(f, JSON.stringify(data, null, 2));
      fused++;
    }
  }
});

console.log(`✅ ${fused} fusionnés`);
execSync('git add . && git commit -m "Smart fusion" && git push', {stdio: 'pipe'});
