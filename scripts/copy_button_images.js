const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../drivers/avatto_sos_emergency_button/assets/images');
const targets = [
  path.join(__dirname, '../drivers/moes_sos_emergency_button/assets/images'),
  path.join(__dirname, '../drivers/wireless_button/assets/images')
];

['small.png', 'large.png', 'xlarge.png'].forEach(file => {
  targets.forEach(dst => {
    fs.copyFileSync(path.join(src, file), path.join(dst, file));
  });
});

console.log('✅ Button images copied successfully');
