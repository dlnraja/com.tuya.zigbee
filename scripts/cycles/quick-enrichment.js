// QUICK ENRICHMENT - CYCLE 1
const fs = require('fs').promises;

const quickIds = [
  '_TZE284_uqfph8ah', '_TZE284_myd45weu', '_TZE284_n4ttsck2',
  '_TZ3210_ncw88jfq', '_TZE284_2aaelwxk', '_TZE200_amp6tsvy'
];

async function quickEnrich() {
  console.log('⚡ QUICK ENRICHMENT...');
  const drivers = await fs.readdir('drivers');
  
  for (const driver of drivers.slice(0, 10)) {
    try {
      const path = `drivers/${driver}/driver.compose.json`;
      const data = JSON.parse(await fs.readFile(path, 'utf8'));
      
      if (data.zigbee?.manufacturerName) {
        const existing = Array.isArray(data.zigbee.manufacturerName) 
          ? data.zigbee.manufacturerName 
          : [data.zigbee.manufacturerName];
        
        const newIds = quickIds.filter(id => !existing.includes(id));
        if (newIds.length > 0) {
          data.zigbee.manufacturerName = [...existing, ...newIds];
          await fs.writeFile(path, JSON.stringify(data, null, 2));
          console.log(`✅ Enriched ${driver} with ${newIds.length} IDs`);
        }
      }
    } catch (e) {
      // Skip missing drivers
    }
  }
}

quickEnrich().catch(console.error);
