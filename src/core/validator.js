/**
 * Module de validation - Vérification de la cohérence du projet
 * Version: 3.7.0
 * Compatible: Homey SDK 3
 */

const fs = require('fs');
const path = require('path');

class ValidatorModule {
  constructor() {
    this.name = 'validator';
    this.version = '3.7.0';
    this.status = 'initialized';
    this.validationResults = [];
  }

  /**
   * Initialise le module
   */
  async initialize() {
    try {
      console.log('🔍 Initialisation du module de validation...');
      this.status = 'ready';
      console.log('✅ Module de validation initialisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error.message);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Exécute la validation complète
   */
  async execute(data = {}) {
    try {
      console.log('🚀 Démarrage de la validation...');
      
      await this.initialize();
      
      // Validation de la structure
      const structureValidation = await this.validateStructure();
      
      // Validation des fichiers de configuration
      const configValidation = await this.validateConfiguration();
      
      // Validation des drivers
      const driversValidation = await this.validateDrivers();
      
      // Validation de la cohérence
      const coherenceValidation = await this.validateCoherence();
      
      const result = {
        success: true,
        module: this.name,
        version: this.version,
        status: this.status,
        timestamp: new Date().toISOString(),
        validations: {
          structure: structureValidation,
          configuration: configValidation,
          drivers: driversValidation,
          coherence: coherenceValidation
        },
        summary: this.generateValidationSummary()
      };
      
      console.log('✅ Validation terminée avec succès');
      return result;
    } catch (error) {
      console.error('💥 Échec de la validation:', error.message);
      throw error;
    }
  }

  /**
   * Valide la structure du projet
   */
  async validateStructure() {
    console.log('📁 Validation de la structure...');
    
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
      
      results.push({
        path: dir,
        exists,
        isDirectory,
        valid: exists && isDirectory
      });
      
      if (exists && isDirectory) {
        console.log(`✅ ${dir} - OK`);
      } else {
        console.log(`❌ ${dir} - Manquant ou invalide`);
      }
    }
    
    const valid = results.every(r => r.valid);
    this.validationResults.push({ type: 'structure', results, valid });
    
    return { valid, results };
  }

  /**
   * Valide les fichiers de configuration
   */
  async validateConfiguration() {
    console.log('⚙️ Validation de la configuration...');
    
    const requiredFiles = [
      'package.json',
      'src/homey/homey-compose.json'
    ];
    
    const results = [];
    
    for (const file of requiredFiles) {
      try {
        const exists = fs.existsSync(file);
        let content = null;
        let valid = false;
        
        if (exists) {
          content = JSON.parse(fs.readFileSync(file, 'utf8'));
          valid = this.validateConfigContent(file, content);
        }
        
        results.push({
          file,
          exists,
          valid,
          content: content ? 'parsed' : null
        });
        
        if (valid) {
          console.log(`✅ ${file} - OK`);
        } else {
          console.log(`❌ ${file} - Invalide`);
        }
      } catch (error) {
        results.push({
          file,
          exists: false,
          valid: false,
          error: error.message
        });
        console.log(`❌ ${file} - Erreur: ${error.message}`);
      }
    }
    
    const valid = results.every(r => r.valid);
    this.validationResults.push({ type: 'configuration', results, valid });
    
    return { valid, results };
  }

  /**
   * Valide le contenu d'un fichier de configuration
   */
  validateConfigContent(filename, content) {
    try {
      switch (filename) {
        case 'package.json':
          return this.validatePackageJson(content);
        case 'src/homey/homey-compose.json':
          return this.validateHomeyCompose(content);
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Valide package.json
   */
  validatePackageJson(content) {
    const required = ['name', 'version', 'main', 'scripts'];
    return required.every(field => content.hasOwnProperty(field));
  }

  /**
   * Valide homey-compose.json
   */
  validateHomeyCompose(content) {
    const required = ['id', 'version', 'category'];
    return required.every(field => content.hasOwnProperty(field));
  }

  /**
   * Valide les drivers
   */
  async validateDrivers() {
    console.log('🔌 Validation des drivers...');
    
    const driversDir = 'src/drivers';
    if (!fs.existsSync(driversDir)) {
      return { valid: false, results: [], error: 'Dossier drivers manquant' };
    }
    
    const results = [];
    const driverTypes = ['core', 'tuya', 'zigbee', 'generic'];
    
    for (const type of driverTypes) {
      const typeDir = path.join(driversDir, type);
      if (fs.existsSync(typeDir)) {
        const files = fs.readdirSync(typeDir);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        
        results.push({
          type,
          exists: true,
          files: jsFiles.length,
          valid: jsFiles.length > 0
        });
        
        if (jsFiles.length > 0) {
          console.log(`✅ ${type} - ${jsFiles.length} fichiers`);
        } else {
          console.log(`⚠️ ${type} - Aucun fichier JS`);
        }
      } else {
        results.push({
          type,
          exists: false,
          files: 0,
          valid: false
        });
        console.log(`❌ ${type} - Dossier manquant`);
      }
    }
    
    const valid = results.some(r => r.valid);
    this.validationResults.push({ type: 'drivers', results, valid });
    
    return { valid, results };
  }

  /**
   * Valide la cohérence globale
   */
  async validateCoherence() {
    console.log('🔗 Validation de la cohérence...');
    
    const results = [];
    
    // Vérification des versions
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const homeyCompose = JSON.parse(fs.readFileSync('src/homey/homey-compose.json', 'utf8'));
      
      const versionMatch = packageJson.version === homeyCompose.version;
      results.push({
        check: 'version_match',
        valid: versionMatch,
        details: {
          package: packageJson.version,
          homey: homeyCompose.version
        }
      });
      
      if (versionMatch) {
        console.log('✅ Versions cohérentes');
      } else {
        console.log('❌ Versions incohérentes');
      }
    } catch (error) {
      results.push({
        check: 'version_match',
        valid: false,
        error: error.message
      });
    }
    
    // Vérification des IDs
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const homeyCompose = JSON.parse(fs.readFileSync('src/homey/homey-compose.json', 'utf8'));
      
      const idMatch = packageJson.name === homeyCompose.id;
      results.push({
        check: 'id_match',
        valid: idMatch,
        details: {
          package: packageJson.name,
          homey: homeyCompose.id
        }
      });
      
      if (idMatch) {
        console.log('✅ IDs cohérents');
      } else {
        console.log('❌ IDs incohérents');
      }
    } catch (error) {
      results.push({
        check: 'id_match',
        valid: false,
        error: error.message
      });
    }
    
    const valid = results.every(r => r.valid);
    this.validationResults.push({ type: 'coherence', results, valid });
    
    return { valid, results };
  }

  /**
   * Génère un résumé de la validation
   */
  generateValidationSummary() {
    const total = this.validationResults.length;
    const valid = this.validationResults.filter(v => v.valid).length;
    const failed = total - valid;
    
    return {
      total,
      valid,
      failed,
      successRate: Math.round((valid / total) * 100),
      status: failed === 0 ? 'PASSED' : 'FAILED'
    };
  }

  /**
   * Obtient le statut du module
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      status: this.status,
      validationResults: this.validationResults
    };
  }
}

module.exports = ValidatorModule;
