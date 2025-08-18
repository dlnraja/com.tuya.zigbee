/**
 * Module de construction de matrices - Génération des matrices de drivers
 * Version: 3.7.0
 * Compatible: Homey SDK 3
 */

const fs = require('fs');
const path = require('path');

class MatrixBuilderModule {
  constructor() {
    this.name = 'matrix-builder';
    this.version = '3.7.0';
    this.status = 'initialized';
    this.matrices = {};
  }

  async initialize() {
    try {
      console.log('📊 Initialisation du module de construction de matrices...');
      this.status = 'ready';
      console.log('✅ Module de construction de matrices initialisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error.message);
      this.status = 'error';
      throw error;
    }
  }

  async execute(data = {}) {
    try {
      console.log('🚀 Démarrage de la construction de matrices...');
      
      await this.initialize();
      
      // Construction des matrices
      await this.buildDriverMatrix();
      await this.buildCapabilityMatrix();
      await this.buildManufacturerMatrix();
      
      // Sauvegarde des matrices
      await this.saveMatrices();
      
      const result = {
        success: true,
        module: this.name,
        version: this.version,
        status: this.status,
        timestamp: new Date().toISOString(),
        matrices: Object.keys(this.matrices),
        summary: this.generateMatrixSummary()
      };
      
      console.log('✅ Construction de matrices terminée avec succès');
      return result;
    } catch (error) {
      console.error('💥 Échec de la construction de matrices:', error.message);
      throw error;
    }
  }

  async buildDriverMatrix() {
    console.log('🔌 Construction de la matrice des drivers...');
    
    const driversDir = 'src/drivers';
    if (!fs.existsSync(driversDir)) {
      this.matrices.drivers = [];
      return;
    }
    
    const drivers = [];
    const driverTypes = ['core', 'tuya', 'zigbee', 'generic'];
    
    for (const type of driverTypes) {
      const typeDir = path.join(driversDir, type);
      if (fs.existsSync(typeDir)) {
        const files = fs.readdirSync(typeDir);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        
        for (const file of jsFiles) {
          drivers.push({
            name: path.basename(file, '.js'),
            type,
            path: path.join(type, file),
            status: 'active'
          });
        }
      }
    }
    
    this.matrices.drivers = drivers;
    console.log(`✅ Matrice des drivers construite: ${drivers.length} drivers`);
  }

  async buildCapabilityMatrix() {
    console.log('⚡ Construction de la matrice des capacités...');
    
    // Capacités de base pour Tuya Zigbee
    const capabilities = [
      'onoff',
      'dim',
      'light_temperature',
      'light_hue',
      'light_saturation',
      'light_mode',
      'measure_temperature',
      'measure_humidity',
      'measure_pressure',
      'alarm_motion',
      'alarm_contact',
      'alarm_water',
      'alarm_smoke',
      'alarm_co',
      'alarm_co2'
    ];
    
    this.matrices.capabilities = capabilities.map(cap => ({
      id: cap,
      name: cap.replace(/_/g, ' '),
      category: this.getCapabilityCategory(cap),
      supported: true
    }));
    
    console.log(`✅ Matrice des capacités construite: ${capabilities.length} capacités`);
  }

  getCapabilityCategory(capability) {
    if (capability.startsWith('light_')) return 'lighting';
    if (capability.startsWith('measure_')) return 'sensors';
    if (capability.startsWith('alarm_')) return 'security';
    if (capability === 'onoff' || capability === 'dim') return 'control';
    return 'other';
  }

  async buildManufacturerMatrix() {
    console.log('🏭 Construction de la matrice des fabricants...');
    
    // Fabricants Tuya courants
    const manufacturers = [
      'Tuya',
      'Smart Life',
      'Jinvoo',
      'EcoSmart',
      'Teckin',
      'Treatlife',
      'Gosund',
      'Blitzwolf',
      'Lumiman',
      'Novostella'
    ];
    
    this.matrices.manufacturers = manufacturers.map(man => ({
      name: man,
      type: 'tuya',
      supported: true,
      drivers: this.countDriversForManufacturer(man)
    }));
    
    console.log(`✅ Matrice des fabricants construite: ${manufacturers.length} fabricants`);
  }

  countDriversForManufacturer(manufacturer) {
    // Compte les drivers qui supportent ce fabricant
    return this.matrices.drivers ? 
      this.matrices.drivers.filter(d => d.type === 'tuya').length : 0;
  }

  async saveMatrices() {
    console.log('💾 Sauvegarde des matrices...');
    
    const matricesDir = 'dist';
    if (!fs.existsSync(matricesDir)) {
      fs.mkdirSync(matricesDir, { recursive: true });
    }
    
    // Sauvegarde de la matrice principale
    const mainMatrix = {
      version: this.version,
      timestamp: new Date().toISOString(),
      summary: this.generateMatrixSummary(),
      matrices: this.matrices
    };
    
    fs.writeFileSync(
      path.join(matricesDir, 'drivers-matrix.json'),
      JSON.stringify(mainMatrix, null, 2)
    );
    
    console.log('✅ Matrices sauvegardées');
  }

  generateMatrixSummary() {
    const drivers = this.matrices.drivers ? this.matrices.drivers.length : 0;
    const capabilities = this.matrices.capabilities ? this.matrices.capabilities.length : 0;
    const manufacturers = this.matrices.manufacturers ? this.matrices.manufacturers.length : 0;
    
    return {
      drivers,
      capabilities,
      manufacturers,
      total: drivers + capabilities + manufacturers
    };
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      status: this.status,
      matrices: this.matrices
    };
  }
}

module.exports = MatrixBuilderModule;
