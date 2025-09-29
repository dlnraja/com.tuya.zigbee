const { execSync } = require('child_process');
const fs = require('fs');

console.log('🎭 MASTER FUSION - Organisation complète');

// Exécution scripts de fusion
const scripts = [
  'FUSION_ORGANIZER.js',
  'NETWORK_FUSION.js', 
  'VERSION_FUSION.js',
  'TYPE_FUSION.js'
];

scripts.forEach(script => {
  try {
    console.log(`▶️ ${script}`);
    execSync(`node ${script}`, { stdio: 'pipe' });
    console.log(`✅ ${script} terminé`);
  } catch (e) {
    console.log(`⚠️ ${script} erreur`);
  }
});

console.log('🎉 FUSION ORGANISÉE TERMINÉE');
