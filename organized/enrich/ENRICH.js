const fs = require('fs');

console.log('⚡ ENRICHMENT');
let enriched = 0;

if (fs.existsSync('./backup_data.json')) {
  const backup = JSON.parse(fs.readFileSync('./backup_data.json'));
  
  fs.readdirSync('./drivers').slice(0, 10).forEach(d => {
    const f = `./drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
      const data = JSON.parse(fs.readFileSync(f));
      if (!data.id || data.id.includes('*')) {
        data.id = `_TZ3000_${d.slice(0, 6)}`;
        fs.writeFileSync(f, JSON.stringify(data, null, 2));
        enriched++;
      }
    }
  });
}

console.log(`✅ ${enriched} enrichis`);
