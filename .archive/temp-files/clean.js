const fs = require('fs');
const path = require('path');

const files = [
  'assets/xlarge.png',
  'assets/images/.force-update',
  'assets/images/icon-large-pro.svg',
  'assets/images/icon-large.svg',
  'assets/images/icon-small-pro.svg',
  'assets/images/icon-small.svg',
  'assets/images/icon-xlarge-pro.svg',
  'assets/images/icon-xlarge.svg',
  'assets/images/icon.svg'
];

let deleted = 0;
files.forEach(f => {
  const fp = path.join(__dirname, f);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    console.log('✅', f);
    deleted++;
  }
});
console.log(`\n${deleted} fichiers supprimés`);
fs.unlinkSync(__filename);
