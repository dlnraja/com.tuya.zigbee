#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 FIX_GITHUB_PAGES - Correction problème GitHub Pages\n');

// Supprimer répertoires qui causent problème
const dirsToRemove = ['docs', 'public', '_site'];

dirsToRemove.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`🗑️ Suppression: ${dir}`);
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ ${dir} supprimé`);
    } catch (error) {
      console.log(`⚠️ ${dir} - ${error.message}`);
    }
  } else {
    console.log(`ℹ️ ${dir} n'existe pas`);
  }
});

console.log('\n📝 Ajout fichier .nojekyll...');
try {
  fs.writeFileSync('.nojekyll', '');
  console.log('✅ .nojekyll créé/vérifié');
} catch (error) {
  console.log('ℹ️ .nojekyll déjà présent');
}

console.log('\n📤 Commit changements...');
try {
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "🔧 Fix: Disable GitHub Pages, clean docs directories"', { stdio: 'inherit' });
  console.log('✅ Changements committés');
} catch (error) {
  console.log('ℹ️ Rien à committer ou déjà fait');
}

console.log('\n📤 Push vers GitHub...');
try {
  execSync('git push origin master', { stdio: 'inherit' });
  console.log('✅ Push réussi');
} catch (error) {
  console.log('❌ Erreur push:', error.message);
}

console.log('\n🎯 ÉTAPES SUIVANTES:');
console.log('1. Désactivez GitHub Pages manuellement:');
console.log('   https://github.com/dlnraja/com.tuya.zigbee/settings/pages');
console.log('2. Sélectionnez "None" dans Source');
console.log('3. Le workflow Homey fonctionnera correctement');
console.log('\n✅ Correction terminée!');
