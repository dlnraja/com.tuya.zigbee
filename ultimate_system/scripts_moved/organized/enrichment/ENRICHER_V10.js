const fs = require('fs');

console.log('💎 ENRICHER V10');

// Enhanced enrichment database from historical analysis
const ENRICHED_DB = {
  air_quality_monitor: {
    manufacturerName: ['_TZ3210_alproto2', '_TZE284_gyzlwu5q'],
    clusters: ['0x0402', '0x0405'],
    features: ['temperature', 'humidity', 'air_quality']
  },
  motion_sensor_basic: {
    manufacturerName: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb'],
    clusters: ['0x0406', '0x0500'],
    features: ['motion', 'battery', 'occupancy']
  },
  smart_switch_1gang_ac: {
    manufacturerName: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar'],
    clusters: ['0x0006'],
    features: ['switching', 'ac_powered']
  },
  climate_monitor: {
    manufacturerName: ['_TZE200_cwbvmsar', '_TZE200_bjawzodf'],
    clusters: ['0x0402', '0x0405', '0x040D'],
    features: ['temperature', 'humidity', 'pressure']
  }
};

let enriched = 0;
Object.keys(ENRICHED_DB).forEach(driverType => {
  const driverPath = `./drivers/${driverType}`;
  const composePath = `${driverPath}/driver.compose.json`;
  
  if (fs.existsSync(composePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(composePath));
      const enrichment = ENRICHED_DB[driverType];
      
      data.zigbee = data.zigbee || {};
      data.zigbee.manufacturerName = enrichment.manufacturerName;
      
      fs.writeFileSync(composePath, JSON.stringify(data, null, 2));
      enriched++;
      
    } catch(e) {
      console.log(`⚠️ Error enriching ${driverType}`);
    }
  }
});

console.log(`✅ Enriched ${enriched} drivers with historical data`);
