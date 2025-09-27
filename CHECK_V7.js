const fs = require('fs');

console.log('🔍 CHECK V7');

let checked = 0;
let issues = 0;

fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    checked++;
    try {
      JSON.parse(fs.readFileSync(f));
    } catch(e) {
      issues++;
    }
  }
});

console.log(`📊 Checked ${checked} drivers, found ${issues} issues`);
console.log('✅ Check complete');
