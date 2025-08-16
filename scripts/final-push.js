#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🚀 PUSH FINAL AVEC STRUCTURE CORRIGÉE...');

const { execSync } = require('child_process');

async function finalPush() {
  try {
    console.log('📁 Ajout des fichiers...');
    execSync('git add .', { stdio: 'inherit' });
    
    console.log('💾 Commit des changements...');
    const commitMessage = 'feat: Structure des drivers corrigée et organisée par catégorie v3.4.1';
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    console.log('🚀 Push vers GitHub...');
    execSync('git push origin main', { stdio: 'inherit' });
    
    console.log('🏷️ Mise à jour du tag...');
    execSync('git tag -d v3.4.1', { stdio: 'inherit' });
    execSync('git tag v3.4.1', { stdio: 'inherit' });
    execSync('git push origin :refs/tags/v3.4.1', { stdio: 'inherit' });
    execSync('git push origin v3.4.1', { stdio: 'inherit' });
    
    console.log('✅ PUSH FINAL RÉUSSI !');
    console.log('🎯 Structure corrigée et poussée vers GitHub');
    
  } catch (error) {
    console.error('❌ Erreur lors du push:', error.message);
    
    // Fallback: push forcé si nécessaire
    try {
      console.log('🔄 Tentative de push forcé...');
      execSync('git push --force-with-lease origin main', { stdio: 'inherit' });
      console.log('✅ Push forcé réussi');
    } catch (forceError) {
      console.error('❌ Push forcé échoué:', forceError.message);
    }
  }
}

// Exécuter
finalPush().catch(console.error);
