const fs = require('fs');

console.log('💎 ENRICH v6.0.0');

const ENRICHMENT = {
  motion_sensor_basic: ['_TZ3000_mmtwjmaq'],
  smart_switch_1gang_ac: ['_TZ3000_qzjcsmar'],
  climate_monitor: ['_TZE200_cwbvmsar']
};

let enriched = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f) && ENRICHMENT[d]) {
    const data = JSON.parse(fs.readFileSync(f));
    data.zigbee = data.zigbee || {};
    data.zigbee.manufacturerName = ENRICHMENT[d];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    enriched++;
  }
});

console.log(`✅ Enriched ${enriched} drivers`);
