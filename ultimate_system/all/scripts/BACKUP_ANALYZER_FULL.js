const fs = require('fs');

console.log('📊 BACKUP ANALYZER FULL');

// Analyse complète backup
const backupDirs = fs.readdirSync('./backup').filter(d => fs.statSync(`./backup/${d}`).isDirectory());
let total = 0;

backupDirs.forEach(dir => {
  const fullPath = `./backup/${dir}`;
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath, { recursive: true });
    total += files.length;
    console.log(`📁 ${dir}: ${files.length} fichiers`);
  }
});

console.log(`✅ Total: ${total} fichiers dans ${backupDirs.length} dossiers`);
