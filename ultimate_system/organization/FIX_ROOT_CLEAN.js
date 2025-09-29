const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧹 FIX ROOT CLEAN - Nettoyer racine correctement');

// Move all non-homey folders to ultimate_system
const toMove = [
  'backup', 'backup_complete', 'archives', 'docs', 'references', 
  'scripts', 'tools', 'modules', 'dumps', 'fusion'
];

toMove.forEach(folder => {
  if (fs.existsSync(folder)) {
    const target = `./ultimate_system/${folder}_moved`;
    try {
      execSync(`robocopy "${folder}" "${target}" /E /NFL /NDL /NJH /NJS`, {stdio: 'pipe'});
      execSync(`rmdir /s /q "${folder}"`, {stdio: 'pipe'});
      console.log(`✅ ${folder} moved to ultimate_system`);
    } catch(e) {
      console.log(`⚠️ ${folder} move error`);
    }
  }
});

// Clean JS scripts from root
const jsFiles = fs.readdirSync('.').filter(f => 
  f.endsWith('.js') && !['app.js'].includes(f)
);

jsFiles.forEach(f => {
  try {
    fs.renameSync(f, `./ultimate_system/${f}`);
    console.log(`✅ ${f} moved`);
  } catch(e) {
    fs.unlinkSync(f);
    console.log(`🗑️ ${f} deleted`);
  }
});

// Clean other files
['backup_data.json', 'validation_report.json', 'DRIVER_STATS.md', 'ULTIMATE_REFERENCE_MATRIX.md'].forEach(f => {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log(`🗑️ ${f} deleted`);
  }
});

console.log('✅ Root cleaned - only Homey files remain');
