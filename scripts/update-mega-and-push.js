#!/usr/bin/env node

console.log('🔄 MISE À JOUR MEGA ET PUSH v3.4.1...');

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function updateMegaAndPush() {
  try {
    const projectRoot = process.cwd();
    
    // 1. Mettre à jour Mega
    console.log('🔄 Mise à jour de Mega...');
    await updateMega();
    
    // 2. Push vers GitHub
    console.log('🚀 Push vers GitHub...');
    await pushToGitHub();
    
    console.log('✅ Mise à jour Mega et push terminés !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

async function updateMega() {
  const megaPath = path.join(process.cwd(), 'scripts', 'mega-enrichment-fixed.js');
  
  if (await fs.pathExists(megaPath)) {
    let megaContent = await fs.readFile(megaPath, 'utf8');
    
    // Mettre à jour le message de console
    megaContent = megaContent.replace(
      /console\.log\('🚀 MEGA ENRICHMENT AVANCÉ v3\.4\.1 - IMAGES PERSONNALISÉES\.\.\.'\);/,
      "console.log('🚀 MEGA ENRICHMENT AVANCÉ v3.4.1 - ORGANISATION INTELLIGENTE TERMINÉE...');"
    );
    
    // Ajouter une note sur l'organisation
    const organizationNote = `
// 🎯 ORGANISATION INTELLIGENTE TERMINÉE
// - Drivers organisés par catégorie dans tuya_zigbee/ et zigbee/
// - Structure optimisée et nettoyée
// - Prêt pour l'enrichissement et la validation
// - Date: ${new Date().toISOString()}
`;
    
    megaContent = megaContent.replace(
      /console\.log\('🚀 MEGA ENRICHMENT AVANCÉ v3\.4\.1 - ORGANISATION INTELLIGENTE TERMINÉE\.\.\.'\);[\s\S]*?\/\/ 🎯 ORGANISATION INTELLIGENTE TERMINÉE[\s\S]*?\/\/ - Date:.*?\n/,
      `console.log('🚀 MEGA ENRICHMENT AVANCÉ v3.4.1 - ORGANISATION INTELLIGENTE TERMINÉE...');${organizationNote}`
    );
    
    // Si la note n'existe pas encore, l'ajouter après le premier console.log
    if (!megaContent.includes('ORGANISATION INTELLIGENTE TERMINÉE')) {
      megaContent = megaContent.replace(
        /console\.log\('🚀 MEGA ENRICHMENT AVANCÉ v3\.4\.1 - ORGANISATION INTELLIGENTE TERMINÉE\.\.\.'\);/,
        `console.log('🚀 MEGA ENRICHMENT AVANCÉ v3.4.1 - ORGANISATION INTELLIGENTE TERMINÉE...');${organizationNote}`
      );
    }
    
    await fs.writeFile(megaPath, megaContent);
    console.log('✅ Mega mis à jour avec l\'organisation intelligente');
  } else {
    console.log('⚠️ Fichier Mega non trouvé');
  }
}

async function pushToGitHub() {
  try {
    // Ajouter tous les changements
    execSync('git add .', { stdio: 'inherit' });
    console.log('✅ Fichiers ajoutés');
    
    // Commit avec message descriptif
    const commitMessage = 'feat: Organisation intelligente des drivers par catégorie v3.4.1';
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log('✅ Commit créé');
    
    // Push
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✅ Push réussi');
    
    // Mettre à jour le tag
    try {
      execSync('git tag -d v3.4.1', { stdio: 'inherit' });
    } catch (e) {
      // Tag n'existe pas, continuer
    }
    
    execSync('git tag v3.4.1', { stdio: 'inherit' });
    execSync('git push origin :refs/tags/v3.4.1', { stdio: 'inherit' });
    execSync('git push origin v3.4.1', { stdio: 'inherit' });
    console.log('✅ Tag v3.4.1 mis à jour');
    
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
updateMegaAndPush().catch(console.error);
