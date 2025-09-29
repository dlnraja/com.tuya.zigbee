#!/usr/bin/env node
'use strict';

/**
 * 🚀 Module de Déploiement - Version 3.5.0
 * Déploiement automatique du projet et des matrices
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class Deployer {
  constructor() {
    this.config = {
      version: '3.5.0',
      outputDir: 'deployment',
      deployTargets: ['docs', 'matrices', 'reports']
    };
    
    this.stats = {
      filesDeployed: 0,
      errors: 0,
      warnings: 0
    };
  }

  async run() {
    console.log('🚀 Déploiement du projet...');
    
    try {
      await this.ensureOutputDirectory();
      await this.prepareDeployment();
      await this.deployToGitHub();
      await this.generateDeploymentReport();
      
      console.log('✅ Déploiement terminé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du déploiement:', error.message);
      throw error;
    }
  }

  async ensureOutputDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async prepareDeployment() {
    console.log('  📦 Préparation du déploiement...');
    
    // Vérification des fichiers à déployer
    for (const target of this.config.deployTargets) {
      if (fs.existsSync(target)) {
        console.log(`    ✅ ${target} prêt pour le déploiement`);
      } else {
        console.warn(`    ⚠️ ${target} non trouvé`);
        this.stats.warnings++;
      }
    }
  }

  async deployToGitHub() {
    console.log('  🌐 Déploiement vers GitHub...');
    
    try {
      // Vérification du statut Git
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (gitStatus.trim()) {
        console.log('    📝 Ajout des modifications...');
        execSync('git add .', { stdio: 'inherit' });
        
        console.log('    💾 Commit des modifications...');
        const commitMessage = `🚀 Déploiement automatique v${this.config.version} - ${new Date().toISOString()}`;
        execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
        
        console.log('    🚀 Push vers GitHub...');
        execSync('git push origin master', { stdio: 'inherit' });
        
        this.stats.filesDeployed++;
        console.log('    ✅ Déploiement GitHub réussi');
      } else {
        console.log('    ℹ️ Aucune modification à déployer');
      }
      
    } catch (error) {
      console.error(`    ❌ Erreur lors du déploiement GitHub: ${error.message}`);
      this.stats.errors++;
    }
  }

  async generateDeploymentReport() {
    console.log('  📊 Génération du rapport de déploiement...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      stats: this.stats,
      targets: this.config.deployTargets,
      summary: {
        success: this.stats.errors === 0,
        filesDeployed: this.stats.filesDeployed,
        errors: this.stats.errors,
        warnings: this.stats.warnings
      }
    };
    
    const reportPath = path.join(this.config.outputDir, 'deployment_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`    📄 Rapport de déploiement: ${reportPath}`);
  }
}

// Point d'entrée
if (require.main === module) {
  const deployer = new Deployer();
  deployer.run().catch(console.error);
}

module.exports = Deployer;
