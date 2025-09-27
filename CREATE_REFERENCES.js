const fs = require('fs');

console.log('📊 CREATE REFERENCES v6.0.0');

// Créer structure de références
const dirs = [
  './references/protocol_specs',
  './references/historical_data', 
  './references/driver_database',
  './references/sources'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
});

// Créer tableau de références drivers
const driverReferences = {
  motion_sensors: {
    manufacturer_ids: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb'],
    clusters: ['0x0406', '0x0500'],
    features: ['motion', 'battery'],
    category: 'Motion & Presence Detection'
  },
  climate_sensors: {
    manufacturer_ids: ['_TZE200_cwbvmsar', '_TZE200_bjawzodf'],
    clusters: ['0x0402', '0x0405'],
    features: ['temperature', 'humidity'],
    category: 'Temperature & Climate'
  },
  smart_switches: {
    manufacturer_ids: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar'],
    clusters: ['0x0006', '0x0008'],
    features: ['switching', 'dimming'],
    category: 'Smart Lighting'
  }
};

// Sauvegarder
fs.writeFileSync('./references/driver_references.json', JSON.stringify(driverReferences, null, 2));
console.log('✅ References created');
