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

console.log('🧹 Nettoyage assets...\n');

let deleted = 0;
files.forEach(f => {
  const fp = path.join(__dirname, f);
  try {
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
      console.log('✅ Supprimé:', f);
      deleted++;
    }
  } catch(e) {
    console.error('❌ Erreur:', f, e.message);
  }
});

console.log(`\n✅ ${deleted} fichiers supprimés\n`);

// Garder seulement:
console.log('📂 Structure finale /assets/:');
console.log('   ├── icon.svg (REQUIS)');
console.log('   ├── temp_alarm.svg (custom)');
console.log('   ├── README.md');
console.log('   ├── icons/');
console.log('   ├── templates/');
console.log('   └── images/');
console.log('       ├── large.png (APP)');
console.log('       ├── small.png (APP)');
console.log('       └── xlarge.png (APP)\n');
