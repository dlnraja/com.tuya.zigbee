const fs = require('fs');

console.log('🔍 ENRICHISSEMENT DRIVERS VIDES');

const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());

// Base de données enrichissement basée sur clusters/capabilities
const enrichmentDB = {
  alarm_co: {
    manufacturers: ['_TZE200_htnnfasr', '_TZ3400_jeaxp72v'],
    productId: ['TS0601'],
    batteries: ['CR2032']
  },
  alarm_smoke: {
    manufacturers: ['_TZE200_m9skfctm', '_TZE200_rccxox8p'],
    productId: ['TS0601'],
    batteries: ['CR2032']
  },
  motion: {
    manufacturers: ['_TZ3000_mcxw5ehu', '_TZ3040_bb6xaihh'],
    productId: ['TS0202'],
    batteries: ['CR2032']
  }
};

let enriched = 0;

drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (!data.zigbee?.manufacturerName || data.zigbee.manufacturerName.length === 0) {
      // Déterminer type basé sur capabilities
      const caps = data.capabilities || [];
      
      if (caps.includes('alarm_co')) {
        data.zigbee = data.zigbee || {};
        data.zigbee.manufacturerName = enrichmentDB.alarm_co.manufacturers;
        data.zigbee.productId = enrichmentDB.alarm_co.productId;
        data.energy = data.energy || {};
        data.energy.batteries = enrichmentDB.alarm_co.batteries;
        enriched++;
      } else if (caps.includes('alarm_smoke')) {
        data.zigbee = data.zigbee || {};
        data.zigbee.manufacturerName = enrichmentDB.alarm_smoke.manufacturers;
        data.zigbee.productId = enrichmentDB.alarm_smoke.productId;
        enriched++;
      } else if (caps.includes('alarm_motion')) {
        data.zigbee = data.zigbee || {};
        data.zigbee.manufacturerName = enrichmentDB.motion.manufacturers;
        data.zigbee.productId = enrichmentDB.motion.productId;
        enriched++;
      }
      
      if (enriched > 0) {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        console.log(`✓ ${driver} enrichi`);
      }
    }
  }
});

console.log(`\n✅ ${enriched} drivers enrichis`);
