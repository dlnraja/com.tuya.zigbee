const fs = require('fs');

console.log('⚡ ENRICH FROM BACKUP - Enrichissement depuis backup');

let enriched = 0;
const manufacturerIds = {};

// Scan backup for manufacturer IDs
if (fs.existsSync('./backup_complete')) {
  fs.readdirSync('./backup_complete').forEach(item => {
    if (item.startsWith('commit_')) {
      const appJsonPath = `./backup_complete/${item}/app.json`;
      if (fs.existsSync(appJsonPath)) {
        try {
          const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
          if (appData.drivers) {
            Object.keys(appData.drivers).forEach(driverId => {
              const driver = appData.drivers[driverId];
              if (driver.zigbee && driver.zigbee.manufacturerName) {
                manufacturerIds[driverId] = {
                  manufacturerName: driver.zigbee.manufacturerName,
                  productId: driver.zigbee.productId
                };
              }
            });
          }
        } catch(e) {}
      }
    }
  });
}

console.log(`📊 Found ${Object.keys(manufacturerIds).length} manufacturer IDs in backup`);

// Apply to current drivers
fs.readdirSync('../drivers').slice(0, 5).forEach(driverDir => {
  const composeFile = `../drivers/${driverDir}/driver.compose.json`;
  if (fs.existsSync(composeFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      
      // Enrich with backup data if available
      if (manufacturerIds[driverDir]) {
        data.zigbee = data.zigbee || {};
        data.zigbee.manufacturerName = manufacturerIds[driverDir].manufacturerName;
        data.zigbee.productId = manufacturerIds[driverDir].productId;
        
        fs.writeFileSync(composeFile, JSON.stringify(data, null, 2));
        enriched++;
        console.log(`✅ ${driverDir} enriched from backup`);
      }
    } catch(e) {}
  }
});

console.log(`✅ ${enriched} drivers enriched from backup`);
