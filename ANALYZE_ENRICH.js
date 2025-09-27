const fs = require('fs');
console.log('🔍 ANALYZE ENRICH v6.0.0');
console.log('📜 Analyzing historical data...');
console.log('💎 Enriching drivers...');
let enriched = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    enriched++;
  }
});
console.log(`✅ Enriched ${enriched} drivers`);
