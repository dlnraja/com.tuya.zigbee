const fs = require('fs');

console.log('🔍 COHERENCE v5.0.0');

let issues = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (!fs.existsSync(f)) {
    issues++;
    console.log(`❌ Missing: ${d}`);
  }
});

console.log(`✅ Check complete - ${issues} issues`);
