const fs = require('fs');

console.log('🗂️ CLEAN PROJECT');

// Create dirs
['scripts', 'archive', 'logs'].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d);
});

// Move JS files
const jsFiles = fs.readdirSync('.').filter(f => f.endsWith('.js') && f !== 'app.js' && f !== 'clean.js');
jsFiles.forEach(f => {
    fs.renameSync(f, `scripts/${f}`);
});

console.log(`✅ Moved ${jsFiles.length} JS files to scripts/`);
