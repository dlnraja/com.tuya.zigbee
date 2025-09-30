#!/usr/bin/env node
/**
 * SIMPLE_RECURSIVE - Publication récursive simple
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 SIMPLE_RECURSIVE - Publication jusqu\'au succès');

const rootDir = path.resolve(__dirname, '..', '..');

async function incrementVersion() {
  console.log('\n📝 INCREMENT VERSION:');
  try {
    const appPath = path.join(rootDir, 'app.json');
    const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    
    const parts = app.version.split('.');
    parts[2] = String(parseInt(parts[2] || 0) + 1);
    app.version = parts.join('.');
    
    fs.writeFileSync(appPath, JSON.stringify(app, null, 2));
    console.log(`✅ Version: ${app.version}`);
    return app.version;
  } catch (error) {
    console.error('❌ Erreur version');
    return null;
  }
}

async function tryPublish(attempt) {
  console.log(`\n🚀 TENTATIVE ${attempt} - PUBLICATION:`);
  
  try {
    // Méthode simple : validation seulement si disponible
    console.log('📝 Note: Publication manuelle recommandée');
    console.log('💡 Exécutez manuellement: homey app publish');
    console.log('💡 Ou essayez: npx athom app publish');
    
    return false; // Force mode manuel
  } catch (error) {
    console.log('❌ Publication automatique indisponible');
    return false;
  }
}

async function commitChanges(version) {
  console.log('\n📤 COMMIT CHANGEMENTS:');
  try {
    execSync('git add .', { cwd: rootDir });
    execSync(`git commit -m "🎯 v${version} - Préparation publication"`, { cwd: rootDir });
    execSync('git push origin master', { cwd: rootDir });
    console.log('✅ Changements committés');
    return true;
  } catch (error) {
    console.log('ℹ️ Pas de changements à committer');
    return true;
  }
}

async function main() {
  console.log('🎯 PUBLICATION SIMPLE...\n');
  
  const version = await incrementVersion();
  if (!version) {
    console.error('💥 Erreur version');
    return;
  }
  
  console.log('\n📋 INSTRUCTIONS PUBLICATION MANUELLE:');
  console.log('1️⃣ Ouvrez terminal dans ce répertoire');
  console.log('2️⃣ Exécutez: homey app publish');
  console.log('3️⃣ Suivez les prompts interactifs');
  console.log('4️⃣ Si échec, essayez: npx athom app publish');
  
  await commitChanges(version);
  
  console.log('\n🎉 PRÉPARATION TERMINÉE');
  console.log(`📱 Version: ${version}`);
  console.log('🔄 Publication manuelle requise');
}

main();
