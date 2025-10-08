const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 MIGRATE FINAL');

// Create structure
if (!fs.existsSync('./ultimate_system/all')) fs.mkdirSync('./ultimate_system/all', {recursive: true});

// Migrate folders
['backup', 'docs', 'scripts', 'tools'].forEach(f => {
  if (fs.existsSync(f)) {
    execSync(`move "${f}" "./ultimate_system/all/${f}"`, {stdio: 'pipe'});
    console.log(`✅ ${f}`);
  }
});

console.log('✅ Done');
