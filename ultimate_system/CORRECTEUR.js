const { execSync } = require('child_process');

console.log('🔄 CORRECTEUR');

// Lancer scripts
['LAUNCHER_MODULAIRE.js', 'FUSION.js'].forEach(s => {
  try {
    execSync(`node ${s}`, {timeout: 15000});
    console.log(`✅ ${s}`);
  } catch(e) {}
});

console.log('✅ Terminé');
