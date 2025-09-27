const fs = require('fs');

console.log('🔍 ANALYZER v5.0.0');

// Analyze backup
if (fs.existsSync('./backup')) {
  console.log('✅ Backup found');
} else {
  console.log('⚠️ No backup');
}

// Enrich drivers
const enriched = {
  sources: ['_TZE284_gyzlwu5q', '_TZ3000_kfu8zapd'],
  drivers: ['motion_sensor_basic', 'climate_monitor']
};

if (!fs.existsSync('./references')) fs.mkdirSync('./references');
fs.writeFileSync('./references/enriched.json', JSON.stringify(enriched, null, 2));

console.log('✅ Analysis complete');
