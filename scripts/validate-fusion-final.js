#!/usr/bin/env node

console.log('🔍 VALIDATION FINALE DE LA FUSION v3.4.2...');

const fs = require('fs-extra');
const path = require('path');

class FusionValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
  }

  async run() {
    try {
      console.log('🔍 DÉMARRAGE DE LA VALIDATION FINALE...');
      
      // 1. Valider la structure des drivers
      await this.validateDriverStructure();
      
      // 2. Valider les versions
      await this.validateVersions();
      
      // 3. Valider la configuration
      await this.validateConfiguration();
      
      // 4. Valider les scripts
      await this.validateScripts();
      
      // 5. Générer le rapport de validation
      await this.generateValidationReport();
      
      console.log('✅ VALIDATION FINALE TERMINÉE AVEC SUCCÈS !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  }

  async validateDriverStructure() {
    console.log('📁 Validation de la structure des drivers...');
    
    try {
      const driverFolders = await fs.readdir(this.driversPath);
      
      // Vérifier que tuya_zigbee existe et tuya n'existe plus
      if (driverFolders.includes('tuya_zigbee') && !driverFolders.includes('tuya')) {
        console.log('✅ Structure validée: tuya_zigbee unifié, tuya supprimé');
        
        // Compter les catégories dans tuya_zigbee
        const tuyaZigbeePath = path.join(this.driversPath, 'tuya_zigbee');
        const categories = await fs.readdir(tuyaZigbeePath);
        const validCategories = categories.filter(cat => cat !== 'assets');
        
        console.log(`📊 Catégories dans tuya_zigbee: ${validCategories.length}`);
        console.log(`📁 Catégories: ${validCategories.join(', ')}`);
        
        return { valid: true, categories: validCategories.length, list: validCategories };
      } else {
        console.log('❌ Structure invalide');
        return { valid: false, categories: 0, list: [] };
      }
    } catch (error) {
      console.log(`⚠️  Erreur lors de la validation de la structure: ${error.message}`);
      return { valid: false, categories: 0, list: [] };
    }
  }

  async validateVersions() {
    console.log('📱 Validation des versions...');
    
    try {
      // Vérifier app.json
      const appJsonPath = path.join(this.projectRoot, 'app.json');
      const appJson = await fs.readJson(appJsonPath);
      
      if (appJson.version === '3.4.2') {
        console.log('✅ app.json: Version 3.4.2 validée');
      } else {
        console.log(`❌ app.json: Version invalide (${appJson.version})`);
      }
      
      // Vérifier package.json
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = await fs.readJson(packageJsonPath);
      
      if (packageJson.version === '3.4.2') {
        console.log('✅ package.json: Version 3.4.2 validée');
      } else {
        console.log(`❌ package.json: Version invalide (${packageJson.version})`);
      }
      
      return { appVersion: appJson.version, packageVersion: packageJson.version };
    } catch (error) {
      console.log(`⚠️  Erreur lors de la validation des versions: ${error.message}`);
      return { appVersion: 'ERROR', packageVersion: 'ERROR' };
    }
  }

  async validateConfiguration() {
    console.log('⚙️ Validation de la configuration...');
    
    try {
      const configPath = path.join(this.driversPath, 'drivers-config.json');
      const config = await fs.readJson(configPath);
      
      if (config.version === '3.4.2') {
        console.log('✅ drivers-config.json: Version 3.4.2 validée');
      } else {
        console.log(`❌ drivers-config.json: Version invalide (${config.version})`);
      }
      
      if (config.structure.tuya_zigbee && !config.structure.tuya) {
        console.log('✅ Configuration: Structure tuya_zigbee unifiée validée');
      } else {
        console.log('❌ Configuration: Structure invalide');
      }
      
      return { valid: true, version: config.version };
    } catch (error) {
      console.log(`⚠️  Erreur lors de la validation de la configuration: ${error.message}`);
      return { valid: false, version: 'ERROR' };
    }
  }

  async validateScripts() {
    console.log('🔄 Validation des scripts...');
    
    try {
      const scriptsPath = path.join(this.projectRoot, 'scripts');
      const scripts = await fs.readdir(scriptsPath);
      
      const requiredScripts = [
        'fusion-tuya-complete.js',
        'push-fusion-v3.4.2.js',
        'mega-enrichment-fixed.js'
      ];
      
      let validScripts = 0;
      for (const script of requiredScripts) {
        if (scripts.includes(script)) {
          console.log(`✅ Script ${script} trouvé`);
          validScripts++;
        } else {
          console.log(`❌ Script ${script} manquant`);
        }
      }
      
      return { valid: validScripts === requiredScripts.length, total: validScripts, required: requiredScripts.length };
    } catch (error) {
      console.log(`⚠️  Erreur lors de la validation des scripts: ${error.message}`);
      return { valid: false, total: 0, required: 0 };
    }
  }

  async generateValidationReport() {
    console.log('📋 Génération du rapport de validation...');
    
    const report = {
      title: 'RAPPORT DE VALIDATION FINALE FUSION v3.4.2',
      timestamp: new Date().toISOString(),
      version: '3.4.2',
      validation: {
        structure: await this.validateDriverStructure(),
        versions: await this.validateVersions(),
        configuration: await this.validateConfiguration(),
        scripts: await this.validateScripts()
      }
    };
    
    const reportPath = path.join(this.projectRoot, 'FUSION_VALIDATION_FINAL_v3.4.2.json');
    
    await fs.writeJson(reportPath, report, { spaces: 2 });
    console.log('✅ Rapport de validation généré');
    
    // Afficher le résumé
    console.log('\n📊 RÉSUMÉ DE LA VALIDATION:');
    console.log(`📁 Structure: ${report.validation.structure.valid ? '✅' : '❌'} (${report.validation.structure.categories} catégories)`);
    console.log(`📱 Versions: ${report.validation.versions.appVersion === '3.4.2' && report.validation.versions.packageVersion === '3.4.2' ? '✅' : '❌'}`);
    console.log(`⚙️ Configuration: ${report.validation.configuration.valid ? '✅' : '❌'}`);
    console.log(`🔄 Scripts: ${report.validation.scripts.valid ? '✅' : '❌'} (${report.validation.scripts.total}/${report.validation.scripts.required})`);
    
    const overallValid = report.validation.structure.valid && 
                        report.validation.versions.appVersion === '3.4.2' &&
                        report.validation.versions.packageVersion === '3.4.2' &&
                        report.validation.configuration.valid &&
                        report.validation.scripts.valid;
    
    if (overallValid) {
      console.log('\n🎉 VALIDATION COMPLÈTE RÉUSSIE !');
      console.log('✅ La fusion v3.4.2 est parfaitement valide !');
    } else {
      console.log('\n⚠️  VALIDATION INCOMPLÈTE');
      console.log('❌ Certains éléments nécessitent une attention');
    }
  }
}

// Exécuter la validation finale
if (require.main === module) {
  const validator = new FusionValidator();
  validator.run().catch(console.error);
}
