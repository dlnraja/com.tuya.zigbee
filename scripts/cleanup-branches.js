#!/usr/bin/env node

/**
 * 🧹 CLEANUP BRANCHES
 * Suppression des branches inutiles
 * Mode YOLO Ultra - Exécution immédiate
 */

const { execSync } = require('child_process');
const fs = require('fs');

class BranchCleanup {
  constructor() {
    this.keepBranches = ['master', 'main', 'develop'];
    this.deletePatterns = [
      'feature/*',
      'bugfix/*',
      'hotfix/*',
      'temp/*',
      'test/*',
      'dev/*',
      'wip/*'
    ];
  }

  async run() {
    console.log('🧹 DÉMARRAGE CLEANUP BRANCHES');
    
    try {
      // 1. Vérifier l'état actuel
      await this.checkCurrentState();
      
      // 2. Supprimer les branches locales inutiles
      await this.cleanupLocalBranches();
      
      // 3. Supprimer les branches distantes inutiles
      await this.cleanupRemoteBranches();
      
      // 4. Nettoyer les références distantes
      await this.cleanupRemoteRefs();
      
      // 5. Rapport final
      await this.generateReport();
      
      console.log('✅ CLEANUP BRANCHES RÉUSSI !');
      
    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      throw error;
    }
  }

  async checkCurrentState() {
    console.log('📋 Vérification de l\'état actuel...');
    
    try {
      // Branche actuelle
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      console.log('📍 Branche actuelle:', currentBranch);
      
      // Branches locales
      const localBranches = execSync('git branch', { encoding: 'utf8' })
        .split('\n')
        .map(b => b.trim())
        .filter(b => b && !b.startsWith('*'));
      
      console.log('📋 Branches locales:', localBranches);
      
      // Branches distantes
      const remoteBranches = execSync('git branch -r', { encoding: 'utf8' })
        .split('\n')
        .map(b => b.trim())
        .filter(b => b);
      
      console.log('📋 Branches distantes:', remoteBranches);
      
    } catch (error) {
      console.error('❌ Erreur vérification:', error.message);
    }
  }

  async cleanupLocalBranches() {
    console.log('🧹 Nettoyage des branches locales...');
    
    try {
      // Obtenir toutes les branches locales
      const localBranches = execSync('git branch', { encoding: 'utf8' })
        .split('\n')
        .map(b => b.trim())
        .filter(b => b && !b.startsWith('*'));
      
      let deletedCount = 0;
      
      for (const branch of localBranches) {
        // Vérifier si la branche doit être supprimée
        if (this.shouldDeleteBranch(branch)) {
          try {
            console.log(`🗑️ Suppression de la branche locale: ${branch}`);
            execSync(`git branch -D ${branch}`, { stdio: 'inherit' });
            deletedCount++;
          } catch (error) {
            console.log(`⚠️ Impossible de supprimer ${branch}:`, error.message);
          }
        } else {
          console.log(`✅ Garder la branche: ${branch}`);
        }
      }
      
      console.log(`✅ Branches locales supprimées: ${deletedCount}`);
      
    } catch (error) {
      console.error('❌ Erreur nettoyage branches locales:', error.message);
    }
  }

  async cleanupRemoteBranches() {
    console.log('🧹 Nettoyage des branches distantes...');
    
    try {
      // Obtenir toutes les branches distantes
      const remoteBranches = execSync('git branch -r', { encoding: 'utf8' })
        .split('\n')
        .map(b => b.trim())
        .filter(b => b);
      
      let deletedCount = 0;
      
      for (const branch of remoteBranches) {
        // Extraire le nom de la branche (sans origin/)
        const branchName = branch.replace('origin/', '');
        
        // Vérifier si la branche doit être supprimée
        if (this.shouldDeleteBranch(branchName)) {
          try {
            console.log(`🗑️ Suppression de la branche distante: ${branchName}`);
            execSync(`git push origin --delete ${branchName}`, { stdio: 'inherit' });
            deletedCount++;
          } catch (error) {
            console.log(`⚠️ Impossible de supprimer ${branchName}:`, error.message);
          }
        } else {
          console.log(`✅ Garder la branche distante: ${branchName}`);
        }
      }
      
      console.log(`✅ Branches distantes supprimées: ${deletedCount}`);
      
    } catch (error) {
      console.error('❌ Erreur nettoyage branches distantes:', error.message);
    }
  }

  async cleanupRemoteRefs() {
    console.log('🧹 Nettoyage des références distantes...');
    
    try {
      // Supprimer les références distantes obsolètes
      execSync('git remote prune origin', { stdio: 'inherit' });
      console.log('✅ Références distantes nettoyées');
      
    } catch (error) {
      console.error('❌ Erreur nettoyage références:', error.message);
    }
  }

  shouldDeleteBranch(branchName) {
    // Ne jamais supprimer les branches principales
    if (this.keepBranches.includes(branchName)) {
      return false;
    }
    
    // Vérifier les patterns de suppression
    for (const pattern of this.deletePatterns) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(branchName)) {
        return true;
      }
    }
    
    // Supprimer les branches temporaires
    if (branchName.includes('temp') || 
        branchName.includes('test') || 
        branchName.includes('wip') ||
        branchName.includes('dev')) {
      return true;
    }
    
    return false;
  }

  async generateReport() {
    console.log('📊 Génération du rapport...');
    
    try {
      // État final
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const localBranches = execSync('git branch', { encoding: 'utf8' })
        .split('\n')
        .map(b => b.trim())
        .filter(b => b && !b.startsWith('*'));
      
      const remoteBranches = execSync('git branch -r', { encoding: 'utf8' })
        .split('\n')
        .map(b => b.trim())
        .filter(b => b);
      
      const report = {
        timestamp: new Date().toISOString(),
        currentBranch: currentBranch,
        localBranches: localBranches,
        remoteBranches: remoteBranches,
        keepBranches: this.keepBranches,
        deletePatterns: this.deletePatterns,
        summary: {
          localCount: localBranches.length,
          remoteCount: remoteBranches.length,
          totalCount: localBranches.length + remoteBranches.length
        }
      };
      
      const reportPath = 'reports/branch-cleanup-report.json';
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`📄 Rapport sauvegardé: ${reportPath}`);
      
      // Affichage du résumé
      console.log('\n📊 RÉSUMÉ CLEANUP BRANCHES:');
      console.log(`📍 Branche actuelle: ${currentBranch}`);
      console.log(`📋 Branches locales: ${localBranches.length}`);
      console.log(`📋 Branches distantes: ${remoteBranches.length}`);
      console.log('✅ Nettoyage terminé');
      
    } catch (error) {
      console.error('❌ Erreur génération rapport:', error.message);
    }
  }
}

// Exécution immédiate
if (require.main === module) {
  const cleanup = new BranchCleanup();
  cleanup.run().then(() => {
    console.log('🎉 CLEANUP BRANCHES TERMINÉ AVEC SUCCÈS !');
    process.exit(0);
  }).catch(error => {
    console.error('❌ ERREUR FATALE:', error);
    process.exit(1);
  });
}

module.exports = BranchCleanup; 