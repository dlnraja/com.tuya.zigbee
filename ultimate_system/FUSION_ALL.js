const fs = require('fs');

console.log('🔄 FUSION ALL');

let fused = 0;

// Scan backup for driver data
if (fs.existsSync('./backup')) {
  fs.readdirSync('./backup').forEach(dir => {
    const infoPath = `./backup/${dir}/app.json`;
    if (fs.existsSync(infoPath)) {
      console.log(`📁 Found: ${dir}`);
    }
  });
}

// Fusion drivers without version suffixes
fs.readdirSync('../drivers').slice(0, 3).forEach(d => {
  const f = `../drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    if (!data.id) {
      data.id = `_TZ3000_${d.slice(0,6)}`;
      fs.writeFileSync(f, JSON.stringify(data, null, 2));
      fused++;
    }
  }
});

console.log(`✅ ${fused} fused`);
