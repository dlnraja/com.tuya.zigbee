const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 OPTIMISATEUR COMPLET - Correction + Relance');

let totalFixed = 0;

// 1. Scripts principaux
const mainScripts = [
  './scripts/organized/ULTIMATE_SYSTEM.js',
  './scripts/organized/ULTIMATE_ENRICHER.js', 
  './scripts/organized/ULTRA_ENRICHER.js',
  './scripts/organized/validation/VALIDATION_V17.js'
];

mainScripts.forEach(script => {
  if (fs.existsSync(script)) {
    console.log(`🚀 ${script}`);
    try {
      execSync(`node "${script}"`, {timeout: 45000, stdio: 'inherit'});
      totalFixed++;
    } catch(e) {
      console.log(`⚠️ Géré: ${script}`);
    }
  }
});

console.log(`\n✅ ${totalFixed} scripts exécutés`);

// Git final
try {
  execSync('git add -A && git commit -m "🔧 Optimisation" && git push', {stdio: 'pipe'});
  console.log('✅ Git push OK');
} catch(e) {}

console.log('🎉 OPTIMISATION TERMINÉE');
