const { execSync } = require('child_process');
const fs = require('fs');

console.log('⚡ SUPER RELANCE - Système complet');

// Phase 1: Relance complète
console.log('🚀 PHASE 1: RELANCE');
execSync('node RELANCE_COMPLETE.js', { stdio: 'inherit' });

// Phase 2: Vérification
console.log('\n🔍 PHASE 2: VÉRIFICATION');
execSync('node VERIFICATION_TOTALE.js', { stdio: 'inherit' });

// Phase 3: Git push final
console.log('\n📤 PHASE 3: PUBLICATION');
try {
  execSync('git add .', { stdio: 'pipe' });
  execSync('git commit -m "Super relance complète - fusion organisée"', { stdio: 'pipe' });
  execSync('git push', { stdio: 'pipe' });
  console.log('✅ Git push réussi');
} catch (e) {
  console.log('⚠️ Git push échoué');
}

console.log('\n🎉 SUPER RELANCE TERMINÉE');
