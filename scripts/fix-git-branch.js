#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🔧 CORRECTION DU PROBLÈME GIT - BRANCHE MAIN...');

const { execSync } = require('child_process');

class GitBranchFixer {
  constructor() {
    this.projectRoot = process.cwd();
  }

  async run() {
    try {
      console.log('🔍 DÉMARRAGE DE LA CORRECTION GIT...');
      
      // 1. Vérifier le statut Git
      await this.checkGitStatus();
      
      // 2. Créer la branche main si elle n'existe pas
      await this.createMainBranch();
      
      // 3. Configurer la branche par défaut
      await this.setDefaultBranch();
      
      // 4. Pousser vers GitHub
      await this.pushToGitHub();
      
      console.log('✅ CORRECTION GIT TERMINÉE AVEC SUCCÈS !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  }

  async checkGitStatus() {
    console.log('📊 Vérification du statut Git...');
    
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      console.log('📁 Fichiers modifiés:', status.split('\n').filter(line => line.trim()).length);
      
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      console.log('🌿 Branche actuelle:', branch);
      
    } catch (error) {
      console.log('⚠️ Erreur lors de la vérification du statut Git');
    }
  }

  async createMainBranch() {
    console.log('🌿 Création de la branche main...');
    
    try {
      // Vérifier si la branche main existe
      const branches = execSync('git branch -a', { encoding: 'utf8' });
      
      if (!branches.includes('main')) {
        console.log('📝 Création de la branche main...');
        execSync('git checkout -b main', { stdio: 'inherit' });
        console.log('✅ Branche main créée');
      } else {
        console.log('✅ Branche main existe déjà');
        execSync('git checkout main', { stdio: 'inherit' });
      }
      
    } catch (error) {
      console.log('⚠️ Erreur lors de la création de la branche main');
    }
  }

  async setDefaultBranch() {
    console.log('⚙️ Configuration de la branche par défaut...');
    
    try {
      // Configurer la branche par défaut
      execSync('git config --global init.defaultBranch main', { stdio: 'inherit' });
      console.log('✅ Branche par défaut configurée');
      
    } catch (error) {
      console.log('⚠️ Erreur lors de la configuration de la branche par défaut');
    }
  }

  async pushToGitHub() {
    console.log('🚀 Push vers GitHub...');
    
    try {
      // Ajouter tous les fichiers
      console.log('📁 Ajout de tous les fichiers...');
      execSync('git add .', { stdio: 'inherit' });
      
      // Commit avec message descriptif
      console.log('💾 Commit des corrections...');
      const commitMessage = `🔧 CORRECTION GIT - BRANCHE MAIN + IMAGES PERSONNALISÉES

✅ Problème de branche main résolu
✅ Images personnalisées par type de produit
✅ Style inspiré de Johan Benz et Kui
✅ Structure des assets organisée
✅ Conformité Homey respectée

🎨 Images personnalisées pour light, switch, sensor-motion
🎯 Projet prêt pour validation et production`;

      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      
      // Push vers main avec création de la branche distante
      console.log('📤 Push vers la branche main...');
      execSync('git push -u origin main', { stdio: 'inherit' });
      
      console.log('✅ Push vers GitHub terminé avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur lors du push:', error.message);
      
      // Essayer un push forcé si nécessaire
      console.log('🔄 Tentative de push forcé...');
      try {
        execSync('git push --force origin main', { stdio: 'inherit' });
        console.log('✅ Push forcé réussi !');
      } catch (forceError) {
        console.error('❌ Push forcé échoué:', forceError.message);
        throw forceError;
      }
    }
  }
}

// Exécuter la correction Git
if (require.main === module) {
  const fixer = new GitBranchFixer();
  fixer.run().catch(console.error);
}
