const fs = require('fs');
console.log('🚀 ENRICHER V13 - INTELLIGENT ENRICHMENT');

const manufacturerDB = {
  '_TZE284_': ['air_quality_monitor', 'motion_sensor_basic', 'smart_switch_1gang'],
  '_TZ3000_': ['dimmer_switch', 'temperature_sensor', 'door_sensor'],
  '_TZE200_': ['smart_plug', 'curtain_motor', 'thermostat']
};

let enriched = 0;
fs.readdirSync('./drivers').forEach(driverName => {
  const driverPath = `./drivers/${driverName}/driver.compose.json`;
  if (fs.existsSync(driverPath)) {
    try {
      const driver = JSON.parse(fs.readFileSync(driverPath));
      
      // Enrichissement avec manufacturer IDs complets
      Object.keys(manufacturerDB).forEach(prefix => {
        if (manufacturerDB[prefix].includes(driverName)) {
          if (!driver.id || !driver.id.startsWith(prefix)) {
            driver.id = `${prefix}${driverName}_v13`;
            fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2));
            enriched++;
          }
        }
      });
      
    } catch(e) {
      // Skip malformed JSON
    }
  }
});

console.log(`✅ ${enriched} drivers enrichis intelligemment`);
