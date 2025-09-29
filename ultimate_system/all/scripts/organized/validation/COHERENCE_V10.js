const fs = require('fs');
console.log('🔍 COHERENCE V10');
let checked = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    checked++;
    console.log(`✓ ${d}`);
  }
});
console.log(`📊 ${checked} drivers checked`);
