const fs = require('fs');

console.log('📁 CREATE STRUCTURE');

const dirs = [
  './backup/master',
  './backup/tuya-light', 
  './backup/content',
  './backup/versions'
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, {recursive: true});
    console.log(`✅ ${d}`);
  }
});

console.log('✅ Structure created');
