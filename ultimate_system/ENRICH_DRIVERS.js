const fs = require('fs');

console.log('⚡ ENRICH DRIVERS');

let enriched = 0;

fs.readdirSync('../drivers').slice(0, 3).forEach(d => {
  const f = `../drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    if (!data.id) {
      data.id = `_TZ3000_${d}`;
      fs.writeFileSync(f, JSON.stringify(data, null, 2));
      enriched++;
    }
  }
});

console.log(`✅ ${enriched} drivers enriched`);
