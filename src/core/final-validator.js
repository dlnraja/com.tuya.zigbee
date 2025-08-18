/**
 * Module de validation finale - Validation complète du projet
 * Version: 3.7.0
 * Compatible: Homey SDK 3
 */

const fs = require('fs');
const path = require('path');

class FinalValidatorModule {
  constructor() {
    this.name = 'final-validator';
    this.version = '3.7.0';
    this.status = 'initialized';
    this.validationResults = {};
  }

  async initialize() {
    try {
      console.log('🔍 Initialisation du module de validation finale...');
      this.status = 'ready';
      console.log('✅ Module de validation finale initialisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error.message);
      this.status = 'error';
      throw error;
    }
  }

  async execute(data = {}) {
    try {
      console.log('🚀 Démarrage de la validation finale...');
      
      await this.initialize();
      
      // Validation de la structure finale
      const structureValidation = await this.validateFinalStructure();
      
      // Validation des fichiers générés
      const filesValidation = await this.validateGeneratedFiles();
      
      // Validation de la cohérence finale
      const coherenceValidation = await this.validateFinalCoherence();
      
      // Génération du rapport final
      const finalReport = await this.generateFinalReport();
      
      const result = {
        success: true,
        module: this.name,
        version: this.version,
        status: this.status,
        timestamp: new Date().toISOString(),
        validations: {
          structure: structureValidation,
          files: filesValidation,
          coherence: coherenceValidation
        },
        report: finalReport
      };
      
      console.log('✅ Validation finale terminée avec succès');
      return result;
    } catch (error) {
      console.error('💥 Échec de la validation finale:', error.message);
      throw error;
    }
  }

  async validateFinalStructure() {
    console.log('📁 Validation de la structure finale...');
    
    const requiredDirs = [
      'src/core',
      'src/utils',
      'src/drivers',
      'src/homey',
      'src/workflows',
      'dist/dashboard',
      'docs',
      'tests'
    ];
    
    const results = [];
    
    for (const dir of requiredDirs) {
      const exists = fs.existsSync(dir);
      const isDirectory = exists ? fs.statSync(dir).isDirectory() : false;
      const hasFiles = exists && isDirectory ? fs.readdirSync(dir).length > 0 : false;
      
      results.push({
        path: dir,
        exists,
        isDirectory,
        hasFiles,
        valid: exists && isDirectory && hasFiles
      });
    }
    
    const valid = results.every(r => r.valid);
    this.validationResults.structure = { valid, results };
    
    console.log(`✅ Structure finale validée: ${valid ? 'PASSED' : 'FAILED'}`);
    return { valid, results };
  }

  async validateGeneratedFiles() {
    console.log('📄 Validation des fichiers générés...');
    
    const requiredFiles = [
      'package.json',
      'src/homey/homey-compose.json',
      'dist/dashboard/index.html',
      'dist/drivers-matrix.json'
    ];
    
    const results = [];
    
    for (const file of requiredFiles) {
      try {
        const exists = fs.existsSync(file);
        let valid = false;
        let size = 0;
        
        if (exists) {
          size = fs.statSync(file).size;
          valid = size > 0;
        }
        
        results.push({
          file,
          exists,
          size,
          valid
        });
      } catch (error) {
        results.push({
          file,
          exists: false,
          size: 0,
          valid: false,
          error: error.message
        });
      }
    }
    
    const valid = results.every(r => r.valid);
    this.validationResults.files = { valid, results };
    
    console.log(`✅ Fichiers générés validés: ${valid ? 'PASSED' : 'FAILED'}`);
    return { valid, results };
  }

  async validateFinalCoherence() {
    console.log('🔗 Validation de la cohérence finale...');
    
    const results = [];
    
    try {
      // Vérification des versions
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const homeyCompose = JSON.parse(fs.readFileSync('src/homey/homey-compose.json', 'utf8'));
      
      const versionMatch = packageJson.version === homeyCompose.version;
      const idMatch = packageJson.name === homeyCompose.id;
      
      results.push({
        check: 'version_match',
        valid: versionMatch,
        details: {
          package: packageJson.version,
          homey: homeyCompose.version
        }
      });
      
      results.push({
        check: 'id_match',
        valid: idMatch,
        details: {
          package: packageJson.name,
          homey: homeyCompose.id
        }
      });
      
      // Vérification de la structure des modules
      const coreModules = fs.readdirSync('src/core').filter(f => f.endsWith('.js'));
      const hasCoreModules = coreModules.length >= 5;
      
      results.push({
        check: 'core_modules',
        valid: hasCoreModules,
        details: {
          count: coreModules.length,
          modules: coreModules
        }
      });
      
    } catch (error) {
      results.push({
        check: 'coherence_check',
        valid: false,
        error: error.message
      });
    }
    
    const valid = results.every(r => r.valid);
    this.validationResults.coherence = { valid, results };
    
    console.log(`✅ Cohérence finale validée: ${valid ? 'PASSED' : 'FAILED'}`);
    return { valid, results };
  }

  async generateFinalReport() {
    console.log('📋 Génération du rapport final...');
    
    const report = {
      version: this.version,
      timestamp: new Date().toISOString(),
      project: {
        name: 'Tuya Zigbee Drivers',
        version: this.version,
        status: 'reconstructed'
      },
      validation: {
        structure: this.validationResults.structure?.valid || false,
        files: this.validationResults.files?.valid || false,
        coherence: this.validationResults.coherence?.valid || false,
        overall: this.isOverallValid()
      },
      summary: this.generateValidationSummary(),
      recommendations: this.generateRecommendations()
    };
    
    // Sauvegarde du rapport
    const reportDir = 'dist';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(reportDir, 'final-validation-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('✅ Rapport final généré');
    return report;
  }

  isOverallValid() {
    return this.validationResults.structure?.valid &&
           this.validationResults.files?.valid &&
           this.validationResults.coherence?.valid;
  }

  generateValidationSummary() {
    const total = Object.keys(this.validationResults).length;
    const valid = Object.values(this.validationResults).filter(v => v?.valid).length;
    const failed = total - valid;
    
    return {
      total,
      valid,
      failed,
      successRate: Math.round((valid / total) * 100),
      status: failed === 0 ? 'PASSED' : 'FAILED'
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (!this.validationResults.structure?.valid) {
      recommendations.push('Vérifier et corriger la structure du projet');
    }
    
    if (!this.validationResults.files?.valid) {
      recommendations.push('Vérifier et corriger les fichiers générés');
    }
    
    if (!this.validationResults.coherence?.valid) {
      recommendations.push('Vérifier et corriger la cohérence du projet');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Projet prêt pour la validation Homey');
      recommendations.push('Projet prêt pour le déploiement');
    }
    
    return recommendations;
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      status: this.status,
      validationResults: this.validationResults
    };
  }
}

module.exports = FinalValidatorModule;
