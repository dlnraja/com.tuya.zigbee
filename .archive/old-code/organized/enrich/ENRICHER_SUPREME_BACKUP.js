const fs = require('fs');
const { enrichFromBackups } = require('./modules/backup/backup_enricher');
const { enrichZigbee } = require('./modules/zigbee/enricher');
const { enrichSensor } = require('./modules/drivers/sensor/sensor_enricher');

console.log('🌟 ENRICHER SUPREME BACKUP');

// Phase 1: Enrichir depuis backups organisés
const backupData = enrichFromBackups();
console.log(`📊 Backups analysés: ${backupData.total}`);
console.log(`🔍 IDs trouvés: ${backupData.manufacturerIDs.length}`);

// Phase 2: Appliquer enrichissement aux drivers actuels
let enriched = 0;
if (fs.existsSync('./drivers')) {
  const drivers = fs.readdirSync('./drivers').slice(0, 15);
  
  drivers.forEach(driver => {
    const path = `./drivers/${driver}`;
    
    if (enrichZigbee(path) || enrichSensor(path)) {
      enriched++;
    }
  });
}

console.log(`🔧 ${enriched} drivers enrichis`);

// Phase 3: Sauvegarder données enrichissement
const report = {
  backupsAnalyzed: backupData.total,
  manufacturerIDs: backupData.manufacturerIDs,
  driversEnriched: enriched,
  timestamp: new Date().toISOString()
};

if (!fs.existsSync('./references')) fs.mkdirSync('./references');
fs.writeFileSync('./references/supreme_backup_enrichment.json', JSON.stringify(report, null, 2));

console.log('🎉 ENRICHISSEMENT SUPREME TERMINÉ');
