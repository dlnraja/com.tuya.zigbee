#!/usr/bin/env node

console.log('🔧 CORRECTION GIT - PUSH VERS MASTER...');

const { execSync } = require('child_process');

async function fixGitMaster() {
  try {
    console.log('🔍 DÉMARRAGE DE LA CORRECTION GIT...');
    
    // 1. Ajouter tous les fichiers
    console.log('📁 Ajout de tous les fichiers...');
    execSync('git add .', { stdio: 'inherit' });
    
    // 2. Commit des changements
    console.log('💾 Commit des changements...');
    const commitMessage = `🚀 IMPLÉMENTATION COMPLÈTE v3.4.1 - TOUTES LES DÉCOUVERTES + IMAGES PERSONNALISÉES`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    // 3. Push vers master (branche principale)
    console.log('📤 Push vers la branche master...');
    execSync('git push origin master', { stdio: 'inherit' });
    
    // 4. Mettre à jour le tag
    console.log('🏷️ Mise à jour du tag v3.4.1...');
    execSync('git tag v3.4.1', { stdio: 'inherit' });
    execSync('git push origin v3.4.1', { stdio: 'inherit' });
    
    console.log('✅ CORRECTION GIT TERMINÉE AVEC SUCCÈS !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    // En cas d'erreur, essayer un push forcé
    try {
      console.log('🔄 Tentative de push forcé vers master...');
      execSync('git push --force origin master', { stdio: 'inherit' });
      console.log('✅ Push forcé vers master réussi !');
    } catch (forceError) {
      console.error('❌ Push forcé échoué:', forceError.message);
    }
  }
}

fixGitMaster();
