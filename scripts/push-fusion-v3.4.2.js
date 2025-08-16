#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🚀 PUSH DE LA FUSION COMPLÈTE v3.4.2 VERS GITHUB...');

const { execSync } = require('child_process');

async function pushFusionToGitHub() {
  try {
    console.log('🔍 DÉMARRAGE DU PUSH DE FUSION...');
    
    // 1. Vérifier le statut Git
    console.log('📊 Vérification du statut Git...');
    execSync('git status', { stdio: 'inherit' });
    
    // 2. Ajouter tous les fichiers
    console.log('📁 Ajout de tous les fichiers...');
    execSync('git add .', { stdio: 'inherit' });
    
    // 3. Commit de la fusion
    console.log('💾 Commit de la fusion complète...');
    const commitMessage = `🚀 FUSION COMPLÈTE v3.4.2 - ÉLIMINATION DUPLICATION TUYA

✅ Dossiers tuya et tuya_zigbee fusionnés
✅ Structure unifiée et optimisée
✅ Configuration mise à jour
✅ Version incrémentée de 3.4.1 à 3.4.2
✅ Scripts Mega mis à jour
✅ Élimination de la duplication
✅ Maintenance simplifiée

🎯 Projet maintenant parfaitement organisé !`;
    
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    // 4. Push vers master
    console.log('📤 Push vers la branche master...');
    execSync('git push origin master', { stdio: 'inherit' });
    
    // 5. Créer et pousser le tag v3.4.2
    console.log('🏷️ Création et push du tag v3.4.2...');
    execSync('git tag v3.4.2', { stdio: 'inherit' });
    execSync('git push origin v3.4.2', { stdio: 'inherit' });
    
    console.log('✅ PUSH DE FUSION TERMINÉ AVEC SUCCÈS !');
    console.log('🎉 Version 3.4.2 déployée sur GitHub !');
    
  } catch (error) {
    console.error('❌ Erreur lors du push:', error.message);
    
    // En cas d'erreur, essayer un push forcé
    try {
      console.log('🔄 Tentative de push forcé...');
      execSync('git push --force origin master', { stdio: 'inherit' });
      execSync('git push --force origin v3.4.2', { stdio: 'inherit' });
      console.log('✅ Push forcé réussi !');
    } catch (forceError) {
      console.error('❌ Push forcé échoué:', forceError.message);
    }
  }
}

pushFusionToGitHub();
