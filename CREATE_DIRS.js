const fs = require('fs');

const dirs = [
  'modules/drivers/sensor',
  'modules/drivers/switch', 
  'modules/drivers/light',
  'modules/drivers/climate',
  'modules/backup',
  'modules/validation'
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, {recursive: true});
    console.log(`✅ ${d}`);
  }
});

console.log('📦 Dossiers créés');
