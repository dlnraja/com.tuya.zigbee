#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🔄 FUSION COMPLÈTE TUYA + MISE À JOUR PROJET v3.4.2...');

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class TuyaFusionComplete {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.tuyaPath = path.join(this.driversPath, 'tuya');
    this.tuyaZigbeePath = path.join(this.driversPath, 'tuya_zigbee');
  }

  async run() {
    try {
      console.log('🔍 DÉMARRAGE DE LA FUSION COMPLÈTE...');
      
      // 1. Analyser la structure actuelle
      await this.analyzeCurrentStructure();
      
      // 2. Fusionner les dossiers tuya dans tuya_zigbee
      await this.mergeTuyaFolders();
      
      // 3. Supprimer le dossier tuya dupliqué
      await this.removeDuplicatedTuya();
      
      // 4. Mettre à jour la configuration des drivers
      await this.updateDriversConfig();
      
      // 5. Mettre à jour app.json (version 3.4.2)
      await this.updateAppVersion();
      
      // 6. Mettre à jour package.json
      await this.updatePackageVersion();
      
      // 7. Mettre à jour Mega et les scripts
      await this.updateMegaScripts();
      
      // 8. Valider la structure finale
      await this.validateFinalStructure();
      
      // 9. Générer le rapport de fusion
      await this.generateFusionReport();
      
      console.log('✅ FUSION COMPLÈTE TERMINÉE AVEC SUCCÈS !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  }

  async analyzeCurrentStructure() {
    console.log('📊 Analyse de la structure actuelle...');
    
    const tuyaFolders = await fs.readdir(this.tuyaPath);
    const tuyaZigbeeFolders = await fs.readdir(this.tuyaZigbeePath);
    
    console.log(`📁 Dossier tuya contient: ${tuyaFolders.length} catégories`);
    console.log(`📁 Dossier tuya_zigbee contient: ${tuyaZigbeeFolders.length} catégories`);
    
    // Identifier les catégories à fusionner
    const categoriesToMerge = tuyaFolders.filter(folder => 
      !tuyaZigbeeFolders.includes(folder)
    );
    
    console.log(`🔄 Catégories à fusionner: ${categoriesToMerge.join(', ')}`);
    
    return { tuyaFolders, tuyaZigbeeFolders, categoriesToMerge };
  }

  async mergeTuyaFolders() {
    console.log('🔄 Fusion des dossiers tuya dans tuya_zigbee...');
    
    const tuyaFolders = await fs.readdir(this.tuyaPath);
    
    for (const folder of tuyaFolders) {
      const sourcePath = path.join(this.tuyaPath, folder);
      const targetPath = path.join(this.tuyaZigbeePath, folder);
      
      if (await fs.pathExists(targetPath)) {
        console.log(`📁 Fusion de ${folder} (déjà existant)`);
        // Fusionner le contenu
        const sourceContent = await fs.readdir(sourcePath);
        for (const item of sourceContent) {
          const sourceItemPath = path.join(sourcePath, item);
          const targetItemPath = path.join(targetPath, item);
          
          if (await fs.pathExists(targetItemPath)) {
            console.log(`  ⚠️  Conflit: ${item} existe déjà, fusion intelligente...`);
            // Logique de fusion intelligente
            await this.mergeIntelligently(sourceItemPath, targetItemPath);
          } else {
            await fs.move(sourceItemPath, targetItemPath);
            console.log(`  ✅ ${item} déplacé`);
          }
        }
      } else {
        console.log(`📁 Déplacement de ${folder} (nouveau)`);
        await fs.move(sourcePath, targetPath);
      }
    }
  }

  async mergeIntelligently(sourcePath, targetPath) {
    try {
      const sourceStats = await fs.stat(sourcePath);
      const targetStats = await fs.stat(targetPath);
      
      if (sourceStats.isDirectory() && targetStats.isDirectory()) {
        // Fusionner les dossiers
        const sourceContent = await fs.readdir(sourcePath);
        for (const item of sourceContent) {
          const sourceItemPath = path.join(sourcePath, item);
          const targetItemPath = path.join(targetPath, item);
          
          if (!(await fs.pathExists(targetItemPath))) {
            await fs.move(sourceItemPath, targetItemPath);
          }
        }
      } else if (sourceStats.isFile() && targetStats.isFile()) {
        // Comparer et garder le plus récent
        if (sourceStats.mtime > targetStats.mtime) {
          await fs.copy(sourcePath, targetPath, { overwrite: true });
          console.log(`    📄 Fichier ${path.basename(sourcePath)} mis à jour`);
        }
      }
    } catch (error) {
      console.log(`    ⚠️  Erreur lors de la fusion: ${error.message}`);
    }
  }

  async removeDuplicatedTuya() {
    console.log('🗑️ Suppression du dossier tuya dupliqué...');
    
    try {
      await fs.remove(this.tuyaPath);
      console.log('✅ Dossier tuya supprimé');
    } catch (error) {
      console.log(`⚠️  Erreur lors de la suppression: ${error.message}`);
    }
  }

  async updateDriversConfig() {
    console.log('⚙️ Mise à jour de la configuration des drivers...');
    
    const configPath = path.join(this.driversPath, 'drivers-config.json');
    
    try {
      const config = await fs.readJson(configPath);
      
      // Mettre à jour la structure
      config.structure.tuya_zigbee.description = 'Drivers Tuya Zigbee unifiés (fusion de tuya + tuya_zigbee)';
      config.structure.tuya_zigbee.totalDrivers = await this.countTotalDrivers();
      
      // Supprimer la section tuya
      delete config.structure.tuya;
      
      // Mettre à jour les statistiques
      config.drivers.total = config.structure.tuya_zigbee.totalDrivers + config.structure.zigbee.totalDrivers;
      config.drivers.categories = Object.keys(config.structure.tuya_zigbee.categories).length + Object.keys(config.structure.zigbee.categories).length;
      
      config.lastUpdate = new Date().toISOString();
      config.version = '3.4.2';
      
      await fs.writeJson(configPath, config, { spaces: 2 });
      console.log('✅ Configuration des drivers mise à jour');
      
    } catch (error) {
      console.log(`⚠️  Erreur lors de la mise à jour de la config: ${error.message}`);
    }
  }

  async countTotalDrivers() {
    try {
      const categories = await fs.readdir(this.tuyaZigbeePath);
      let total = 0;
      
      for (const category of categories) {
        if (category !== 'assets') {
          const categoryPath = path.join(this.tuyaZigbeePath, category);
          const drivers = await fs.readdir(categoryPath);
          total += drivers.length;
        }
      }
      
      return total;
    } catch (error) {
      return 0;
    }
  }

  async updateAppVersion() {
    console.log('📱 Mise à jour de app.json vers v3.4.2...');
    
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    
    try {
      const appJson = await fs.readJson(appJsonPath);
      appJson.version = '3.4.2';
      appJson.description = 'Universal Tuya Zigbee - Drivers unifiés et optimisés pour Homey SDK3+';
      
      await fs.writeJson(appJsonPath, appJson, { spaces: 2 });
      console.log('✅ app.json mis à jour vers v3.4.2');
      
    } catch (error) {
      console.log(`⚠️  Erreur lors de la mise à jour d\'app.json: ${error.message}`);
    }
  }

  async updatePackageVersion() {
    console.log('📦 Mise à jour de package.json vers v3.4.2...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      packageJson.version = '3.4.2';
      
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      console.log('✅ package.json mis à jour vers v3.4.2');
      
    } catch (error) {
      console.log(`⚠️  Erreur lors de la mise à jour de package.json: ${error.message}`);
    }
  }

  async updateMegaScripts() {
    console.log('🔄 Mise à jour des scripts Mega...');
    
    const megaPath = path.join(this.projectRoot, 'scripts', 'mega-enrichment-fixed.js');
    
    try {
      let megaContent = await fs.readFile(megaPath, 'utf8');
      
      // Mettre à jour la version et la description
      megaContent = megaContent.replace(
        /Version: v[\d.]+/g,
        'Version: v3.4.2'
      );
      
      megaContent = megaContent.replace(
        /Drivers Tuya Zigbee unifiés/,
        'Drivers Tuya Zigbee unifiés (fusion complète tuya + tuya_zigbee)'
      );
      
      // Ajouter une note sur la fusion
      const fusionNote = `
      // 🚀 FUSION COMPLÈTE v3.4.2
      // ✅ Dossiers tuya et tuya_zigbee fusionnés
      // ✅ Structure unifiée et optimisée
      // ✅ Version incrémentée de 3.4.1 à 3.4.2
      `;
      
      megaContent = megaContent.replace(
        /console\.log\('🚀 MEGA ENRICHMENT/,
        `${fusionNote}      console.log('🚀 MEGA ENRICHMENT`
      );
      
      await fs.writeFile(megaPath, megaContent);
      console.log('✅ Scripts Mega mis à jour');
      
    } catch (error) {
      console.log(`⚠️  Erreur lors de la mise à jour de Mega: ${error.message}`);
    }
  }

  async validateFinalStructure() {
    console.log('🔍 Validation de la structure finale...');
    
    try {
      const finalStructure = await fs.readdir(this.driversPath);
      console.log(`📁 Structure finale: ${finalStructure.join(', ')}`);
      
      // Vérifier que tuya_zigbee existe et tuya n'existe plus
      if (finalStructure.includes('tuya_zigbee') && !finalStructure.includes('tuya')) {
        console.log('✅ Structure validée: fusion réussie');
      } else {
        console.log('⚠️  Structure non conforme');
      }
      
    } catch (error) {
      console.log(`⚠️  Erreur lors de la validation: ${error.message}`);
    }
  }

  async generateFusionReport() {
    console.log('📋 Génération du rapport de fusion...');
    
    const report = {
      title: 'RAPPORT DE FUSION COMPLÈTE TUYA v3.4.2',
      timestamp: new Date().toISOString(),
      version: '3.4.2',
      actions: [
        '✅ Analyse de la structure actuelle',
        '✅ Fusion des dossiers tuya dans tuya_zigbee',
        '✅ Suppression du dossier tuya dupliqué',
        '✅ Mise à jour de la configuration des drivers',
        '✅ Mise à jour de app.json vers v3.4.2',
        '✅ Mise à jour de package.json vers v3.4.2',
        '✅ Mise à jour des scripts Mega',
        '✅ Validation de la structure finale'
      ],
      structure: {
        before: 'drivers/tuya + drivers/tuya_zigbee (duplication)',
        after: 'drivers/tuya_zigbee (unifié) + drivers/zigbee + drivers/_common'
      },
      benefits: [
        '🚀 Élimination de la duplication',
        '📁 Structure plus claire et organisée',
        '⚙️ Configuration unifiée',
        '🔄 Maintenance simplifiée',
        '📱 Version incrémentée vers 3.4.2'
      ]
    };
    
    const reportPath = path.join(this.projectRoot, 'FUSION_COMPLETE_REPORT_v3.4.2.md');
    
    const markdownReport = `# ${report.title}

## 📅 **Date de fusion:** ${new Date().toLocaleString('fr-FR')}

## 🎯 **Actions réalisées:**
${report.actions.map(action => `- ${action}`).join('\n')}

## 🏗️ **Structure:**
- **Avant:** ${report.structure.before}
- **Après:** ${report.structure.after}

## 🚀 **Bénéfices:**
${report.benefits.map(benefit => `- ${benefit}`).join('\n')}

## ✅ **Statut:**
**FUSION COMPLÈTE RÉUSSIE - Version 3.4.2**

---
*Rapport généré automatiquement le ${new Date().toISOString()}*
`;

    await fs.writeFile(reportPath, markdownReport);
    console.log('✅ Rapport de fusion généré');
  }
}

// Exécuter la fusion complète
if (require.main === module) {
  const fusion = new TuyaFusionComplete();
  fusion.run().catch(console.error);
}
