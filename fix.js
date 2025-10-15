const fs = require('fs');
fs.copyFileSync('assets/images/small.png', 'assets/small.png');
fs.copyFileSync('assets/images/large.png', 'assets/large.png');
console.log('✅ Fichiers copiés');
