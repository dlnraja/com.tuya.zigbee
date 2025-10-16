const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 PUSH AVEC AUTHENTIFICATION NATIVE WINDSURF\n');
console.log('='.repeat(60) + '\n');

try {
  // Ajouter tous les fichiers
  console.log('📦 Git add...');
  execSync('git add -A', { stdio: 'inherit' });
  
  // Vérifier s'il y a des changements
  const status = execSync('git status --short', { encoding: 'utf8' });
  
  if (!status.trim()) {
    console.log('\n✅ Aucun changement à commit');
    process.exit(0);
  }
  
  console.log('\n📝 Changements:');
  console.log(status);
  
  // Commit
  console.log('\n💾 Git commit...');
  execSync('git commit -m "chore: Clean project - Archive temp scripts"', { stdio: 'inherit' });
  
  // Push avec auth native
  console.log('\n📤 Git push (auth native Windsurf)...');
  execSync('git push origin master', { stdio: 'inherit' });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ PUSH RÉUSSI!\n');
  
} catch (error) {
  console.error('\n❌ ERREUR:', error.message);
  process.exit(1);
}
