const fs = require('fs');

console.log('🎯 FUSION ORGANIZER');

// Création structure modulaire
const dirs = [
  './fusion/zigbee',
  './fusion/zwave', 
  './fusion/v10-v15',
  './fusion/v16-v19',
  './fusion/drivers',
  './fusion/scripts'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ ${dir} créé`);
  }
});

console.log('✅ Structure fusion organisée');
