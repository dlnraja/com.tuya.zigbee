const fs = require('fs');

const dirs = [
  'modules/zigbee',
  'modules/sources', 
  'modules/utils'
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, {recursive: true});
  }
});

console.log('✅ Modules créés');
