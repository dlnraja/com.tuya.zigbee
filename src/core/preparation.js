/**
 * Module de préparation - Initialisation et configuration du projet
 * Version: 3.7.0
 * Compatible: Homey SDK 3
 */

const fs = require('fs');
const path = require('path');

class PreparationModule {
  constructor() {
    this.name = 'preparation';
    this.version = '3.7.0';
    this.status = 'initialized';
  }

  /**
   * Initialise le module
   */
  async initialize() {
    try {
      console.log('🔧 Initialisation du module de préparation...');
      
      // Vérification des prérequis
      await this.checkPrerequisites();
      
      // Nettoyage des fichiers temporaires
      await this.cleanupTempFiles();
      
      // Création des dossiers nécessaires
      await this.createRequiredDirectories();
      
      // Configuration de base
      await this.setupBasicConfiguration();
      
      this.status = 'ready';
      console.log('✅ Module de préparation initialisé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error.message);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Vérifie les prérequis du système
   */
  async checkPrerequisites() {
    console.log('📋 Vérification des prérequis...');
    
    // Vérification de Node.js
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ requis, version actuelle: ${nodeVersion}`);
    }
    
    console.log(`✅ Node.js ${nodeVersion} détecté`);
    
    // Vérification des permissions d'écriture
    const testFile = path.join(__dirname, 'test-write.tmp');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Permissions d\'écriture OK');
    } catch (error) {
      throw new Error('Permissions d\'écriture insuffisantes');
    }
  }

  /**
   * Nettoie les fichiers temporaires
   */
  async cleanupTempFiles() {
    console.log('🧹 Nettoyage des fichiers temporaires...');
    
    const tempPatterns = [
      '*.tmp',
      '*.log',
      '*.cache',
      'temp/*',
      'tmp/*'
    ];
    
    // Suppression des fichiers temporaires courants
    const currentDir = process.cwd();
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      if (file.endsWith('.tmp') || file.endsWith('.log') || file.endsWith('.cache')) {
        try {
          fs.unlinkSync(file);
          console.log(`🗑️ Supprimé: ${file}`);
        } catch (error) {
          // Ignore les erreurs de suppression
        }
      }
    }
    
    console.log('✅ Nettoyage terminé');
  }

  /**
   * Crée les dossiers nécessaires
   */
  async createRequiredDirectories() {
    console.log('📁 Création des dossiers nécessaires...');
    
    const requiredDirs = [
      'src/core',
      'src/utils',
      'src/drivers',
      'src/homey',
      'src/workflows',
      'dist/dashboard',
      'dist/releases',
      'docs',
      'tests',
      'logs'
    ];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Créé: ${dir}`);
      }
    }
    
    console.log('✅ Dossiers créés');
  }

  /**
   * Configure la configuration de base
   */
  async setupBasicConfiguration() {
    console.log('⚙️ Configuration de base...');
    
    // Configuration du projet
    const projectConfig = {
      name: 'com.tuya.zigbee',
      version: '3.7.0',
      description: 'Tuya Zigbee Drivers for Homey SDK 3',
      main: 'src/core/orchestrator.js',
      scripts: {
        'start': 'homey app run',
        'run': 'homey app run',
        'build': 'homey app build',
        'deploy': 'homey app deploy',
        'orchestrate:mega': 'node src/core/orchestrator.js',
        'test': 'homey app test',
        'validate': 'homey app validate'
      },
      dependencies: {
        'homey': '^3.0.0'
      },
      engines: {
        'node': '>=18.0.0',
        'homey': '>=3.0.0'
      }
    };
    
    // Écriture du package.json
    fs.writeFileSync('package.json', JSON.stringify(projectConfig, null, 2));
    console.log('✅ package.json créé');
    
    // Configuration Homey
    const homeyConfig = {
      id: 'com.tuya.zigbee',
      version: '3.7.0',
      category: 'light',
      permissions: ['homey:device:tuya', 'homey:device:zigbee']
    };
    
    fs.writeFileSync('src/homey/homey-compose.json', JSON.stringify(homeyConfig, null, 2));
    console.log('✅ Configuration Homey créée');
  }

  /**
   * Exécute la préparation complète
   */
  async execute(data = {}) {
    try {
      console.log('🚀 Démarrage de la préparation...');
      
      await this.initialize();
      
      const result = {
        success: true,
        module: this.name,
        version: this.version,
        status: this.status,
        timestamp: new Date().toISOString(),
        actions: [
          'Prérequis vérifiés',
          'Fichiers temporaires nettoyés',
          'Dossiers créés',
          'Configuration de base établie'
        ]
      };
      
      console.log('✅ Préparation terminée avec succès');
      return result;
    } catch (error) {
      console.error('💥 Échec de la préparation:', error.message);
      throw error;
    }
  }

  /**
   * Obtient le statut du module
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      status: this.status
    };
  }
}

module.exports = PreparationModule;
